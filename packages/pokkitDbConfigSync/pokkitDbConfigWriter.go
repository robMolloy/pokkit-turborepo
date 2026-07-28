package pokkitDbConfigSync

import (
	"os"

	pbCore "github.com/pocketbase/pocketbase/core"
)

func BindFunctions(app pbCore.App) {
	app.Store().Set("isSetupComplete", false)

	configDirPath := GetConfigDirPath(app)
	os.MkdirAll(configDirPath, 0755)

	app.OnServe().BindFunc(OnServeSyncCollectionsWithCollectionsFileHandler)

	app.OnServe().BindFunc(OnServeImportEnvVarsFromSecretsFileHandler)

	app.OnServe().BindFunc(func(e *pbCore.ServeEvent) error {
		app.Store().Set("isSetupComplete", true)
		return e.Next()
	})

	app.OnCollectionAfterCreateSuccess().BindFunc(OnCollectionChangeWriteCollectionsToFileHandler)
	app.OnCollectionAfterUpdateSuccess().BindFunc(OnCollectionChangeWriteCollectionsToFileHandler)
	app.OnCollectionAfterDeleteSuccess().BindFunc(OnCollectionChangeWriteCollectionsToFileHandler)
}
