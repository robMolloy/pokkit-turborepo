package pokkitDbConfigSync

import (
	pbCore "github.com/pocketbase/pocketbase/core"
)

func OnServeSyncSecretsWithSecretsFileHandler(se *pbCore.ServeEvent) error {
	err := SyncSecretsWithSecretsFile(se.App)
	if err != nil {
		se.App.Logger().Error("SyncSecretsWithSecretsFile in OnServeImportEnvVarsFromSecretsFileHandler", "err", err)
	}

	return se.Next()
}
