package stripeProductsSdk

import (
	"fmt"

	"github.com/robMolloy/pokkit-turborepo/apps/pokkit-deployer-db/src/db"
	"github.com/robMolloy/pokkit-turborepo/apps/pokkit-deployer-db/src/utils"

	pbCore "github.com/pocketbase/pocketbase/core"
	pbTypes "github.com/pocketbase/pocketbase/tools/types"
)

type TStripeProductStruct struct {
	Id                string           `json:"id"`
	StripeProductId   string           `json:"stripeProductId"`
	StripeProductName string           `json:"stripeProductName"`
	Created           pbTypes.DateTime `json:"created"`
	Updated           pbTypes.DateTime `json:"updated"`
}

func ConvertStripeProductRecordToStruct(record *pbCore.Record) TStripeProductStruct {
	return TStripeProductStruct{
		Id:                record.GetString("id"),
		StripeProductId:   record.GetString("stripeProductId"),
		StripeProductName: record.GetString("stripeProductName"),
		Created:           record.GetDateTime("created"),
		Updated:           record.GetDateTime("updated"),
	}
}

func NewStripeProductRecord(app pbCore.App) (*pbCore.Record, error) {
	collection, err := app.FindCollectionByNameOrId(db.StripeProductsCollectionName)
	if err != nil {
		app.Logger().Error("app.FindCollectionByNameOrId(db.StripeProductsCollectionName)", "err", err)
		return nil, err
	}
	record := pbCore.NewRecord(collection)
	return record, nil
}

func PopulateStripeProductRecordWithStruct(record *pbCore.Record, data TStripeProductStruct) (*pbCore.Record, error) {
	return utils.PopulateRecord(record, data)
}

func DbGetStripeProductRecordStructs(app pbCore.App) ([]TStripeProductStruct, error) {
	collection, err := app.FindCollectionByNameOrId(db.StripeProductsCollectionName)
	if err != nil {
		app.Logger().Error("app.FindCollectionByNameOrId(db.StripeProductsCollectionName)", "err", err)
		return nil, err
	}

	records, err := app.FindAllRecords(collection)
	if err != nil {
		return nil, fmt.Errorf("app.FindAllRecords(collection): %w", err)
	}

	stripeProductStructs := []TStripeProductStruct{}
	for _, record := range records {
		stripeProductStruct := ConvertStripeProductRecordToStruct(record)
		stripeProductStructs = append(stripeProductStructs, stripeProductStruct)
	}

	return stripeProductStructs, nil
}

func DbGetStripeProductCollection(app pbCore.App) (*pbCore.Collection, error) {
	return app.FindCollectionByNameOrId(db.StripeProductsCollectionName)
}

func DbCreateStripeProductRecord(app pbCore.App, recordStruct TStripeProductStruct) error {
	collection, err := DbGetStripeProductCollection(app)
	if err != nil {
		return fmt.Errorf("DbGetStripeProductCollection(app): %w", err)
	}
	record := pbCore.NewRecord(collection)
	record, err = utils.PopulateRecord(record, recordStruct)
	if err != nil {
		return fmt.Errorf("utils.PopulateRecord(record, recordStruct): %w", err)
	}
	return app.Save(record)

}
