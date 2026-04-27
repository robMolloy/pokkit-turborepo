package instanceSubscriptionsSdk

import (
	"app-db/src/db"
	"app-db/src/modules/stripeLedgerRecordsSdk"
	"app-db/src/modules/stripeSdk"
	"fmt"

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

func ConvertInstancesSubscriptionStructToRecord(app pbCore.App, data TInstanceSubscriptionRecordStruct) (*pbCore.Record, error) {
	instancesSubscriptionsCollection, err := app.FindCollectionByNameOrId(db.InstancesSubscriptionsCollectionName)
	if err != nil {
		return nil, err
	}
	record := pbCore.NewRecord(instancesSubscriptionsCollection)

	PopulateInstancesSubscriptionRecordWithStruct(record, data)

	return record, nil
}
func PopulateInstancesSubscriptionRecordWithStruct(record *pbCore.Record, data TInstanceSubscriptionRecordStruct) {
	record.Set("id", data.Id)
	record.Set("userId", data.UserId)
	record.Set("subscriptionId", data.SubscriptionId)
	record.Set("numberOfInstances", data.NumberOfInstances)
	record.Set("paidUntilDateTime", data.PaidUntilDateTime)
	record.Set("created", data.Created)
	record.Set("updated", data.Updated)
}

func FindInstancesSubscriptionRecordAndUpdateFromStripeLedgerStruct(app pbCore.App, stripeLedgerStruct stripeLedgerRecordsSdk.TStripeLedgerStruct) error {
	subscription, err := stripeSdk.RetrieveStripeSubscription(stripeLedgerStruct.SubscriptionId)

	if err != nil {
		return err
	}

	currentPeriodEnd, err := stripeSdk.GetCurrentPeriodEndFromStripeSubscription(subscription)
	if err != nil {
		return err
	}

	currentPeriodEndDateTime, err := pbTypes.ParseDateTime(currentPeriodEnd)
	if err != nil {
		currentPeriodEndDateTime = pbTypes.NowDateTime()
	}

	instancesSubscriptionsCollection, err := app.FindCollectionByNameOrId(db.InstancesSubscriptionsCollectionName)
	if err != nil {
		return fmt.Errorf("%v collection cannot be found", db.InstancesSubscriptionsCollectionName)
	}

	instancesSubscriptionRecord, err := app.FindFirstRecordByData(db.InstancesSubscriptionsCollectionName, "subscriptionId", stripeLedgerStruct.SubscriptionId)
	if instancesSubscriptionRecord == nil {
		instancesSubscriptionRecord = pbCore.NewRecord(instancesSubscriptionsCollection)
	}

	instancesSubscriptionStruct := ConvertInstanceSubscriptionRecordToStruct(instancesSubscriptionRecord)
	instancesSubscriptionExists := instancesSubscriptionStruct.Id != ""

	if instancesSubscriptionExists && instancesSubscriptionStruct.UserId != stripeLedgerStruct.UserId {
		return fmt.Errorf("stripe ledger userId does not match instancesSubscriptionRecord userId")
	}

	if !instancesSubscriptionExists {
		instancesSubscriptionStruct.UserId = stripeLedgerStruct.UserId
	}

	instancesSubscriptionStruct.NumberOfInstances = stripeLedgerStruct.Quantity
	instancesSubscriptionStruct.PaidUntilDateTime = currentPeriodEndDateTime
	instancesSubscriptionStruct.SubscriptionId = subscription.ID

	newInstancesSubscriptionRecord := pbCore.NewRecord(instancesSubscriptionsCollection)
	PopulateInstancesSubscriptionRecordWithStruct(newInstancesSubscriptionRecord, instancesSubscriptionStruct)

	if err = app.Save(newInstancesSubscriptionRecord); err != nil {
		return err
	}
	return nil
}
