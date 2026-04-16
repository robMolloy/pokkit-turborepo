package routes

import (
	"app-db/src/db"
	"app-db/src/utils"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"

	pbCore "github.com/pocketbase/pocketbase/core"

	stripe "github.com/stripe/stripe-go/v85"
	stripeSession "github.com/stripe/stripe-go/v85/checkout/session"
	stripeCustomer "github.com/stripe/stripe-go/v85/customer"
	stripeWebhook "github.com/stripe/stripe-go/v85/webhook"
)

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
		errorMessage := "no stripe secret key provided"
		log.Println(errorMessage)
		return e.BadRequestError(errorMessage, nil)
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
		errorMessage := "no checkout session id provided"
		log.Println(errorMessage)
		return e.BadRequestError(errorMessage, nil)
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
		errorMessage := "no stripe secret key provided"
		log.Println(errorMessage)
		return e.BadRequestError(errorMessage, nil)
	}

	cust, err := stripeCustomer.New(&stripe.CustomerParams{
		Email: stripe.String(userEmail),
	})
	if err != nil {
		fmt.Println(err)
		return e.InternalServerError("stripe_customer_failed", err)
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

	if req.Quantity < 1 {
		return e.BadRequestError("invalid_quantity", nil)
	}

	// token is the only valid product at this time
	if req.Product != "token" {
		return e.BadRequestError("invalid_product", nil)
	}

	PriceID := "price_1TJL40IGFJRyk0RhbikH1gy9"
	Quantity := req.Quantity

	// ---- Create Checkout Session ----
	params := &stripe.CheckoutSessionParams{
		Mode: stripe.String(stripe.CheckoutSessionModePayment),

		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				Price:    stripe.String(PriceID),
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
		return e.InternalServerError("stripe_session_failed", err)
	}

	// ---- Return checkout URL ----
	return e.JSON(http.StatusOK, map[string]any{
		"url": checkoutSession.URL,
	})
}

func StripeWebHookRouteHandler(e *pbCore.RequestEvent) error {
	stripeWebhookSecret := os.Getenv("STRIPE_WEBHOOK_SECRET")
	if stripeWebhookSecret == "" {
		errorMessage := "STRIPE_WEBHOOK_SECRET not provided in env"
		log.Println(errorMessage)
		return e.InternalServerError(errorMessage, nil)
	}

	// body, _ := utils.ReadJsonFromRequestBody(e.Request.Body)
	payload, err := io.ReadAll(e.Request.Body)
	if err != nil {
		errorMessage := "Could not read request body payload."
		log.Println(errorMessage, err)
		return e.InternalServerError(errorMessage, nil)
	}

	stripeSignatureHeader := e.Request.Header.Get("Stripe-Signature")
	if stripeSignatureHeader == "" {
		errorMessage := "Stripe-Signature header not provided"
		log.Println(errorMessage, err)
		return e.BadRequestError(errorMessage, nil)
	}

	event, err := stripeWebhook.ConstructEvent(payload, stripeSignatureHeader, stripeWebhookSecret)
	if err != nil {
		errorMessage := "Could not construct webhook event"
		log.Println(errorMessage, err)
		return e.BadRequestError(errorMessage, nil)
	}

	if event.Type != "checkout.session.completed" {
		logMessage := "not checkout.session.completed event type"
		log.Println(logMessage, err)
		return e.JSON(http.StatusOK, map[string]any{"url": "url"})
	}

	var paymentIntent stripe.PaymentIntent
	err = json.Unmarshal(event.Data.Raw, &paymentIntent)
	if err != nil {
		errorMessage := "Could not unmarshal JSON from stripe payment intent:"
		log.Println(errorMessage, err)
		return e.BadRequestError(errorMessage, nil)
	}
	paymentIntentId := paymentIntent.ID
	if paymentIntentId == "" {
		errorMessage := "Payment intent id blank"
		log.Println(errorMessage, err)
		return e.BadRequestError(errorMessage, nil)
	}

	userBalancesCollection, err := e.App.FindCollectionByNameOrId(db.UserBalancesCollectionName)
	userBalanceRecordByPaymentIntentId, err := e.App.FindFirstRecordByFilter(userBalancesCollection, fmt.Sprintf(`paymentIntentId="%s"`, paymentIntentId))

	if userBalanceRecordByPaymentIntentId != nil {
		errorMessage := "Payment intent id already used"
		log.Println(errorMessage, err)
		return e.BadRequestError(errorMessage, nil)
	}

	userId := paymentIntent.Metadata["userId"]
	if userId == "" {
		errorMessage := "No user id provided in metadata"
		log.Println(errorMessage, err)
		return e.BadRequestError(errorMessage, nil)
	}

	quantity, err := strconv.Atoi(paymentIntent.Metadata["quantity"])
	if quantity == 0 {
		errorMessage := "invalid quantity provided in metadata"
		log.Println(errorMessage, err)
		return e.BadRequestError(errorMessage, nil)
	}

	userBalanceLedgerCollection, err := e.App.FindCollectionByNameOrId(db.UserBalanceLedgerCollectionName)
	if err != nil {
		errorMessage := "Error finding UserBalanceLedger collection:"
		log.Println(errorMessage, err)
		return e.BadRequestError(errorMessage, nil)
	}
	userBalanceLedgerRecord := pbCore.NewRecord(userBalanceLedgerCollection)
	userBalanceLedgerRecord.Set("userId", userId)
	userBalanceLedgerRecord.Set("tokenAmount", quantity)
	userBalanceLedgerRecord.Set("reason", "stripe_payment")
	userBalanceLedgerRecord.Set("paymentIntentId", paymentIntentId)

	err = e.App.Save(userBalanceLedgerRecord)
	if err != nil {
		errorMessage := "Error saving userBalanceLedgerRecord record:"
		log.Println(errorMessage, err)
		return e.BadRequestError(errorMessage, nil)
	}

	return e.JSON(http.StatusOK, map[string]any{"url": "url"})
}
