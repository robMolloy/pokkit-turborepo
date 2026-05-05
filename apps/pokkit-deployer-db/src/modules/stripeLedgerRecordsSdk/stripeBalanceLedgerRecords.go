package stripeLedgerRecordsSdk

import (
	pbCore "github.com/pocketbase/pocketbase/core"
	pbTypes "github.com/pocketbase/pocketbase/tools/types"
)

type TStripeLedgerStruct struct {
	Id               string           `json:"id"`
	UserId           string           `json:"userId"`
	AmountTotal      int              `json:"amountTotal"`
	Quantity         int              `json:"quantity"`
	CostPerUnit      int              `json:"costPerUnit"`
	StripePayloadId  string           `json:"stripePayloadId"`
	SubscriptionId   string           `json:"subscriptionId"`
	InvoiceId        string           `json:"invoiceId"`
	Currency         string           `json:"currency"`
	ProductName      string           `json:"productName"`
	ProductId        string           `json:"productId"`
	StripeCustomerId string           `json:"stripeCustomerId"`
	EventType        string           `json:"eventType"`
	RawData          any              `json:"rawData"`
	Created          pbTypes.DateTime `json:"created"`
	Updated          pbTypes.DateTime `json:"updated"`
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
	record.Set("currency", data.Currency)
	record.Set("amountTotal", data.AmountTotal)
	record.Set("productName", data.ProductName)
	record.Set("productId", data.ProductId)
	record.Set("stripeCustomerId", data.StripeCustomerId)
	record.Set("eventType", data.EventType)
	record.Set("rawData", data.RawData)
	record.Set("created", data.Created)
	record.Set("updated", data.Updated)

	return record
}

func ConvertStripeLedgerRecordToStruct(record *pbCore.Record) TStripeLedgerStruct {
	return TStripeLedgerStruct{
		Id:               record.GetString("id"),
		UserId:           record.GetString("userId"),
		Quantity:         record.GetInt("quantity"),
		CostPerUnit:      record.GetInt("costPerUnit"),
		StripePayloadId:  record.GetString("stripePayloadId"),
		InvoiceId:        record.GetString("invoiceId"),
		SubscriptionId:   record.GetString("subscriptionId"),
		Currency:         record.GetString("currency"),
		AmountTotal:      record.GetInt("amountTotal"),
		ProductName:      record.GetString("productName"),
		ProductId:        record.GetString("productId"),
		StripeCustomerId: record.GetString("stripeCustomerId"),
		EventType:        record.GetString("eventType"),
		RawData:          record.GetString("rawData"),
		Created:          record.GetDateTime("created"),
		Updated:          record.GetDateTime("updated"),
	}
}
