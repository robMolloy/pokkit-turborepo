package instanceSubscriptionsSdk

import (
	"app-db/src/db"
	"app-db/src/modules/stripeLedgerRecordsSdk"
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

func FindInstancesSubscriptionRecordAndUpdateFromStripeLedgerStruct(app pbCore.App, stripeLedgerStruct stripeLedgerRecordsSdk.TStripeLedgerStruct) error {
	subscription, err := stripeSdk.RetrieveStripeSubscription(stripeLedgerStruct.SubscriptionId)
	app.Logger().Error("subscription", "subscription", subscription)
	if err != nil {
		return err
	}

	currentPeriodEnd, err := stripeSdk.GetCurrentPeriodEndFromStripeSubscription(subscription)

	instancesSubscriptionsCollection, err := app.FindCollectionByNameOrId(db.InstancesSubscriptionsCollectionName)
	instancesSubscriptionsRecord, _ := app.FindRecordById(db.InstancesSubscriptionsCollectionName, stripeLedgerStruct.UserId)

	if instancesSubscriptionsRecord == nil {
		instancesSubscriptionsRecord = pbCore.NewRecord(instancesSubscriptionsCollection)
		instancesSubscriptionsRecord.Set("id", stripeLedgerStruct.UserId)
		instancesSubscriptionsRecord.Set("userId", stripeLedgerStruct.UserId)
	}

	instancesSubscriptionsRecord.Set("numberOfInstances", stripeLedgerStruct.Quantity)

	instancesSubscriptionsRecord.Set("paidUntilDateTime", currentPeriodEnd)
	instancesSubscriptionsRecord.Set("subscriptionId", subscription.ID)

	app.Logger().Error("instancesSubscriptionsRecord", "instancesSubscriptionsRecord", instancesSubscriptionsRecord)

	if err = app.Save(instancesSubscriptionsRecord); err != nil {
		return err
	}
	return nil
}
