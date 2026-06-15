package routes

import (
	"app-db/src/db"
	stripeConfigSdk "app-db/src/modules/stripeConfigSdk"
	"app-db/src/modules/stripeLedgerRecordsSdk"
	"app-db/src/modules/stripeSdk"
	"app-db/src/utils"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"

	"github.com/pocketbase/dbx"
	pbCore "github.com/pocketbase/pocketbase/core"

	stripe "github.com/stripe/stripe-go/v85"
	stripeWebhook "github.com/stripe/stripe-go/v85/webhook"
)

var ProductDataLookup = map[string]struct {
	PriceId         *string
	PaymentMode     *string
	isOneOffPayment bool
}{
	"instance_subscription": {
		PriceId:         stripe.String("price_1TMo82IGFJRyk0RhQn1z0oHK"),
		PaymentMode:     stripe.String(stripe.CheckoutSessionModeSubscription),
		isOneOffPayment: false,
	},
	"token": {
		PriceId:         stripe.String("price_1TJL40IGFJRyk0RhbikH1gy9"),
		PaymentMode:     stripe.String(stripe.CheckoutSessionModePayment),
		isOneOffPayment: true,
	},
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

	checkoutSession, err := stripeSdk.RetrieveStripeCheckoutSession(req.CheckoutSessionId)
	if err != nil {
		return e.BadRequestError("no checkout session id provided", nil)
	}

	return e.JSON(http.StatusOK, map[string]any{
		"checkoutSession": checkoutSession,
	})
}
func StripeRetrieveInvoiceRouteHandler(e *pbCore.RequestEvent) error {
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
		InvoiceId string `json:"invoiceId"`
	}{}
	err = json.Unmarshal(data, &req)
	if err != nil {
		return e.BadRequestError("invalid_json", err)
	}

	invoice, err := stripeSdk.RetrieveStripeInvoice(req.InvoiceId)
	if err != nil {
		return e.BadRequestError("no checkout session id provided", nil)
	}

	return e.JSON(http.StatusOK, map[string]any{"invoice": invoice})
}

func StripeRetrieveSubscriptionRouteHandler(e *pbCore.RequestEvent) error {
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
		SubscriptionId string `json:"subscriptionId"`
	}{}
	err = json.Unmarshal(data, &req)
	if err != nil {
		return e.BadRequestError("invalid_json", err)
	}

	subscription, err := stripeSdk.RetrieveStripeSubscription(req.SubscriptionId)
	if err != nil {
		return e.BadRequestError("no subscription found", nil)
	}

	return e.JSON(http.StatusOK, map[string]any{"subscription": subscription})
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

	stripeCustomer, err := stripeSdk.CreateStripeCustomer(userEmail)
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

		Customer: stripe.String(stripeCustomer.ID),

		SuccessURL: stripe.String("http://localhost:5173/stripe-checkout-session/success?checkoutSessionId={CHECKOUT_SESSION_ID}"),
		CancelURL:  stripe.String("http://localhost:5173/stripe-checkout-session/cancelled"),

		Metadata: map[string]string{
			"stripeCustomerId": stripeCustomer.ID,
			"userId":           userId,
			"productName":      ProductName,
			"productId":        *productData.PriceId,
			"quantity":         strconv.FormatInt(int64(req.Quantity), 10),
		},
	}

	if productData.isOneOffPayment {
		params.InvoiceCreation = &stripe.CheckoutSessionInvoiceCreationParams{
			Enabled: stripe.Bool(true),
		}
	}

	checkoutSession, err := stripeSdk.CreateStripeCheckoutSession(params)
	if err != nil {
		return e.InternalServerError("stripe session failed", err)
	}

	// ---- Return checkout URL ----
	return e.JSON(http.StatusOK, map[string]any{
		"url": checkoutSession.URL,
	})
}

