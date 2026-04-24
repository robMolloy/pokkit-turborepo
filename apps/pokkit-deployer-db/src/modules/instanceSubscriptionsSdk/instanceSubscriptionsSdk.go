package instanceSubscriptionsSdk

import (
	"app-db/src/db"
	"app-db/src/modules/stripeBalanceLedgerRecordsSdk"
	"app-db/src/modules/stripeSdk"

	pbCore "github.com/pocketbase/pocketbase/core"
	pbTypes "github.com/pocketbase/pocketbase/tools/types"
)

type TInstanceSubscriptionRecordStruct struct {
	Id                string           `json:"id"`
	UserId            string           `json:"userId"`
	SubscriptionId    string           `json:"subscriptionId"`
	NumberOfInstances int              `json:"numberOfInstances"`
	PaidUntilDateTime pbTypes.DateTime `json:"paidUntilDateTime"`
	Created           pbTypes.DateTime `json:"created"`
	Updated           pbTypes.DateTime `json:"updated"`
}

func ConvertInstanceSubscriptionRecordToStruct(record *pbCore.Record) TInstanceSubscriptionRecordStruct {
	return TInstanceSubscriptionRecordStruct{
		Id:                record.GetString("id"),
		UserId:            record.GetString("userId"),
		SubscriptionId:    record.GetString("subscriptionId"),
		NumberOfInstances: record.GetInt("numberOfInstances"),
		PaidUntilDateTime: record.GetDateTime("paidUntilDateTime"),
		Created:           record.GetDateTime("created"),
		Updated:           record.GetDateTime("updated"),
	}
}

func FindInstancesSubscriptionRecordAndUpdateFromStripeBalanceLedgerStruct(app pbCore.App, stripeBalanceLedgerStruct stripeBalanceLedgerRecordsSdk.TStripeBalanceLedgerStruct) error {
	subscription, err := stripeSdk.RetrieveStripeSubscription(stripeBalanceLedgerStruct.SubscriptionId)
	app.Logger().Error("subscription", "subscription", subscription)
	if err != nil {
		return err
	}

	currentPeriodEnd, err := stripeSdk.GetCurrentPeriodEndFromStripeSubscription(subscription)

	instancesSubscriptionsCollection, err := app.FindCollectionByNameOrId(db.InstancesSubscriptionsCollectionName)
	instancesSubscriptionsRecord, _ := app.FindRecordById(db.InstancesSubscriptionsCollectionName, stripeBalanceLedgerStruct.UserId)

	app.Logger().Error("stripeBalanceLedgerStruct", "stripeBalanceLedgerStruct", stripeBalanceLedgerStruct)
	if instancesSubscriptionsRecord == nil {
		instancesSubscriptionsRecord = pbCore.NewRecord(instancesSubscriptionsCollection)
		instancesSubscriptionsRecord.Set("id", stripeBalanceLedgerStruct.UserId)
		instancesSubscriptionsRecord.Set("userId", stripeBalanceLedgerStruct.UserId)
	}

	instancesSubscriptionsRecord.Set("numberOfInstances", stripeBalanceLedgerStruct.Quantity)

	// currentPaidUntilDateTime := instancesSubscriptionsRecord.GetDateTime("paidUntilDateTime")
	// newPaidUntilDateTime := currentPaidUntilDateTime.AddDate(0, 1, 0)
	instancesSubscriptionsRecord.Set("paidUntilDateTime", currentPeriodEnd)
	instancesSubscriptionsRecord.Set("subscriptionId", subscription.ID)

	app.Logger().Error("instancesSubscriptionsRecord", "instancesSubscriptionsRecord", instancesSubscriptionsRecord)

	if err = app.Save(instancesSubscriptionsRecord); err != nil {
		return err
	}
	return nil
}
