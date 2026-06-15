package stripeLedgerRecordsSdk

import (
	"app-db/src/utils"

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
	StripePriceId           string           `json:"stripePriceId"`
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

func ConvertStripeLedgerRecordToStruct(record *pbCore.Record) TStripeLedgerStruct {
	return TStripeLedgerStruct{
		Id:                      record.GetString("id"),
		UserId:                  record.GetString("userId"),
		Quantity:                record.GetInt("quantity"),
		CostPerUnit:             record.GetInt("costPerUnit"),
		StripePayloadId:         record.GetString("stripePayloadId"),
		StripePriceId:           record.GetString("stripePriceId"),
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

func PopulateStripeLedgerRecord(record *pbCore.Record, data TStripeLedgerStruct) (*pbCore.Record, error) {
	return utils.PopulateRecord(record, data)
}
