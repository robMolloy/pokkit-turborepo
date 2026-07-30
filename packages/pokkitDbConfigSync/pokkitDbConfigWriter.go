package pokkitDbConfigSync

import (
	"os"

	"github.com/pocketbase/pocketbase/core"
	pbCore "github.com/pocketbase/pocketbase/core"
)

func BindFunctions(app pbCore.App) {
	SetIsCollectionsSyncSetupComplete(app, false)
	SetIsSecretsSyncSetupComplete(app, false)
	SetIsSettingsSyncSetupComplete(app, false)

	configDirPath := GetConfigDirPath(app)
	os.MkdirAll(configDirPath, 0755)

	app.OnServe().BindFunc(OnServeSyncCollectionsWithCollectionsFileHandler)
	app.OnServe().BindFunc(func(e *pbCore.ServeEvent) error {
		SetIsCollectionsSyncSetupComplete(e.App, true)
		return e.Next()
	})
	app.OnCollectionAfterCreateSuccess().BindFunc(OnCollectionChangeWriteCollectionsToFileHandler)
	app.OnCollectionAfterUpdateSuccess().BindFunc(OnCollectionChangeWriteCollectionsToFileHandler)
	app.OnCollectionAfterDeleteSuccess().BindFunc(OnCollectionChangeWriteCollectionsToFileHandler)

	app.OnServe().BindFunc(OnServeSyncSecretsWithSecretsFileHandler)
	app.OnServe().BindFunc(func(e *pbCore.ServeEvent) error {
		SetIsSecretsSyncSetupComplete(e.App, true)
		return e.Next()
	})

	app.OnRecordAfterCreateSuccess(secretsCollectionName).BindFunc(func(e *core.RecordEvent) error {
		secretsCollection, err := e.App.FindCollectionByNameOrId(secretsCollectionName)
		if err != nil {
			e.App.Logger().Error("error finding collection _pb_config_secrets in OnRecordAfterCreateSuccess", "err", err)
			return e.Next()
		}
		err = WriteSecretsToSecretsFile(e.App, secretsCollection)
		if err != nil {
			e.App.Logger().Error("error WriteSecretsToSecretsFile in OnRecordAfterCreateSuccess", "err", err)
			return e.Next()
		}
		return e.Next()
	})

	app.OnServe().BindFunc(OnServeImportThenWriteSettingsToSettingsFileHandler)
	app.OnServe().BindFunc(func(e *pbCore.ServeEvent) error {
		SetIsSettingsSyncSetupComplete(e.App, true)
		return e.Next()
	})
	app.OnSettingsUpdateRequest().BindFunc(OnSettingsChangeWriteSettingsToSettingsFileHandler)

}
