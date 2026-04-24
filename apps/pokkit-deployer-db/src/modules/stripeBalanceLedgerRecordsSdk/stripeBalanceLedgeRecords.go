package stripeBalanceLedgerRecordsSdk

import (
	pbCore "github.com/pocketbase/pocketbase/core"
	pbTypes "github.com/pocketbase/pocketbase/tools/types"
)

type TStripeBalanceLedgerStruct struct {
	Id               string           `json:"id"`
	UserId           string           `json:"userId"`
	Quantity         int              `json:"quantity"`
	PaymentIntentId  string           `json:"paymentIntentId"`
	SubscriptionId   string           `json:"subscriptionId"`
	Currency         string           `json:"currency"`
	ProductName      string           `json:"productName"`
	ProductId        string           `json:"productId"`
	StripeCustomerId string           `json:"stripeCustomerId"`
	EventType        string           `json:"eventType"`
	RawData          any              `json:"rawData"`
	Created          pbTypes.DateTime `json:"created"`
	Updated          pbTypes.DateTime `json:"updated"`
}

func PopulateStripeBalanceLedgerRecord(record *pbCore.Record, data TStripeBalanceLedgerStruct) *pbCore.Record {
	record.Set("id", data.Id)
	record.Set("userId", data.UserId)
	record.Set("quantity", data.Quantity)
	record.Set("paymentIntentId", data.PaymentIntentId)
	record.Set("subscriptionId", data.SubscriptionId)
	record.Set("currency", data.Currency)
	record.Set("productName", data.ProductName)
	record.Set("productId", data.ProductId)
	record.Set("stripeCustomerId", data.StripeCustomerId)
	record.Set("eventType", data.EventType)
	record.Set("rawData", data.RawData)
	record.Set("created", data.Created)
	record.Set("updated", data.Updated)

	return record
}

func ConvertStripeBalanceLedgerRecordToStruct(stripeBalanceLedgerRecord *pbCore.Record) TStripeBalanceLedgerStruct {
	return TStripeBalanceLedgerStruct{
		Id:               stripeBalanceLedgerRecord.GetString("id"),
		UserId:           stripeBalanceLedgerRecord.GetString("userId"),
		Quantity:         stripeBalanceLedgerRecord.GetInt("quantity"),
		PaymentIntentId:  stripeBalanceLedgerRecord.GetString("paymentIntentId"),
		SubscriptionId:   stripeBalanceLedgerRecord.GetString("subscriptionId"),
		Currency:         stripeBalanceLedgerRecord.GetString("currency"),
		ProductName:      stripeBalanceLedgerRecord.GetString("productName"),
		ProductId:        stripeBalanceLedgerRecord.GetString("productId"),
		StripeCustomerId: stripeBalanceLedgerRecord.GetString("stripeCustomerId"),
		EventType:        stripeBalanceLedgerRecord.GetString("eventType"),
		RawData:          stripeBalanceLedgerRecord.GetString("rawData"),
		Created:          stripeBalanceLedgerRecord.GetDateTime("created"),
		Updated:          stripeBalanceLedgerRecord.GetDateTime("updated"),
	}
}
