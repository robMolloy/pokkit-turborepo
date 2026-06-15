package stripeProductPricesSdk

import (
	"app-db/src/db"
	"app-db/src/modules/stripeLedgerRecordsSdk"
	"app-db/src/utils"
	"fmt"

	pbCore "github.com/pocketbase/pocketbase/core"
	pbTypes "github.com/pocketbase/pocketbase/tools/types"
)

type TStripeProductPriceRecordStruct struct {
	Id                      string           `json:"id"`
	StripeProductId         string           `json:"stripeProductId"`
	StripePriceId           string           `json:"stripePriceId"`
	RecurrenceInterval      string           `json:"recurrenceInterval"`
	RecurrenceIntervalCount int              `json:"recurrenceIntervalCount"`
	Currency                string           `json:"currency"`
	CostPerUnit             int              `json:"costPerUnit"`
	Created                 pbTypes.DateTime `json:"created"`
	Updated                 pbTypes.DateTime `json:"updated"`
}

func ConvertStripeProductPriceRecordToStruct(record *pbCore.Record) TStripeProductPriceRecordStruct {
	return TStripeProductPriceRecordStruct{
		Id:                      record.GetString("id"),
		StripeProductId:         record.GetString("stripeProductId"),
		StripePriceId:           record.GetString("stripePriceId"),
		RecurrenceInterval:      record.GetString("recurrenceInterval"),
		RecurrenceIntervalCount: record.GetInt("recurrenceIntervalCount"),
		Currency:                record.GetString("currency"),
		CostPerUnit:             record.GetInt("costPerUnit"),
		Created:                 record.GetDateTime("created"),
		Updated:                 record.GetDateTime("updated"),
	}
}

func ConvertStripeProductPriceStructToRecord(app pbCore.App, recordStruct TStripeProductPriceRecordStruct) (*pbCore.Record, error) {
	record, err := NewStripeProductPriceRecord(app)
	if err != nil {
		return nil, fmt.Errorf("NewStripeProductPriceRecord(app): %w", err)
	}
	record, err = utils.PopulateRecord(record, recordStruct)
	if err != nil {
		return nil, fmt.Errorf("utils.PopulateRecord(record, recordStruct): %w", err)
	}
	return record, nil
}

func NewStripeProductPriceRecord(app pbCore.App) (*pbCore.Record, error) {
	collection, err := app.FindCollectionByNameOrId(db.StripeProductPricesCollectionName)
	if err != nil {
		app.Logger().Error("app.FindCollectionByNameOrId(db.StripeProductPricesCollectionName)", "err", err)
		return nil, err
	}
	record := pbCore.NewRecord(collection)
	return record, nil
}

func PopulateStripeProductPriceRecordWithStruct(record *pbCore.Record, data TStripeProductPriceRecordStruct) (*pbCore.Record, error) {
	return utils.PopulateRecord(record, data)
}

func DbGetStripeProductPriceRecordStructs(app pbCore.App) ([]TStripeProductPriceRecordStruct, error) {
	collection, err := app.FindCollectionByNameOrId(db.StripeProductPricesCollectionName)
	if err != nil {
		app.Logger().Error("app.FindCollectionByNameOrId(db.StripeProductPricesCollectionName)", "err", err)
		return nil, err
	}

	records, err := app.FindAllRecords(collection)
	if err != nil {
		return nil, fmt.Errorf("app.FindAllRecords(collection): %w", err)
	}

	stripeProductPriceRecordStructs := []TStripeProductPriceRecordStruct{}
	for _, record := range records {
		stripeProductPriceRecordStruct := ConvertStripeProductPriceRecordToStruct(record)
		stripeProductPriceRecordStructs = append(stripeProductPriceRecordStructs, stripeProductPriceRecordStruct)
	}

	return stripeProductPriceRecordStructs, nil
}

func DbGetStripeProductPriceCollection(app pbCore.App) (*pbCore.Collection, error) {
	return app.FindCollectionByNameOrId(db.StripeProductPricesCollectionName)
}

func DbGetStripeProductPriceRecordByStripePriceId(app pbCore.App, stripePriceId string) (*TStripeProductPriceRecordStruct, error) {
	collection, err := DbGetStripeProductPriceCollection(app)
	if err != nil {
		return nil, fmt.Errorf("DbGetStripeProductPriceCollection(app): %w", err)
	}
	record, err := app.FindFirstRecordByData(collection, "stripePriceId", stripePriceId)
	if err != nil {
		return nil, fmt.Errorf("app.FindFirstRecordByData(collection, \"stripePriceId\", %q): %w", stripePriceId, err)
	}
	if record == nil {
		return nil, err
	}
	stripeProductPriceRecordStruct := ConvertStripeProductPriceRecordToStruct(record)
	return &stripeProductPriceRecordStruct, nil
}

func DbUpsertStripeProductPrice(app pbCore.App, recordStruct TStripeProductPriceRecordStruct) error {
	record, err := NewStripeProductPriceRecord(app)
	if err != nil {
		return fmt.Errorf("NewStripeProductPriceRecord(app): %w", err)
	}
	record, err = utils.PopulateRecord(record, recordStruct)
	if err != nil {
		return fmt.Errorf("utils.PopulateRecord(record, recordStruct): %w", err)
	}

	if recordStruct.Id != "" {
		record.MarkAsNotNew()
	}
	return app.Save(record)
}

func DbCreateStripeProductPriceRecord(app pbCore.App, recordStruct TStripeProductPriceRecordStruct) error {
	collection, err := DbGetStripeProductPriceCollection(app)
	if err != nil {
		return fmt.Errorf("DbGetStripeProductPriceCollection(app): %w", err)
	}
	record := pbCore.NewRecord(collection)
	record, err = utils.PopulateRecord(record, recordStruct)
	if err != nil {
		return fmt.Errorf("utils.PopulateRecord(record, recordStruct): %w", err)
	}
	return app.Save(record)
}

func PopulateStripeProductPriceRecordStructWithStripeLedgerRecordStruct(
	priceRecordStruct *TStripeProductPriceRecordStruct,
	ledgerRecordStruct stripeLedgerRecordsSdk.TStripeLedgerStruct,
) {
	priceRecordStruct.StripeProductId = ledgerRecordStruct.ProductId
	priceRecordStruct.StripePriceId = ledgerRecordStruct.StripePriceId
	priceRecordStruct.RecurrenceInterval = ledgerRecordStruct.RecurrenceInterval
	priceRecordStruct.RecurrenceIntervalCount = ledgerRecordStruct.RecurrenceIntervalCount
	priceRecordStruct.Currency = ledgerRecordStruct.Currency
	priceRecordStruct.CostPerUnit = ledgerRecordStruct.CostPerUnit
}