func UpdateStripeSubscriptionRouteHandler(e *pbCore.RequestEvent) error {
	auth := e.Auth
	if auth == nil {
		return e.BadRequestError("not_logged_id", nil)
	}
	userId := auth.Id
	if userId == "" {
		return e.BadRequestError("not_logged_id", nil)
	}

	req, err := utils.ReadRequestBodyJsonIntoResult[struct {
		SubscriptionId string `json:"subscriptionId"`
		Quantity       int64  `json:"quantity"`
	}](e.Request.Body)
	if err != nil {
		return e.BadRequestError("error ReadingRequestBodyJsonIntoResult", err)
	}

	if req.SubscriptionId == "" {
		return e.BadRequestError("subscriptionId is required", nil)
	}
	if req.Quantity < 1 {
		return e.BadRequestError(fmt.Sprintf("%v is an invalid quantity", req.Quantity), nil)
	}

	// Fetch subscription to get the subscription item ID
	existingSub, err := stripeSdk.RetrieveStripeSubscription(req.SubscriptionId)
	if err != nil {
		return e.InternalServerError(fmt.Sprintf("failed to retrieve subscription: %v", req.SubscriptionId), err)
	}
	if len(existingSub.Items.Data) == 0 {
		return e.InternalServerError("subscription has no items", nil)
	}

	subItemId := existingSub.Items.Data[0].ID

	updatedSub, err := stripeSdk.UpdateStripeSubscriptionQuantity(req.SubscriptionId, &stripe.SubscriptionItemsParams{
		ID:       stripe.String(subItemId),
		Quantity: stripe.Int64(req.Quantity),
	})
	if err != nil {
		return e.InternalServerError("failed to update stripe subscription", err)
	}

	return e.JSON(http.StatusOK, map[string]any{
		"subscriptionId": updatedSub.ID,
		"quantity":       updatedSub.Items.Data[0].Quantity,
		"status":         updatedSub.Status,
	})
}

func getStripeLedgerRecordStructFromCheckoutSessionCompletedWebhookEvent(stripeEvent stripe.Event) (*stripeLedgerRecordsSdk.TStripeLedgerStruct, error) {
	var checkoutSession stripe.CheckoutSession
	err := json.Unmarshal(stripeEvent.Data.Raw, &checkoutSession)
	if err != nil {
		return nil, fmt.Errorf("Could not unmarshal JSON from checkout session: %w", err)
	}

	var subscriptionId string
	if checkoutSession.Subscription != nil {
		subscriptionId = checkoutSession.Subscription.ID
	}
	subscription, err := stripeSdk.RetrieveStripeSubscriptionWithRecurrenceData(subscriptionId)
	subscriptionRecurrenceData, err := stripeSdk.GetRecurrenceFromStripeSubscription(subscription)
	if err != nil {
		return nil, fmt.Errorf("recurrence data invalid: %w", err)
	}

	var invoiceId string
	if checkoutSession.Invoice != nil {
		invoiceId = checkoutSession.Invoice.ID
	}

	item := subscription.Items.Data[0]
	quantity := int(item.Quantity)
	costPerUnit := int(item.Price.UnitAmount)
	cost := quantity * costPerUnit

	recurrenceIntervalStartDateInt := item.CurrentPeriodStart
	recurrenceIntervalEndDateInt := item.CurrentPeriodEnd
	recurrenceIntervalStart, err := utils.ConvertStripeDateIntToPbDateTime(recurrenceIntervalStartDateInt)
	if err != nil {
		return nil, fmt.Errorf("recurrence data invalid: %w", err)
	}
	recurrenceIntervalEnd, err := utils.ConvertStripeDateIntToPbDateTime(recurrenceIntervalEndDateInt)
	if err != nil {
		return nil, fmt.Errorf("recurrence data invalid: %w", err)
	}

	stripeLedgerRecordStruct := stripeLedgerRecordsSdk.TStripeLedgerStruct{
		EventType:               string(stripeEvent.Type),
		Currency:                string(checkoutSession.Currency),
		Quantity:                quantity,
		CostPerUnit:             costPerUnit,
		Cost:                    cost,
		StripePayloadId:         checkoutSession.ID,
		SubscriptionId:          subscriptionId,
		InvoiceId:               invoiceId,
		UserId:                  checkoutSession.Metadata["userId"],
		ProductName:             checkoutSession.Metadata["productName"],
		ProductId:               checkoutSession.Metadata["productId"],
		StripeCustomerId:        checkoutSession.Metadata["stripeCustomerId"],
		RawData:                 checkoutSession,
		RecurrenceInterval:      string(subscriptionRecurrenceData.Interval),
		RecurrenceIntervalCount: int(subscriptionRecurrenceData.IntervalCount),
		RecurrenceIntervalStart: recurrenceIntervalStart,
		RecurrenceIntervalEnd:   recurrenceIntervalEnd,
	}

	return &stripeLedgerRecordStruct, nil
}

