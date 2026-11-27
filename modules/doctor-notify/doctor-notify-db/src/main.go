package main

import (
	"log"

	"ganigeorgiev.com/pocketbase/pocketbase"

	"ganigeorgiev.com/pocketbase/pocketbase/plugins/migratecmd"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/osutils"

	// enable once you have at least one migration
	_ "github.com/robMolloy/pokkit-turborepo/modules/doctor-notify/doctor-notify-db/src/migrations"
	pbPluginAddSuperuserMigration "github.com/robMolloy/pokkit-turborepo/modules/pb-plugin-add-superuser/pb-plugin-add-superuser-migration"
)

func main() {
	app := pocketbase.New()

	pbPluginAddSuperuserMigration.BindFunctions()

	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		Automigrate: osutils.IsProbablyGoRun(),
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
