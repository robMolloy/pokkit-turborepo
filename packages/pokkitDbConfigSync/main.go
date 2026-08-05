package pokkitDbConfigSync

import (
	"os"

	pbCore "github.com/pocketbase/pocketbase/core"
)

func BindFunctions(app pbCore.App) {
	setIsCollectionsSyncSetupComplete(app, false)
	setIsSecretsSyncSetupComplete(app, false)
	setIsSettingsSyncSetupComplete(app, false)

	configDirPath := GetConfigDirPath(app)
	os.MkdirAll(configDirPath, 0755)

	app.OnServe().BindFunc(onServeSyncCollectionsWithCollectionsFileHandler)
	app.OnServe().BindFunc(func(e *pbCore.ServeEvent) error {
		setIsCollectionsSyncSetupComplete(e.App, true)
		return e.Next()
	})
	app.OnCollectionAfterCreateSuccess().BindFunc(onCollectionChangeWriteCollectionsToFileHandler)
	app.OnCollectionAfterUpdateSuccess().BindFunc(onCollectionChangeWriteCollectionsToFileHandler)
	app.OnCollectionAfterDeleteSuccess().BindFunc(onCollectionChangeWriteCollectionsToFileHandler)

	app.OnServe().BindFunc(onServeSyncSecretsWithSecretsFileHandler)
	app.OnServe().BindFunc(func(e *pbCore.ServeEvent) error {
		setIsSecretsSyncSetupComplete(e.App, true)
		return e.Next()
	})

	app.OnRecordAfterCreateSuccess(secretsCollectionName).BindFunc(onSecretRecordChangeWriteSecretsToSecretsFileHandler)
	app.OnRecordAfterUpdateSuccess(secretsCollectionName).BindFunc(onSecretRecordChangeWriteSecretsToSecretsFileHandler)
	app.OnRecordAfterDeleteSuccess(secretsCollectionName).BindFunc(onSecretRecordChangeWriteSecretsToSecretsFileHandler)

	app.OnServe().BindFunc(onServeSyncSettingsHandler)
	app.OnServe().BindFunc(func(e *pbCore.ServeEvent) error {
		setIsSettingsSyncSetupComplete(e.App, true)
		return e.Next()
	})
	app.OnSettingsUpdateRequest().BindFunc(onSettingsChangeWriteSettingsToSettingsFileHandler)

}
