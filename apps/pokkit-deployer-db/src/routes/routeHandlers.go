package routes

import (
	"app-db/src/db"
	"app-db/src/modules/stripeBalanceLedgerRecordsSdk"
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

	cust, err := stripeCustomer.New(&stripe.CustomerParams{
		Email: stripe.String(userEmail),
	})
	if err != nil {
		return e.InternalServerError(fmt.Sprintf("failed to create stripe customer from: %v", userEmail), err)
	}

	req, err := utils.ReadRequestBodyJsonIntoResult[struct {
		ProductName string `json:"productName"`
		Quantity    int64  `json:"quantity"`
	}](e.Request.Body)

	if err != nil {
		return e.BadRequestError("error ReadingRequestBodyJsonIntoResult", err)
	}

	Quantity := req.Quantity
	if Quantity < 1 {
		return e.BadRequestError(fmt.Sprintf("%v is an invalid quantity", req.Quantity), err)
	}

	ProductName := req.ProductName // token or instance subscription only
	productData, ok := ProductDataLookup[ProductName]
	if !ok {
		return e.BadRequestError(fmt.Sprintf("%v is an invalid_product", ProductName), err)
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
			"productName":      ProductName,
			"productId":        *productData.PriceId,
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

func StripeWebHookRouteHandler(e *pbCore.RequestEvent) error {
	stripeWebhookSecret := os.Getenv("STRIPE_WEBHOOK_SECRET")
	if stripeWebhookSecret == "" {
		return e.InternalServerError("STRIPE_WEBHOOK_SECRET not provided in env", nil)
	}
	stripeSignatureHeader := e.Request.Header.Get("Stripe-Signature")
	if stripeSignatureHeader == "" {
		return e.BadRequestError("Stripe-Signature header not provided", nil)
	}
	payload, err := io.ReadAll(e.Request.Body)
	if err != nil {
		return e.InternalServerError("Could not read request body payload.", err)
	}
	event, err := stripeWebhook.ConstructEvent(payload, stripeSignatureHeader, stripeWebhookSecret)
	if err != nil {
		return e.BadRequestError("Could not construct webhook event", err)
	}

	var stripeBalanceLedgeRecordStruct stripeBalanceLedgerRecordsSdk.TStripeBalanceLedgerStruct

	if event.Type == "payment_intent.succeeded" {
		var paymentIntent stripe.PaymentIntent
		err = json.Unmarshal(event.Data.Raw, &paymentIntent)
		if err != nil {
			return e.BadRequestError("Could not unmarshal JSON from stripe payment intent:", err)
		}

		quantity, err := strconv.Atoi(paymentIntent.Metadata["quantity"])
		if err != nil {
			quantity = 0
		}

		stripeBalanceLedgeRecordStruct = stripeBalanceLedgerRecordsSdk.TStripeBalanceLedgerStruct{
			Quantity:        quantity,
			EventType:       string(event.Type),
			Currency:        string(paymentIntent.Currency),
			PaymentIntentId: paymentIntent.ID,
			SubscriptionId:  "",
			// SubscriptionExpiresAtDateTime:   "",
			UserId:           paymentIntent.Metadata["userId"],
			ProductName:      paymentIntent.Metadata["productName"],
			ProductId:        paymentIntent.Metadata["productId"],
			StripeCustomerId: paymentIntent.Metadata["stripeCustomerId"],
			RawData:          paymentIntent,
		}
	}

	if event.Type == "checkout.session.completed" {
		var checkoutSession stripe.CheckoutSession
		err = json.Unmarshal(event.Data.Raw, &checkoutSession)
		if err != nil {
			return e.BadRequestError("Could not unmarshal JSON from checkout session:", err)
		}

		quantity, err := strconv.Atoi(checkoutSession.Metadata["quantity"])
		if err != nil {
			quantity = 0
		}

		var subscriptionId string
		if checkoutSession.Subscription != nil {
			subscriptionId = checkoutSession.Subscription.ID
		}

		stripeBalanceLedgeRecordStruct = stripeBalanceLedgerRecordsSdk.TStripeBalanceLedgerStruct{
			Quantity:         quantity,
			EventType:        string(event.Type),
			Currency:         string(checkoutSession.Currency),
			PaymentIntentId:  checkoutSession.ID,
			SubscriptionId:   subscriptionId,
			UserId:           checkoutSession.Metadata["userId"],
			ProductName:      checkoutSession.Metadata["productName"],
			ProductId:        checkoutSession.Metadata["productId"],
			StripeCustomerId: checkoutSession.Metadata["stripeCustomerId"],
			RawData:          checkoutSession,
		}
	}

	if stripeBalanceLedgeRecordStruct.EventType == "" { // proxy for irrelevant eventTypes
		return e.JSON(http.StatusOK, map[string]any{"url": "url"})
	}

	stripeBalanceLedgerCollection, err := e.App.FindCollectionByNameOrId(db.StripeBalanceLedgerCollectionName)
	if err != nil {
		return e.BadRequestError("Error finding StripeBalanceLedger collection:", err)
	}

	stripeBalanceLedgerRecord := pbCore.NewRecord(stripeBalanceLedgerCollection)
	stripeBalanceLedgerRecordsSdk.PopulateStripeBalanceLedgerRecord(stripeBalanceLedgerRecord, stripeBalanceLedgeRecordStruct)
	err = e.App.Save(stripeBalanceLedgerRecord)
	if err != nil {
		return e.BadRequestError("Unable to save stripeBalanceLedgerRecord", err)
	}

	return e.JSON(http.StatusOK, map[string]any{"url": "url"})
}
