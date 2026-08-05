package main

import (
	"log"

	pocketbase "github.com/pocketbase/pocketbase"
	pbCore "github.com/pocketbase/pocketbase/core"
	"github.com/robMolloy/pokkit-turborepo/packages/pokkitDbConfigSync"
)

func main() {
	app := pocketbase.New()

	pokkitDbConfigSync.BindFunctions(app)
	// pokkitDbPermissions.BindFunctions(app)

	app.OnServe().BindFunc(func(se *pbCore.ServeEvent) error {
		return se.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
