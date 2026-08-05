package pokkitDbConfigSync

import (
	pbCore "github.com/pocketbase/pocketbase/core"
)

var ConfigDirName = "pb_config"
var CollectionsFileName = "collections.json"
var SettingsFileName = "settings.json"
var SecretsFileName = "secrets.json"
var GetConfigDirPath = func(app pbCore.App) string {
	return app.DataDir() + "/../" + ConfigDirName
}

var isSetupCompleteStoreKey = "isSetupComplete"

func getIsSetupComplete(app pbCore.App) bool {
	return app.Store().Get(isSetupCompleteStoreKey).(bool)
}
func setIsSetupComplete(app pbCore.App, isSetupComplete bool) {
	app.Store().Set(isSetupCompleteStoreKey, isSetupComplete)
}

func onServeSetIsSetupCompleteHandler(e *pbCore.ServeEvent) error {
	setIsSetupComplete(e.App, true)
	return e.Next()
}
