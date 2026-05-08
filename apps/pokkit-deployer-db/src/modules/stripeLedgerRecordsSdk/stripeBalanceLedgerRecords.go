package stripeLedgerRecordsSdk

import (
	"reflect"

	pbCore "github.com/pocketbase/pocketbase/core"
	pbTypes "github.com/pocketbase/pocketbase/tools/types"
)

type TStripeLedgerStruct struct {
	Id                      string           `json:"id"`
	UserId                  string           `json:"userId"`
	Cost                    int              `json:"cost"`
	Quantity                int              `json:"quantity"`
	CostPerUnit             int              `json:"costPerUnit"`
	StripePayloadId         string           `json:"stripePayloadId"`
	PaymentIntentId         string           `json:"paymentIntentId"`
	SubscriptionId          string           `json:"subscriptionId"`
	InvoiceId               string           `json:"invoiceId"`
	Currency                string           `json:"currency"`
	ProductName             string           `json:"productName"`
	ProductId               string           `json:"productId"`
	StripeCustomerId        string           `json:"stripeCustomerId"`
	EventType               string           `json:"eventType"`
	RecurrenceInterval      string           `json:"recurrenceInterval"`
	RecurrenceIntervalCount int              `json:"recurrenceIntervalCount"`
	RecurrenceIntervalStart pbTypes.DateTime `json:"recurrenceIntervalStart"`
	RecurrenceIntervalEnd   pbTypes.DateTime `json:"recurrenceIntervalEnd"`
	RawData                 any              `json:"rawData"`
	Created                 pbTypes.DateTime `json:"created"`
	Updated                 pbTypes.DateTime `json:"updated"`
}

func PopulateStripeLedgerRecord2(record *pbCore.Record, data TStripeLedgerStruct) *pbCore.Record {
	structValue := reflect.ValueOf(data)
	structType := reflect.TypeOf(data)
	numberOfFields := structType.NumField()

	for fieldIndex := range numberOfFields {
		structField := structType.Field(fieldIndex)
		jsonKey := structField.Tag.Get("json")

		if jsonKey == "" || jsonKey == "-" {
			continue
		}

		fieldValue := structValue.Field(fieldIndex).Interface()
		record.Set(jsonKey, fieldValue)
	}

	return record
}

func PopulateStripeLedgerRecord(record *pbCore.Record, data TStripeLedgerStruct) *pbCore.Record {
	if data.Id != "" {
		record.Set("id", data.Id)
	}
	record.Set("userId", data.UserId)
	record.Set("quantity", data.Quantity)
	record.Set("costPerUnit", data.CostPerUnit)
	record.Set("invoiceId", data.InvoiceId)
	record.Set("stripePayloadId", data.StripePayloadId)
	record.Set("subscriptionId", data.SubscriptionId)
	record.Set("paymentIntentId", data.PaymentIntentId)
	record.Set("currency", data.Currency)
	record.Set("cost", data.Cost)
	record.Set("productName", data.ProductName)
	record.Set("productId", data.ProductId)
	record.Set("stripeCustomerId", data.StripeCustomerId)
	record.Set("eventType", data.EventType)
	record.Set("recurrenceInterval", data.RecurrenceInterval)
	record.Set("recurrenceIntervalCount", data.RecurrenceIntervalCount)
	record.Set("recurrenceIntervalStart", data.RecurrenceIntervalStart)
	record.Set("recurrenceIntervalEnd", data.RecurrenceIntervalEnd)
	record.Set("rawData", data.RawData)
	record.Set("created", data.Created)
	record.Set("updated", data.Updated)

	return record
}

func ConvertStripeLedgerRecordToStruct(record *pbCore.Record) TStripeLedgerStruct {
	return TStripeLedgerStruct{
		Id:                      record.GetString("id"),
		UserId:                  record.GetString("userId"),
		Quantity:                record.GetInt("quantity"),
		CostPerUnit:             record.GetInt("costPerUnit"),
		StripePayloadId:         record.GetString("stripePayloadId"),
		PaymentIntentId:         record.GetString("paymentIntentId"),
		InvoiceId:               record.GetString("invoiceId"),
		SubscriptionId:          record.GetString("subscriptionId"),
		Currency:                record.GetString("currency"),
		Cost:                    record.GetInt("cost"),
		ProductName:             record.GetString("productName"),
		ProductId:               record.GetString("productId"),
		StripeCustomerId:        record.GetString("stripeCustomerId"),
		EventType:               record.GetString("eventType"),
		RecurrenceInterval:      record.GetString("recurrenceInterval"),
		RecurrenceIntervalCount: record.GetInt("recurrenceIntervalCount"),
		RecurrenceIntervalStart: record.GetDateTime("recurrenceIntervalStart"),
		RecurrenceIntervalEnd:   record.GetDateTime("recurrenceIntervalEnd"),
		RawData:                 record.GetString("rawData"),
		Created:                 record.GetDateTime("created"),
		Updated:                 record.GetDateTime("updated"),
	}
}
