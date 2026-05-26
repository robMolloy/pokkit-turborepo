package instanceSubscriptionsSdk

import (
	"app-db/src/db"
	"app-db/src/modules/stripeLedgerRecordsSdk"
	"database/sql"
	"errors"
	"fmt"

	pbCore "github.com/pocketbase/pocketbase/core"
	pbTypes "github.com/pocketbase/pocketbase/tools/types"
)

type TInstancesSubscriptionRecordStruct struct {
	Id                string           `json:"id"`
	UserId            string           `json:"userId"`
	SubscriptionId    string           `json:"subscriptionId"`
	NumberOfInstances int              `json:"numberOfInstances"`
	CostPerUnit       int              `json:"costPerUnit"`
	Currency          string           `json:"currency"`
	Cost              int              `json:"cost"`
	Interval          string           `json:"interval"`
	IntervalCount     int              `json:"intervalCount"`
	PaidUntilDateTime pbTypes.DateTime `json:"paidUntilDateTime"`
	RawData           any              `json:"rawData"`
	Created           pbTypes.DateTime `json:"created"`
	Updated           pbTypes.DateTime `json:"updated"`
}

type TInstancesSubscriptionRecordAdditionalDataStruct struct {
	IsExpired bool `json:"isExpired"`
}

func ConvertInstancesSubscriptionRecordStructToAdditionalData(recordStruct TInstancesSubscriptionRecordStruct) TInstancesSubscriptionRecordAdditionalDataStruct {
	paidUntilDateTime := recordStruct.PaidUntilDateTime

	return TInstancesSubscriptionRecordAdditionalDataStruct{
		IsExpired: paidUntilDateTime.Before(pbTypes.NowDateTime()),
	}
}

func ConvertInstanceSubscriptionRecordToStruct(record *pbCore.Record) TInstancesSubscriptionRecordStruct {
	return TInstancesSubscriptionRecordStruct{
		Id:                record.GetString("id"),
		UserId:            record.GetString("userId"),
		SubscriptionId:    record.GetString("subscriptionId"),
		NumberOfInstances: record.GetInt("numberOfInstances"),
		CostPerUnit:       record.GetInt("costPerUnit"),
		Currency:          record.GetString("currency"),
		Cost:              record.GetInt("cost"),
		Interval:          record.GetString("interval"),
		IntervalCount:     record.GetInt("intervalCount"),
		PaidUntilDateTime: record.GetDateTime("paidUntilDateTime"),
		RawData:           record.Get("rawData"),
		Created:           record.GetDateTime("created"),
		Updated:           record.GetDateTime("updated"),
	}
}
func PopulateInstancesSubscriptionRecordWithStruct(record *pbCore.Record, data TInstancesSubscriptionRecordStruct) {
	if data.Id != "" {
		record.Set("id", data.Id)
	}
	record.Set("userId", data.UserId)
	record.Set("subscriptionId", data.SubscriptionId)
	record.Set("numberOfInstances", data.NumberOfInstances)
	record.Set("costPerUnit", data.CostPerUnit)
	record.Set("cost", data.Cost)
	record.Set("currency", data.Currency)
	record.Set("interval", data.Interval)
	record.Set("intervalCount", data.IntervalCount)
	record.Set("paidUntilDateTime", data.PaidUntilDateTime)
	record.Set("rawData", data.RawData)
	record.Set("created", data.Created)
	record.Set("updated", data.Updated)
}

func ConvertInstancesSubscriptionStructToRecord(app pbCore.App, data TInstancesSubscriptionRecordStruct) (*pbCore.Record, error) {
	instancesSubscriptionsCollection, err := app.FindCollectionByNameOrId(db.InstancesSubscriptionsCollectionName)
	if err != nil {
		return nil, err
	}
	record := pbCore.NewRecord(instancesSubscriptionsCollection)
	PopulateInstancesSubscriptionRecordWithStruct(record, data)

	return record, nil
}

func FindInstancesSubscriptionRecordAndUpdateFromStripeLedgerStruct(app pbCore.App, stripeLedgerStruct stripeLedgerRecordsSdk.TStripeLedgerStruct) error {
	instancesSubscriptionsCollection, err := app.FindCollectionByNameOrId(db.InstancesSubscriptionsCollectionName)
	if err != nil {
		return fmt.Errorf("FindCollectionByNameOrId(db.InstancesSubscriptionsCollectionName) returns error: %w", err)
	}

	existingInstancesSubscriptionRecord, err := app.FindFirstRecordByData(db.InstancesSubscriptionsCollectionName, "subscriptionId", stripeLedgerStruct.SubscriptionId)
	isRecordFound := !errors.Is(err, sql.ErrNoRows)

	if err != nil && isRecordFound {
		return fmt.Errorf("FindFirstRecordByData(db.InstancesSubscriptionsCollectionName... returns error: %w", err)
	}
	if !isRecordFound {
		// no record found will be nil
		existingInstancesSubscriptionRecord = pbCore.NewRecord(instancesSubscriptionsCollection)
	}

	existingInstancesSubscriptionRecordStruct := ConvertInstanceSubscriptionRecordToStruct(existingInstancesSubscriptionRecord)

	// if exists use existing userId - avoid subscription hijack
	userId := existingInstancesSubscriptionRecordStruct.UserId
	if userId == "" {
		userId = stripeLedgerStruct.UserId
	}

	instancesSubscriptionStruct := TInstancesSubscriptionRecordStruct{
		SubscriptionId:    stripeLedgerStruct.SubscriptionId,
		NumberOfInstances: stripeLedgerStruct.Quantity,
		CostPerUnit:       stripeLedgerStruct.CostPerUnit,
		Currency:          stripeLedgerStruct.Currency,
		Cost:              stripeLedgerStruct.Cost,
		Interval:          stripeLedgerStruct.RecurrenceInterval,
		IntervalCount:     stripeLedgerStruct.RecurrenceIntervalCount,
		PaidUntilDateTime: stripeLedgerStruct.RecurrenceIntervalEnd,
		RawData:           stripeLedgerStruct,
		UserId:            userId,
	}

	PopulateInstancesSubscriptionRecordWithStruct(existingInstancesSubscriptionRecord, instancesSubscriptionStruct)

	return app.Save(existingInstancesSubscriptionRecord)
}
