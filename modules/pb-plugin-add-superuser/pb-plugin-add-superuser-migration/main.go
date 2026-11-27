package pbPluginAddSuperuserMigration

import (
	pbCore "ganigeorgiev.com/pocketbase/pocketbase/core"
	pbMigrations "ganigeorgiev.com/pocketbase/pocketbase/migrations"
)

var email = "admin@admin.com"
var pass = email

func BindFunctions() {
	pbMigrations.Register(func(app pbCore.App) error {
		col, err := app.FindCollectionByNameOrId(pbCore.CollectionNameSuperusers)
		if err != nil {
			return err
		}
		rec := pbCore.NewRecord(col)
		rec.Set("email", email)
		rec.Set("password", pass)
		return app.Save(rec)
	}, func(app pbCore.App) error {
		collection, err := app.FindCollectionByNameOrId(pbCore.CollectionNameSuperusers)
		if err != nil {
			return err
		}
		record, err := app.FindFirstRecordByData(collection, "email", email)
		if err != nil {
			return err
		}
		return app.Delete(record)
	})
}
