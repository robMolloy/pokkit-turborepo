package stripeProductPricesSdk

import (
	"app-db/src/db"
	"app-db/src/modules/stripeLedgerRecordsSdk"
	"app-db/src/utils"
	"fmt"

	pbCore "github.com/pocketbase/pocketbase/core"
	pbTypes "github.com/pocketbase/pocketbase/tools/types"
)

var _ pbCore.RecordProxy = (*TStripeProductPriceRecordProxy)(nil)

type TStripeProductPriceRecordProxy struct {
	pbCore.BaseRecordProxy
}

func (a *TStripeProductPriceRecordProxy) GetId() string {
	return a.GetString("id")
}
func (a *TStripeProductPriceRecordProxy) SetId(value string) {
	a.Set("id", value)
}
func (a *TStripeProductPriceRecordProxy) GetStripeProductId() string {
	return a.GetString("stripeProductId")
}
func (a *TStripeProductPriceRecordProxy) SetStripeProductId(value string) {
	a.Set("stripeProductId", value)
}
func (a *TStripeProductPriceRecordProxy) GetStripePriceId() string {
	return a.GetString("stripePriceId")
}
func (a *TStripeProductPriceRecordProxy) SetStripePriceId(value string) {
	a.Set("stripePriceId", value)
}
func (a *TStripeProductPriceRecordProxy) GetRecurrenceInterval() string {
	return a.GetString("recurrenceInterval")
}
func (a *TStripeProductPriceRecordProxy) SetRecurrenceInterval(value string) {
	a.Set("recurrenceInterval", value)
}
func (a *TStripeProductPriceRecordProxy) GetRecurrenceIntervalCount() int {
	return a.GetInt("recurrenceIntervalCount")
}
func (a *TStripeProductPriceRecordProxy) SetRecurrenceIntervalCount(value int) {
	a.Set("recurrenceIntervalCount", value)
}
func (a *TStripeProductPriceRecordProxy) GetCurrency() string {
	return a.GetString("currency")
}
func (a *TStripeProductPriceRecordProxy) SetCurrency(value string) {
	a.Set("currency", value)
}
func (a *TStripeProductPriceRecordProxy) GetCostPerUnit() int {
	return a.GetInt("costPerUnit")
}
func (a *TStripeProductPriceRecordProxy) SetCostPerUnit(value int) {
	a.Set("costPerUnit", value)
}
func (a *TStripeProductPriceRecordProxy) GetCreated() pbTypes.DateTime {
	return a.GetDateTime("created")
}
func (a *TStripeProductPriceRecordProxy) SetCreated(value pbTypes.DateTime) {
	a.Set("created", value)
}
func (a *TStripeProductPriceRecordProxy) GetUpdated() pbTypes.DateTime {
	return a.GetDateTime("updated")
}
func (a *TStripeProductPriceRecordProxy) SetUpdated(value pbTypes.DateTime) {
	a.Set("updated", value)
}

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

func NewStripeProductPriceRecordProxy(app pbCore.App) (*TStripeProductPriceRecordProxy, error) {
	collection, err := app.FindCollectionByNameOrId(db.StripeProductPricesCollectionName)
	if err != nil {
		return nil, fmt.Errorf("app.FindCollectionByNameOrId(db.StripeProductPricesCollectionName): %w", err)
	}
	record := pbCore.NewRecord(collection)
	stripeProductPriceRecordProxy := &TStripeProductPriceRecordProxy{}
	stripeProductPriceRecordProxy.SetProxyRecord(record)
	return stripeProductPriceRecordProxy, nil
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
func DbGetStripeProductPriceRecordProxies(app pbCore.App) ([]*TStripeProductPriceRecordProxy, error) {
	collection, err := app.FindCollectionByNameOrId(db.StripeProductPricesCollectionName)
	if err != nil {
		app.Logger().Error("app.FindCollectionByNameOrId(db.StripeProductPricesCollectionName)", "err", err)
		return nil, err
	}

	records, err := app.FindAllRecords(collection)
	if err != nil {
		return nil, fmt.Errorf("app.FindAllRecords(collection): %w", err)
	}

	stripeProductPriceRecordProxies := []*TStripeProductPriceRecordProxy{}
	for _, record := range records {
		stripeProductPriceRecordProxy := &TStripeProductPriceRecordProxy{}
		stripeProductPriceRecordProxy.SetProxyRecord(record)
		stripeProductPriceRecordProxies = append(stripeProductPriceRecordProxies, stripeProductPriceRecordProxy)
	}

	return stripeProductPriceRecordProxies, nil
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
func DbGetStripeProductPriceRecordProxyByStripePriceId(app pbCore.App, stripePriceId string) (*TStripeProductPriceRecordProxy, error) {
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
	stripeProductPriceRecordProxy := &TStripeProductPriceRecordProxy{}
	stripeProductPriceRecordProxy.SetProxyRecord(record)
	return stripeProductPriceRecordProxy, nil
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

func DbUpsertStripeProductPriceRecordProxy(app pbCore.App, recordProxy TStripeProductPriceRecordProxy) error {
	return app.Save(recordProxy)
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
func DbCreateStripeProductPriceRecordProxy(app pbCore.App, recordProxy TStripeProductPriceRecordProxy) error {
	return app.Save(recordProxy)
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
