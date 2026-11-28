// main.go
package main

import (
	"log"

	"ganigeorgiev.com/pocketbase/pocketbase"
	addDefaultSuperuserPbPlugin "github.com/robMolloy/pokkit-turborepo/modules/add-default-superuser/add-default-superuser-pb-plugin"

	"ganigeorgiev.com/pocketbase/pocketbase/plugins/migratecmd"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/osutils"
)

func main() {
	app := pocketbase.New()

	addDefaultSuperuserPbPlugin.BindMigration()

	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		Automigrate: osutils.IsProbablyGoRun(),
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
