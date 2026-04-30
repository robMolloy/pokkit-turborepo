package instanceSubscriptionsSdk

import (
	"app-db/src/db"
	"app-db/src/modules/stripeLedgerRecordsSdk"
	"app-db/src/modules/stripeSdk"
	"app-db/src/utils"
	"database/sql"
	"errors"
	"fmt"

	pbCore "github.com/pocketbase/pocketbase/core"
	pbTypes "github.com/pocketbase/pocketbase/tools/types"
)

type TInstanceSubscriptionRecordStruct struct {
	Id                  string           `json:"id"`
	UserId              string           `json:"userId"`
	SubscriptionId      string           `json:"subscriptionId"`
	NumberOfInstances   int              `json:"numberOfInstances"`
	Currency            string           `json:"currency"`
	Amount              int              `json:"amount"`
	Interval            string           `json:"interval"`
	IntervalCount       int              `json:"intervalCount"`
	PaidUntilDateTime   pbTypes.DateTime `json:"paidUntilDateTime"`
	SubscriptionRawData any              `json:"subscriptionRawData"`
	Created             pbTypes.DateTime `json:"created"`
	Updated             pbTypes.DateTime `json:"updated"`
}

func ConvertInstanceSubscriptionRecordToStruct(record *pbCore.Record) TInstanceSubscriptionRecordStruct {
	return TInstanceSubscriptionRecordStruct{
		Id:                  record.GetString("id"),
		UserId:              record.GetString("userId"),
		SubscriptionId:      record.GetString("subscriptionId"),
		NumberOfInstances:   record.GetInt("numberOfInstances"),
		Currency:            record.GetString("currency"),
		Amount:              record.GetInt("amount"),
		Interval:            record.GetString("interval"),
		IntervalCount:       record.GetInt("intervalCount"),
		PaidUntilDateTime:   record.GetDateTime("paidUntilDateTime"),
		SubscriptionRawData: record.Get("subscriptionRawData"),
		Created:             record.GetDateTime("created"),
		Updated:             record.GetDateTime("updated"),
	}
}
func PopulateInstancesSubscriptionRecordWithStruct(record *pbCore.Record, data TInstanceSubscriptionRecordStruct) {
	record.Set("id", data.Id)
	record.Set("userId", data.UserId)
	record.Set("subscriptionId", data.SubscriptionId)
	record.Set("numberOfInstances", data.NumberOfInstances)
	record.Set("amount", data.Amount)
	record.Set("currency", data.Currency)
	record.Set("interval", data.Interval)
	record.Set("intervalCount", data.IntervalCount)
	record.Set("paidUntilDateTime", data.PaidUntilDateTime)
	record.Set("subscriptionRawData", data.SubscriptionRawData)
	record.Set("created", data.Created)
	record.Set("updated", data.Updated)
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

func FindInstancesSubscriptionRecordAndUpdateFromStripeLedgerStruct(app pbCore.App, stripeLedgerStruct stripeLedgerRecordsSdk.TStripeLedgerStruct) error {
	subscription, err := stripeSdk.RetrieveStripeSubscriptionWithRecurrenceData(stripeLedgerStruct.SubscriptionId)
	if err != nil {
		return fmt.Errorf("RetrieveStripeSubscriptionWithRecurrenceData returns error: %w", err)
	}

	subscriptionRecurrence, err := stripeSdk.GetRecurrenceFromStripeSubscription(subscription)
	if err != nil {
		return fmt.Errorf("GetRecurrenceFromStripeSubscription returns error: %w", err)
	}
	if subscriptionRecurrence == nil {
		return fmt.Errorf("subscriptionRecurrence object is nil")
	}
	interval := subscriptionRecurrence.Interval
	if interval == "" {
		return fmt.Errorf("interval is ''")
	}
	intervalCount := subscriptionRecurrence.IntervalCount
	if intervalCount == 0 {
		return fmt.Errorf("intervalCount is 0")
	}

	currentPeriodEnd, err := stripeSdk.GetCurrentPeriodEndFromStripeSubscription(subscription)
	if err != nil {
		return fmt.Errorf("GetCurrentPeriodEndFromStripeSubscription returns error: %w", err)
	}

	currentPeriodEndDateTime, err := utils.ConvertStripeDateIntToPbDateTime(currentPeriodEnd)
	if err != nil {
		return fmt.Errorf("ConvertStripeDateIntToPbDateTime returns error: %w", err)
	}

	instancesSubscriptionsCollection, err := app.FindCollectionByNameOrId(db.InstancesSubscriptionsCollectionName)
	if err != nil {
		return fmt.Errorf("FindCollectionByNameOrId(db.InstancesSubscriptionsCollectionName) returns error: %w", err)
	}

	instancesSubscriptionRecord, err := app.FindFirstRecordByData(db.InstancesSubscriptionsCollectionName, "subscriptionId", stripeLedgerStruct.SubscriptionId)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return fmt.Errorf("FindFirstRecordByData(db.InstancesSubscriptionsCollectionName... returns error: %w", err)
	}
	if errors.Is(err, sql.ErrNoRows) {
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

	instancesSubscriptionStruct.SubscriptionRawData = subscription
	instancesSubscriptionStruct.Amount = stripeLedgerStruct.AmountTotal
	instancesSubscriptionStruct.Currency = string(subscription.Currency)
	instancesSubscriptionStruct.NumberOfInstances = stripeLedgerStruct.Quantity
	instancesSubscriptionStruct.PaidUntilDateTime = currentPeriodEndDateTime
	instancesSubscriptionStruct.SubscriptionId = subscription.ID
	instancesSubscriptionStruct.Interval = string(interval)
	instancesSubscriptionStruct.IntervalCount = int(intervalCount)

	newInstancesSubscriptionRecord := pbCore.NewRecord(instancesSubscriptionsCollection)
	PopulateInstancesSubscriptionRecordWithStruct(newInstancesSubscriptionRecord, instancesSubscriptionStruct)

	return app.Save(newInstancesSubscriptionRecord)
}
