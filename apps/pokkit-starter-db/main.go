package main

import (
	"log"

	pokkitDbConfigWriter "github.com/robMolloy/pokkit-turborepo/packages/pokkitDbConfigWriter"

	pocketbase "github.com/pocketbase/pocketbase"
	pbCore "github.com/pocketbase/pocketbase/core"
)

func main() {
	app := pocketbase.New()
	// asdasd
	pokkitDbConfigWriter.BindFunctions(app)

	app.OnServe().BindFunc(func(se *pbCore.ServeEvent) error {
		return se.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