func getStripeLedgerRecordStructFromCustomerSubscriptionUpdatedWebhookEvent(app pbCore.App, stripeEvent stripe.Event) (*stripeLedgerRecordsSdk.TStripeLedgerStruct, error) {
	var subscriptionPayload stripe.Subscription
	err := json.Unmarshal(stripeEvent.Data.Raw, &subscriptionPayload)
	if err != nil {
		return nil, fmt.Errorf("Could not unmarshal JSON from stripe payment intent: %w", err)
	}

	subscriptionId := subscriptionPayload.ID
	subscription, err := stripeSdk.RetrieveStripeSubscriptionWithRecurrenceDataAndLatestInvoice(subscriptionId)
	subscriptionRecurrenceData, err := stripeSdk.GetRecurrenceFromStripeSubscription(subscription)
	if err != nil {
		return nil, fmt.Errorf("recurrence data invalid: %w", err)
	}

	item := subscription.Items.Data[0]
	quantity := int(item.Quantity)
	costPerUnit := int(item.Price.UnitAmount)
	cost := quantity * costPerUnit

	recurrenceIntervalStartDateInt := item.CurrentPeriodStart
	recurrenceIntervalEndDateInt := item.CurrentPeriodEnd
	recurrenceIntervalStart, err := utils.ConvertStripeDateIntToPbDateTime(recurrenceIntervalStartDateInt)
	if err != nil {
		return nil, fmt.Errorf("recurrence data invalid: %w", err)
	}
	recurrenceIntervalEnd, err := utils.ConvertStripeDateIntToPbDateTime(recurrenceIntervalEndDateInt)
	if err != nil {
		return nil, fmt.Errorf("recurrence data invalid: %w", err)
	}

	StripeLedgerCheckoutSessionCompletedRecord, err := app.FindFirstRecordByFilter(
		db.StripeLedgerCollectionName,
		"subscriptionId={:subId} && eventType='checkout.session.completed'",
		dbx.Params{"subId": subscription.ID},
	)
	if err != nil {
		return nil, fmt.Errorf("Could not find checkout.session.completed record for subscription: %w", err)
	}
	StripeLedgerCheckoutSessionCompletedRecordStruct := stripeLedgerRecordsSdk.ConvertStripeLedgerRecordToStruct(StripeLedgerCheckoutSessionCompletedRecord)

	stripeLedgerRecordStruct := stripeLedgerRecordsSdk.TStripeLedgerStruct{
		EventType:               string(stripeEvent.Type),
		Currency:                string(item.Price.Currency),
		Quantity:                quantity,
		CostPerUnit:             costPerUnit,
		Cost:                    cost,
		SubscriptionId:          subscription.ID,
		InvoiceId:               subscription.LatestInvoice.ID, // Product?
		StripePayloadId:         StripeLedgerCheckoutSessionCompletedRecordStruct.StripePayloadId,
		UserId:                  StripeLedgerCheckoutSessionCompletedRecordStruct.UserId,
		ProductName:             StripeLedgerCheckoutSessionCompletedRecordStruct.ProductName,
		ProductId:               StripeLedgerCheckoutSessionCompletedRecordStruct.ProductId,
		StripeCustomerId:        string(subscription.Customer.ID),
		RecurrenceInterval:      string(subscriptionRecurrenceData.Interval),
		RecurrenceIntervalCount: int(subscriptionRecurrenceData.IntervalCount),
		RecurrenceIntervalStart: recurrenceIntervalStart,
		RecurrenceIntervalEnd:   recurrenceIntervalEnd,
		RawData: map[string]any{
			"Subscription": subscription,
			"Record":       StripeLedgerCheckoutSessionCompletedRecord,
		},
	}

	return &stripeLedgerRecordStruct, nil
}
func getStripeLedgerRecordStructFromProductCreatedWebhookEvent(stripeEvent stripe.Event) (*stripeLedgerRecordsSdk.TStripeLedgerStruct, error) {
	var payload stripe.Product
	err := json.Unmarshal(stripeEvent.Data.Raw, &payload)
	if err != nil {
		return nil, fmt.Errorf("Could not unmarshal JSON from stripe product: %w", err)
	}

	recordStruct := stripeLedgerRecordsSdk.TStripeLedgerStruct{
		EventType:       string(stripeEvent.Type),
		StripePayloadId: payload.ID,
		ProductName:     payload.Name,
		ProductId:       payload.ID,
		RawData:         payload,
	}

	return &recordStruct, nil
}

