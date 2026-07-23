package stripeProductPricesSdk

import (
	"fmt"

	"github.com/robMolloy/pokkit-turborepo/apps/pokkit-deployer-db/src/db"

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

func DbGetStripeProductPriceCollection(app pbCore.App) (*pbCore.Collection, error) {
	return app.FindCollectionByNameOrId(db.StripeProductPricesCollectionName)
}

func CreateNewStripeProductPriceRecordProxy(app pbCore.App) (*TStripeProductPriceRecordProxy, error) {
	collection, err := DbGetStripeProductPriceCollection(app)
	if err != nil {
		return nil, fmt.Errorf("DbGetStripeProductPriceCollection(app): %w", err)
	}
	record := pbCore.NewRecord(collection)
	stripeProductPriceRecordProxy := &TStripeProductPriceRecordProxy{}
	stripeProductPriceRecordProxy.SetProxyRecord(record)
	return stripeProductPriceRecordProxy, nil
}
func CreateStripeProductPriceRecordProxyFromRecord(record *pbCore.Record) *TStripeProductPriceRecordProxy {
	stripeProductPriceRecordProxy := &TStripeProductPriceRecordProxy{}
	stripeProductPriceRecordProxy.SetProxyRecord(record)
	return stripeProductPriceRecordProxy
}

func DbGetStripeProductPriceRecords(app pbCore.App) ([]*TStripeProductPriceRecordProxy, error) {
	collection, err := DbGetStripeProductPriceCollection(app)
	if err != nil {
		return nil, fmt.Errorf("DbGetStripeProductPriceCollection(app): %w", err)
	}

	records, err := app.FindAllRecords(collection)
	if err != nil {
		return nil, fmt.Errorf("app.FindAllRecords(collection): %w", err)
	}

	stripeProductPriceRecordProxies := []*TStripeProductPriceRecordProxy{}
	for _, record := range records {
		stripeProductPriceRecordProxy := CreateStripeProductPriceRecordProxyFromRecord(record)
		stripeProductPriceRecordProxies = append(stripeProductPriceRecordProxies, stripeProductPriceRecordProxy)
	}

	return stripeProductPriceRecordProxies, nil
}

func DbGetStripeProductPriceRecordByStripePriceId(app pbCore.App, stripePriceId string) (*TStripeProductPriceRecordProxy, error) {
	collection, err := DbGetStripeProductPriceCollection(app)
	if err != nil {
		return nil, fmt.Errorf("DbGetStripeProductPriceCollection(app): %w", err)
	}
	record, err := app.FindFirstRecordByData(collection, "stripePriceId", stripePriceId)
	if err != nil {
		return nil, fmt.Errorf("app.FindFirstRecordByData(collection, \"stripePriceId\", %q): %w", stripePriceId, err)
	}

	stripeProductPriceRecordProxy := CreateStripeProductPriceRecordProxyFromRecord(record)
	return stripeProductPriceRecordProxy, nil
}
