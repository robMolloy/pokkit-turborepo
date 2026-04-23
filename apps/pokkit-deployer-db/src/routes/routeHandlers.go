package routes

import (
	"app-db/src/db"
	"app-db/src/utils"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"

	pbCore "github.com/pocketbase/pocketbase/core"

	stripe "github.com/stripe/stripe-go/v85"
	stripeSession "github.com/stripe/stripe-go/v85/checkout/session"
	stripeCustomer "github.com/stripe/stripe-go/v85/customer"
	stripeWebhook "github.com/stripe/stripe-go/v85/webhook"
)

var ProductDataLookup = map[string]struct {
	PriceId     *string
	PaymentMode *string
}{
	"instance_subscription": {
		PriceId:     stripe.String("price_1TMo82IGFJRyk0RhQn1z0oHK"),
		PaymentMode: stripe.String(stripe.CheckoutSessionModeSubscription),
	},
	"token": {
		PriceId:     stripe.String("price_1TJL40IGFJRyk0RhbikH1gy9"),
		PaymentMode: stripe.String(stripe.CheckoutSessionModePayment),
	},
}

func HelloNameRouteHandler(e *pbCore.RequestEvent) error {
	name := e.Request.PathValue("name")
	fmt.Println(name)
	return e.JSON(http.StatusOK, map[string]any{"txt": "hello" + name})
}
func ByeNameRouteHandler(e *pbCore.RequestEvent) error {
	body, _ := utils.ReadJsonFromRequestBody(e.Request.Body)
	nameString, _ := body["name"].(string)
	return e.JSON(http.StatusOK, map[string]any{"txt": "bye" + nameString})
}

type StripeCreateCheckoutRequest struct {
	Product  string `json:"product"`
	Quantity int64  `json:"quantity"`
}

func StripeRetrieveCheckoutSessionRouteHandler(e *pbCore.RequestEvent) error {
	auth := e.Auth
	if auth == nil {
		return e.BadRequestError("not_logged_id", nil)
	}
	userId := auth.Id
	if userId == "" {
		return e.BadRequestError("not_logged_id", nil)
	}
	userEmail := auth.Email()
	if userEmail == "" {
		return e.BadRequestError("no_email_provided", nil)
	}
	stripeSecretKey := os.Getenv("STRIPE_SECRET_KEY")
	stripe.Key = stripeSecretKey
	if stripeSecretKey == "" {
		return e.BadRequestError("no stripe secret key provided", nil)
	}

	body := e.Request.Body
	defer body.Close()
	data, err := io.ReadAll(body)
	if err != nil {
		return e.BadRequestError("invalid_request_body", err)
	}

	req := struct {
		CheckoutSessionId string `json:"checkoutSessionId"`
	}{}
	err = json.Unmarshal(data, &req)
	if err != nil {
		return e.BadRequestError("invalid_json", err)
	}

	checkoutSession, err := stripeSession.Get(req.CheckoutSessionId, nil)
	if err != nil {
		return e.BadRequestError("no checkout session id provided", nil)
	}

	return e.JSON(http.StatusOK, map[string]any{
		"checkoutSession": checkoutSession,
	})
}

func StripeCreateCheckoutSessionRouteHandler(e *pbCore.RequestEvent) error {
	auth := e.Auth
	if auth == nil {
		return e.BadRequestError("not_logged_id", nil)
	}
	userId := auth.Id
	if userId == "" {
		return e.BadRequestError("not_logged_id", nil)
	}
	userEmail := auth.Email()
	if userEmail == "" {
		return e.BadRequestError("no_email_provided", nil)
	}
	stripeSecretKey := os.Getenv("STRIPE_SECRET_KEY")
	stripe.Key = stripeSecretKey
	if stripeSecretKey == "" {
		return e.BadRequestError("no stripe secret key provided", nil)
	}

	cust, err := stripeCustomer.New(&stripe.CustomerParams{
		Email: stripe.String(userEmail),
	})
	if err != nil {
		return e.InternalServerError(fmt.Sprintf("failed to create stripe customer from: %v", userEmail), err)
	}

	body := e.Request.Body
	defer body.Close()
	data, err := io.ReadAll(body)
	if err != nil {
		return e.BadRequestError("invalid_request_body", err)
	}

	req := struct {
		Product  string `json:"product"`
		Quantity int64  `json:"quantity"`
	}{}
	err = json.Unmarshal(data, &req)
	if err != nil {
		return e.BadRequestError("invalid_json", err)
	}

	Quantity := req.Quantity
	if Quantity < 1 {
		return e.BadRequestError(fmt.Sprintf("%v is an invalid quantity", req.Quantity), err)
	}

	// token is the only valid product at this time
	productData, ok := ProductDataLookup[req.Product]
	if !ok {
		return e.BadRequestError(fmt.Sprintf("%v is an invalid_product", req.Product), err)
	}

	// ---- Create Checkout Session ----
	params := &stripe.CheckoutSessionParams{
		Mode: productData.PaymentMode,

		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				Price:    productData.PriceId,
				Quantity: stripe.Int64(Quantity),
			},
		},

		Customer: stripe.String(cust.ID),

		SuccessURL: stripe.String("http://localhost:5173/stripe-checkout-session/success?checkoutSessionId={CHECKOUT_SESSION_ID}"),
		CancelURL:  stripe.String("http://localhost:5173/stripe-checkout-session/cancelled"),

		Metadata: map[string]string{
			"stripeCustomerId": cust.ID,
			"userId":           userId,
			"product":          req.Product,
			"quantity":         strconv.FormatInt(int64(req.Quantity), 10),
		},
	}

	checkoutSession, err := stripeSession.New(params)
	if err != nil {
		return e.InternalServerError("stripe session failed", err)
	}

	// ---- Return checkout URL ----
	return e.JSON(http.StatusOK, map[string]any{
		"url": checkoutSession.URL,
	})
}

