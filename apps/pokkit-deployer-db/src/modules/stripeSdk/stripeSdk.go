package stripeSdk

import (
	"errors"

	stripe "github.com/stripe/stripe-go/v85"
	stripeSubscription "github.com/stripe/stripe-go/v85/subscription"
)

func RetrieveStripeSubscription(subscriptionId string) (*stripe.Subscription, error) {
	return stripeSubscription.Get(subscriptionId, nil)
}

func GetCurrentPeriodEndFromStripeSubscription(sub *stripe.Subscription) (int64, error) {
	if sub.Items == nil || len(sub.Items.Data) == 0 {
		return 0, errors.New("subscription has no items")
	}

	for _, item := range sub.Items.Data {
		if item != nil && item.CurrentPeriodEnd > 0 {
			return item.CurrentPeriodEnd, nil
		}
	}

	return 0, errors.New("no subscription item with a valid current_period_end found")
}
