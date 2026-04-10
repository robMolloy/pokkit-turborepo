package routes

import (
	"app-db/src/utils"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	pbCore "github.com/pocketbase/pocketbase/core"
	"github.com/stripe/stripe-go/v85"
	"github.com/stripe/stripe-go/v85/checkout/session"
	"github.com/stripe/stripe-go/v85/customer"
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
	stripe.Key = os.Getenv("STRIPE_SECRET_KEY")

	cust, err := customer.New(&stripe.CustomerParams{
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

	// ---- Create Checkout Session ----
	params := &stripe.CheckoutSessionParams{
		Mode: stripe.String(stripe.CheckoutSessionModePayment),

		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				Price:    stripe.String(PriceID),
				Quantity: stripe.Int64(req.Quantity),
			},
		},

		Customer: stripe.String(cust.ID),

		SuccessURL: stripe.String("http://localhost:5173/successful-stripe-checkout-session"),
		CancelURL:  stripe.String("http://localhost:5173/cancelled-stripe-checkout-session"),

		Metadata: map[string]string{
			"userId":  userId,
			"product": req.Product,
		},
	}

	checkoutSession, err := session.New(params)
	if err != nil {
		return e.InternalServerError("stripe_session_failed", err)
	}

	// ---- Return checkout URL ----
	return e.JSON(http.StatusOK, map[string]any{
		"url": checkoutSession.URL,
	})
}
