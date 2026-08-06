package pokkitDbConfigSync

import (
	"os"

	pbCore "github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/hook"
)

func BindFunctions(app pbCore.App) {
	setIsSetupComplete(app, false)

	os.MkdirAll(GetConfigDirPath(app), 0755)

	app.OnServe().BindFunc(onServeImportCollectionsFromCollectionsFileHandler)
	app.OnCollectionAfterCreateSuccess().BindFunc(onCollectionChangeWriteCollectionsToFileHandler)
	app.OnCollectionAfterUpdateSuccess().BindFunc(onCollectionChangeWriteCollectionsToFileHandler)
	app.OnCollectionAfterDeleteSuccess().BindFunc(onCollectionChangeWriteCollectionsToFileHandler)

	app.OnServe().BindFunc(onServeSyncSecretsWithSecretsFileHandler)
	// app.OnServe().BindFunc(onServePopulateSecretsCollectionWithSecretsFileHandler)
	app.OnRecordAfterCreateSuccess(secretsCollectionName).BindFunc(onSecretRecordChangeWriteSecretsToSecretsFileHandler)
	app.OnRecordAfterUpdateSuccess(secretsCollectionName).BindFunc(onSecretRecordChangeWriteSecretsToSecretsFileHandler)
	app.OnRecordAfterDeleteSuccess(secretsCollectionName).BindFunc(onSecretRecordChangeWriteSecretsToSecretsFileHandler)

	app.OnServe().BindFunc(onServeSyncSettingsHandler)
	app.OnSettingsUpdateRequest().BindFunc(onSettingsChangeWriteSettingsToSettingsFileHandler)

	// Set is setup complete flag after all other handlers have run.
	app.OnServe().Bind(&hook.Handler[*pbCore.ServeEvent]{Func: onServeSetIsSetupCompleteHandler, Priority: 1001})

	app.OnServe().Bind(&hook.Handler[*pbCore.ServeEvent]{Func: onServeWriteCollectionsToCollectionsFileIfNotSameHandler, Priority: 1002})
	app.OnServe().Bind(&hook.Handler[*pbCore.ServeEvent]{Func: onServeWriteSettingsToSettingsFileHandler, Priority: 1003})
	// app.OnServe().Bind(&hook.Handler[*pbCore.ServeEvent]{Func: onServeWriteSecretsToSecretsFileHandler, Priority: 1004})
}
