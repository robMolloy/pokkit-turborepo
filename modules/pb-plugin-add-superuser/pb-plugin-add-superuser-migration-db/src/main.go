// main.go
package main

import (
	"log"

	"ganigeorgiev.com/pocketbase/pocketbase"
	pbPluginAddSuperuserMigration "github.com/robMolloy/pokkit-turborepo/modules/pb-plugin-add-superuser/pb-plugin-add-superuser-migration"

	"ganigeorgiev.com/pocketbase/pocketbase/plugins/migratecmd"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/osutils"
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
