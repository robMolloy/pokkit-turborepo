package pokkitDbConfigWriter

import (
	pbCore "github.com/pocketbase/pocketbase/core"
)

var ConfigDirName = "pb_config"
var CollectionsFileName = "collections.json"
var SecretsFileName = "secrets.json"
var GetConfigDirPath = func(app pbCore.App) string {
	return app.DataDir() + "/../" + ConfigDirName
}