func getStripeLedgerRecordStructFromPaymentIntentSucceededWebhookEvent(stripeEvent stripe.Event) (*stripeLedgerRecordsSdk.TStripeLedgerStruct, error) {

	var paymentIntent stripe.PaymentIntent
	err := json.Unmarshal(stripeEvent.Data.Raw, &paymentIntent)
	if err != nil {
		return nil, fmt.Errorf("Could not unmarshal JSON from stripe payment intent: %w", err)
	}

	quantity, err := strconv.Atoi(paymentIntent.Metadata["quantity"])
	if err != nil {
		quantity = 0
	}

	stripeLedgerRecordStruct := stripeLedgerRecordsSdk.TStripeLedgerStruct{
		Quantity:         quantity,
		EventType:        string(stripeEvent.Type),
		Currency:         string(paymentIntent.Currency),
		StripePayloadId:  paymentIntent.ID,
		UserId:           paymentIntent.Metadata["userId"],
		ProductName:      paymentIntent.Metadata["productName"],
		ProductId:        paymentIntent.Metadata["productId"],
		StripeCustomerId: paymentIntent.Metadata["stripeCustomerId"],
		RawData:          paymentIntent,
	}
	return &stripeLedgerRecordStruct, nil
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

	stripeConfig, err := stripeConfigSdk.GetStripeConfig(e.App)
	if err != nil {
		return e.BadRequestError("stripeconfigsdk.GetStripeConfig(e.App)", err)
	}
	logAllStripeEvents := stripeConfig.LogAllStripeEvents

	var stripeLedgerRecordStruct stripeLedgerRecordsSdk.TStripeLedgerStruct

	if event.Type == "payment_intent.succeeded" {
		stripeLedgerRecordStructPointer, err := getStripeLedgerRecordStructFromPaymentIntentSucceededWebhookEvent(event)
		if err != nil {
			return e.BadRequestError("Could not create stripe ledger record from payment intent webhook event", err)
		}
		stripeLedgerRecordStruct = *stripeLedgerRecordStructPointer
	}

	if event.Type == "checkout.session.completed" {
		stripeLedgerRecordStructPointer, err := getStripeLedgerRecordStructFromCheckoutSessionCompletedWebhookEvent(event)
		if err != nil {
			return e.BadRequestError("Could not create stripe ledger record from checkout session webhook event", err)
		}
		stripeLedgerRecordStruct = *stripeLedgerRecordStructPointer
	}

	if event.Type == "customer.subscription.updated" {
		stripeLedgerRecordStructPointer, err := getStripeLedgerRecordStructFromCustomerSubscriptionUpdatedWebhookEvent(e.App, event)
		if err != nil {
			return e.BadRequestError("Could not create stripe ledger record from customer subscription updated webhook event", err)
		}
		stripeLedgerRecordStruct = *stripeLedgerRecordStructPointer
	}

	if event.Type == "product.created" {
		stripeLedgerRecordStructPointer, err := getStripeLedgerRecordStructFromProductCreatedWebhookEvent(event)
		if err != nil {
			return e.BadRequestError("Could not create stripe ledger record from customer subscription updated webhook event", err)
		}
		stripeLedgerRecordStruct = *stripeLedgerRecordStructPointer
	}

	// if event.Type == "price.created" {
	// 	stripeLedgerRecordStructPointer, err := getStripeLedgerRecordStructFromPriceCreatedWebhookEvent(e.App, event)
	// 	if err != nil {
	// 		return e.BadRequestError("getStripeLedgerRecordStructFromPriceCreatedWebhookEvent(e.App, event)", err)
	// 	}
	// 	stripeLedgerRecordStruct = *stripeLedgerRecordStructPointer
	// }

	hasNotBeenPopulated := stripeLedgerRecordStruct.EventType == ""
	if hasNotBeenPopulated && !logAllStripeEvents {
		return e.JSON(http.StatusOK, map[string]any{})
	}

	if hasNotBeenPopulated {
		var payload map[string]any
		err = json.Unmarshal(event.Data.Raw, &payload)
		if err != nil {
			return e.BadRequestError("Could not unmarshal JSON from stripe payment intent:", err)
		}

		stripeLedgerRecordStruct = stripeLedgerRecordsSdk.TStripeLedgerStruct{
			EventType: string(event.Type),
			RawData:   payload,
		}
	}

	stripeLedgerCollection, err := e.App.FindCollectionByNameOrId(db.StripeLedgerCollectionName)
	if err != nil {
		return e.BadRequestError("Error finding StripeLedger collection:", err)
	}

	stripeLedgerRecord := pbCore.NewRecord(stripeLedgerCollection)
	stripeLedgerRecordsSdk.PopulateStripeLedgerRecord(stripeLedgerRecord, stripeLedgerRecordStruct)
	err = e.App.Save(stripeLedgerRecord)
	if err != nil {
		return e.BadRequestError("Unable to save stripeLedgerRecord", err)
	}

	return e.JSON(http.StatusOK, map[string]any{"url": "url"})
}
