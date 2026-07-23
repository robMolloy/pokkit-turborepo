package stripeConfigSdk

import (
	"github.com/robMolloy/pokkit-turborepo/apps/pokkit-deployer-db/src/db"
	"github.com/robMolloy/pokkit-turborepo/apps/pokkit-deployer-db/src/utils"

	pbCore "github.com/pocketbase/pocketbase/core"
	pbTypes "github.com/pocketbase/pocketbase/tools/types"
)

type TStripeConfigStruct struct {
	Id                 string           `json:"id"`
	LogAllStripeEvents bool             `json:"userId"`
	Created            pbTypes.DateTime `json:"created"`
	Updated            pbTypes.DateTime `json:"updated"`
}

func ConvertStripeConfigRecordToStruct(record *pbCore.Record) TStripeConfigStruct {
	return TStripeConfigStruct{
		Id:                 record.GetString("id"),
		LogAllStripeEvents: record.GetBool("logAllStripeEvents"),
		Created:            record.GetDateTime("created"),
		Updated:            record.GetDateTime("updated"),
	}
}

func NewStripeConfigRecord(app pbCore.App) (*pbCore.Record, error) {
	collection, err := app.FindCollectionByNameOrId(db.StripeConfigCollectionName)
	if err != nil {
		app.Logger().Error("app.FindCollectionByNameOrId(db.StripeConfigCollectionName)", "err", err)
		return nil, err
	}
	record := pbCore.NewRecord(collection)
	return record, nil
}

func PopulateStripeConfigRecordWithStruct(record *pbCore.Record, data TStripeConfigStruct) (*pbCore.Record, error) {
	return utils.PopulateRecord(record, data)
}

func GetStripeConfig(app pbCore.App) (*TStripeConfigStruct, error) {
	collection, err := app.FindCollectionByNameOrId(db.StripeConfigCollectionName)
	if err != nil {
		app.Logger().Error("app.FindCollectionByNameOrId(db.StripeConfigCollectionName)", "err", err)
		return nil, err
	}

	records, err := app.FindAllRecords(collection)
	if err != nil {
		app.Logger().Error("app.FindAllRecords(collection)", "err", err)
		return nil, err
	}
	record := records[0]
	if record == nil {
		return &TStripeConfigStruct{}, nil
	}

	stripeConfigStruct := ConvertStripeConfigRecordToStruct(record)
	return &stripeConfigStruct, nil
}
