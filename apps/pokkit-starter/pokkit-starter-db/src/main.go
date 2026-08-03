package main

import (
	"log"

	pokkitDbConfigSync "github.com/robMolloy/pokkit-turborepo/packages/pokkitDbConfigSync"
	pokkitDbPermissions "github.com/robMolloy/pokkit-turborepo/packages/pokkitDbPermissions"

	pocketbase "github.com/pocketbase/pocketbase"
	pbCore "github.com/pocketbase/pocketbase/core"
)

func main() {
	app := pocketbase.New()

	pokkitDbConfigSync.BindFunctions(app)
	pokkitDbPermissions.BindFunctions(app)

	app.OnServe().BindFunc(func(se *pbCore.ServeEvent) error {
		return se.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
