package stripeSdk

import (
	"fmt"

	stripe "github.com/stripe/stripe-go/v85"
	stripeCheckoutSession "github.com/stripe/stripe-go/v85/checkout/session"
	stripeCustomer "github.com/stripe/stripe-go/v85/customer"
	stripeInvoice "github.com/stripe/stripe-go/v85/invoice"
	stripeSubscription "github.com/stripe/stripe-go/v85/subscription"
)

func RetrieveStripeSubscription(subscriptionId string) (*stripe.Subscription, error) {
	return stripeSubscription.Get(subscriptionId, nil)
}
func RetrieveStripeSubscriptionWithRecurrenceData(subscriptionId string) (*stripe.Subscription, error) {
	params := &stripe.SubscriptionParams{}
	params.AddExpand("items.data.price")

	return stripeSubscription.Get(subscriptionId, params)
}
func GetRecurrenceFromStripeSubscription(subscription *stripe.Subscription) (*stripe.PriceRecurring, error) {
	if subscription == nil {
		return nil, fmt.Errorf("subscription is nil")
	}

	if subscription.Items == nil {
		return nil, fmt.Errorf("subscription items is nil")
	}

	if subscription.Items.Data == nil {
		return nil, fmt.Errorf("subscription.Items.Data == nil ")
	}

	for _, item := range subscription.Items.Data {
		if item.Price != nil && item.Price.Recurring != nil {
			return item.Price.Recurring, nil
		}
	}
	return nil, fmt.Errorf("no recurrences found")
}

func RetrieveStripeInvoice(invoiceId string) (*stripe.Invoice, error) {
	return stripeInvoice.Get(invoiceId, nil)
}
func RetrieveStripeCheckoutSession(checkoutSessionId string) (*stripe.CheckoutSession, error) {
	return stripeCheckoutSession.Get(checkoutSessionId, nil)
}
func CreateStripeCheckoutSession(params *stripe.CheckoutSessionParams) (*stripe.CheckoutSession, error) {
	return stripeCheckoutSession.New(params)
}

func CreateStripeCustomer(email string) (*stripe.Customer, error) {
	return stripeCustomer.New(&stripe.CustomerParams{
		Email: stripe.String(email),
	})
}

func GetCurrentPeriodEndFromStripeSubscription(sub *stripe.Subscription) (int64, error) {
	if sub.Items == nil || len(sub.Items.Data) == 0 {
		return 0, fmt.Errorf("subscription has no items")
	}

	for _, item := range sub.Items.Data {
		if item != nil && item.CurrentPeriodEnd > 0 {
			return item.CurrentPeriodEnd, nil
		}
	}

	return 0, fmt.Errorf("no subscription item with a valid current_period_end found")
}
