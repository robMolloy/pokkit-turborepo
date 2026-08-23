package main

import (
	"log"

	pocketbase "github.com/pocketbase/pocketbase"
	pbCore "github.com/pocketbase/pocketbase/core"
	"github.com/robMolloy/pokkit-turborepo/packages/pokkitDbBlog"
	"github.com/robMolloy/pokkit-turborepo/packages/pokkitDbConfigSync"
	"github.com/robMolloy/pokkit-turborepo/packages/pokkitDbDeployer"
	"github.com/robMolloy/pokkit-turborepo/packages/pokkitDbPermissions"
)

func main() {
	app := pocketbase.New()

	pokkitDbConfigSync.BindFunctions(app)
	pokkitDbPermissions.BindFunctions(app)
	pokkitDbBlog.BindFunctions(app)
	pokkitDbDeployer.BindFunctions(app)

	app.OnServe().BindFunc(func(se *pbCore.ServeEvent) error {
		return se.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
