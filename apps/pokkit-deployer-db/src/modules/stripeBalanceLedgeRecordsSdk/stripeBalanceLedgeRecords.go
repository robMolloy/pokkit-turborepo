package stripeBalanceLedgeRecordsSdk

import (
	pbCore "github.com/pocketbase/pocketbase/core"
	pbTypes "github.com/pocketbase/pocketbase/tools/types"
)

type TStripeBalanceLedgerStruct struct {
	Id               string           `json:"id"`
	UserId           string           `json:"userId"`
	Quantity         int              `json:"quantity"`
	PaymentIntentId  string           `json:"paymentIntentId"`
	Currency         string           `json:"currency"`
	ProductName      string           `json:"productName"`
	ProductId        string           `json:"productId"`
	StripeCustomerId string           `json:"stripeCustomerId"`
	EventType        string           `json:"eventType"`
	Created          pbTypes.DateTime `json:"created"`
	Updated          pbTypes.DateTime `json:"updated"`
}

func PopulateStripeBalanceLedgerRecord(record *pbCore.Record, data TStripeBalanceLedgerStruct) *pbCore.Record {
	record.Set("userId", data.UserId)
	record.Set("quantity", data.Quantity)
	record.Set("paymentIntentId", data.PaymentIntentId)
	record.Set("currency", data.Currency)
	record.Set("productName", data.ProductName)
	record.Set("productId", data.ProductId)
	record.Set("stripeCustomerId", data.StripeCustomerId)
	record.Set("eventType", data.EventType)

	return record
}

func ConvertStripeBalanceLedgerRecordToStruct(userBalanceLedgerRecord *pbCore.Record) TStripeBalanceLedgerStruct {
	return TStripeBalanceLedgerStruct{
		Id:               userBalanceLedgerRecord.GetString("id"),
		UserId:           userBalanceLedgerRecord.GetString("userId"),
		Quantity:         userBalanceLedgerRecord.GetInt("quantity"),
		PaymentIntentId:  userBalanceLedgerRecord.GetString("paymentIntentId"),
		Currency:         userBalanceLedgerRecord.GetString("currency"),
		ProductName:      userBalanceLedgerRecord.GetString("productName"),
		ProductId:        userBalanceLedgerRecord.GetString("productId"),
		StripeCustomerId: userBalanceLedgerRecord.GetString("stripeCustomerId"),
		EventType:        userBalanceLedgerRecord.GetString("eventType"),
		Created:          userBalanceLedgerRecord.GetDateTime("created"),
		Updated:          userBalanceLedgerRecord.GetDateTime("updated"),
	}
}
