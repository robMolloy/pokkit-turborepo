package main

import (
	"log"

	pokkitDbConfigSync "github.com/robMolloy/pokkit-turborepo/packages/pokkitDbConfigSync"

	pocketbase "github.com/pocketbase/pocketbase"
	pbCore "github.com/pocketbase/pocketbase/core"
)

func main() {
	app := pocketbase.New()
	// asdasdasdasd
	pokkitDbConfigSync.BindFunctions(app)

	app.OnServe().BindFunc(func(se *pbCore.ServeEvent) error {
		return se.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