func createBalanceLedgerRecordFromStripePayload(e *pbCore.RequestEvent, payload struct {
	UserId          string
	Quantity        int
	PaymentIntentId string
}) error {
	userBalanceLedgerCollection, err := e.App.FindCollectionByNameOrId(db.UserBalanceLedgerCollectionName)
	if err != nil {
		return e.BadRequestError("Error finding UserBalanceLedger collection:", nil)
	}
	userBalanceLedgerRecord := pbCore.NewRecord(userBalanceLedgerCollection)
	userBalanceLedgerRecord.Set("userId", payload.UserId)
	userBalanceLedgerRecord.Set("tokenAmount", payload.Quantity)
	userBalanceLedgerRecord.Set("reason", "stripe_payment")
	userBalanceLedgerRecord.Set("paymentIntentId", payload.PaymentIntentId)

	err = e.App.Save(userBalanceLedgerRecord)
	if err != nil {
		return e.BadRequestError("Error saving userBalanceLedgerRecord record:", nil)
	}
	return nil
}

func StripeWebHookRouteHandler(e *pbCore.RequestEvent) error {
	stripeWebhookSecret := os.Getenv("STRIPE_WEBHOOK_SECRET")
	if stripeWebhookSecret == "" {
		return e.InternalServerError("STRIPE_WEBHOOK_SECRET not provided in env", nil)
	}

	payload, err := io.ReadAll(e.Request.Body)
	if err != nil {
		return e.InternalServerError("Could not read request body payload.", nil)
	}

	stripeSignatureHeader := e.Request.Header.Get("Stripe-Signature")
	if stripeSignatureHeader == "" {
		return e.BadRequestError("Stripe-Signature header not provided", nil)
	}

	event, err := stripeWebhook.ConstructEvent(payload, stripeSignatureHeader, stripeWebhookSecret)
	if err != nil {
		return e.BadRequestError("Could not construct webhook event", nil)
	}

	if event.Type != "checkout.session.completed" {
		return e.JSON(http.StatusOK, map[string]any{"url": "url"})
	}

	var paymentIntent stripe.PaymentIntent
	err = json.Unmarshal(event.Data.Raw, &paymentIntent)
	if err != nil {
		return e.BadRequestError("Could not unmarshal JSON from stripe payment intent:", nil)
	}
	e.App.Logger().Error("y", "y", paymentIntent)
	e.App.Logger().Error("y2", "y2", payload)
	paymentIntentId := paymentIntent.ID
	if paymentIntentId == "" {
		return e.BadRequestError("Payment intent id blank", nil)
	}

	userBalancesCollection, err := e.App.FindCollectionByNameOrId(db.UserBalancesCollectionName)
	userBalanceRecordByPaymentIntentId, err := e.App.FindFirstRecordByFilter(userBalancesCollection, fmt.Sprintf(`paymentIntentId="%s"`, paymentIntentId))

	if userBalanceRecordByPaymentIntentId != nil {
		return e.BadRequestError("Payment intent id already used", nil)
	}

	userId := paymentIntent.Metadata["userId"]
	if userId == "" {
		return e.BadRequestError("No user id provided in metadata", nil)
	}

	quantity, err := strconv.Atoi(paymentIntent.Metadata["quantity"])
	if quantity == 0 {
		return e.BadRequestError("invalid quantity provided in metadata", nil)
	}

	fmt.Println("asd")
	fmt.Println("asd")
	fmt.Println("asd")
	fmt.Println("asd")
	fmt.Println("asd")
	fmt.Println("asd")
	fmt.Println("asd")
	fmt.Println("asd")
	fmt.Println("asd")
	fmt.Println("asd")

	e.App.Logger().Error("huh", "data", struct {
		UserId          string
		Quantity        int
		PaymentIntentId string
		Product         string
	}{
		UserId:          userId,
		Quantity:        quantity,
		PaymentIntentId: paymentIntentId,
	})

	if true {
		createBalanceLedgerRecordFromStripePayload(e, struct {
			UserId          string
			Quantity        int
			PaymentIntentId string
		}{
			UserId:          userId,
			Quantity:        quantity,
			PaymentIntentId: paymentIntentId,
		})
	}

	return e.JSON(http.StatusOK, map[string]any{"url": "url"})
}
