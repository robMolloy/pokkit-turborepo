package pokkitDbConfigSync

import (
	"os"

	pbCore "github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/hook"
)

func BindFunctions(app pbCore.App) {
	setIsCollectionsSyncSetupComplete(app, false)
	setIsSecretsSyncSetupComplete(app, false)
	setIsSettingsSyncSetupComplete(app, false)

	os.MkdirAll(GetConfigDirPath(app), 0755)

	app.OnServe().BindFunc(onServeSyncCollectionsWithCollectionsFileHandler)
	app.OnCollectionAfterCreateSuccess().BindFunc(onCollectionChangeWriteCollectionsToFileHandler)
	app.OnCollectionAfterUpdateSuccess().BindFunc(onCollectionChangeWriteCollectionsToFileHandler)
	app.OnCollectionAfterDeleteSuccess().BindFunc(onCollectionChangeWriteCollectionsToFileHandler)

	app.OnServe().BindFunc(onServeSyncSecretsWithSecretsFileHandler)
	app.OnRecordAfterCreateSuccess(secretsCollectionName).BindFunc(onSecretRecordChangeWriteSecretsToSecretsFileHandler)
	app.OnRecordAfterUpdateSuccess(secretsCollectionName).BindFunc(onSecretRecordChangeWriteSecretsToSecretsFileHandler)
	app.OnRecordAfterDeleteSuccess(secretsCollectionName).BindFunc(onSecretRecordChangeWriteSecretsToSecretsFileHandler)

	app.OnServe().BindFunc(onServeSyncSettingsHandler)
	app.OnSettingsUpdateRequest().BindFunc(onSettingsChangeWriteSettingsToSettingsFileHandler)

	// Set is setup complete flags after all other handlers have run.
	app.OnServe().Bind(&hook.Handler[*pbCore.ServeEvent]{
		Func:     onServeSetIsCollectionsSyncSetupCompleteHandler,
		Priority: 1001,
	})
	app.OnServe().Bind(&hook.Handler[*pbCore.ServeEvent]{
		Func:     onServeSetIsSecretsSyncSetupCompleteHandler,
		Priority: 1002,
	})
	app.OnServe().Bind(&hook.Handler[*pbCore.ServeEvent]{
		Func:     onServeSetIsSettingsSyncSetupCompleteHandler,
		Priority: 1003,
	})
}
