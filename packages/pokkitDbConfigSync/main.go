package pokkitDbConfigSync

import (
	"os"

	pbCore "github.com/pocketbase/pocketbase/core"
)

func BindFunctions(app pbCore.App) {
	setIsCollectionsSyncSetupComplete(app, false)
	setIsSecretsSyncSetupComplete(app, false)
	setIsSettingsSyncSetupComplete(app, false)

	os.MkdirAll(GetConfigDirPath(app), 0755)

	app.OnServe().BindFunc(onServeSyncCollectionsWithCollectionsFileHandler)
	app.OnServe().BindFunc(onServeSetIsCollectionsSyncSetupCompleteHandler)
	app.OnCollectionAfterCreateSuccess().BindFunc(onCollectionChangeWriteCollectionsToFileHandler)
	app.OnCollectionAfterUpdateSuccess().BindFunc(onCollectionChangeWriteCollectionsToFileHandler)
	app.OnCollectionAfterDeleteSuccess().BindFunc(onCollectionChangeWriteCollectionsToFileHandler)

	app.OnServe().BindFunc(onServeSyncSecretsWithSecretsFileHandler)
	app.OnServe().BindFunc(onServeSetIsSecretsSyncSetupCompleteHandler)
	app.OnRecordAfterCreateSuccess(secretsCollectionName).BindFunc(onSecretRecordChangeWriteSecretsToSecretsFileHandler)
	app.OnRecordAfterUpdateSuccess(secretsCollectionName).BindFunc(onSecretRecordChangeWriteSecretsToSecretsFileHandler)
	app.OnRecordAfterDeleteSuccess(secretsCollectionName).BindFunc(onSecretRecordChangeWriteSecretsToSecretsFileHandler)

	app.OnServe().BindFunc(onServeSyncSettingsHandler)
	app.OnServe().BindFunc(onServeSetIsSettingsSyncSetupCompleteHandler)
	app.OnSettingsUpdateRequest().BindFunc(onSettingsChangeWriteSettingsToSettingsFileHandler)

}
