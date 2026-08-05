package pokkitDbConfigSync

import (
	"log"

	pbCore "github.com/pocketbase/pocketbase/core"
)

func OnServeSyncSecretsWithSecretsFileHandler(se *pbCore.ServeEvent) error {
	err := SyncSecretsWithSecretsFile(se.App)
	if err != nil {
		log.Fatalf("failed to SyncSecretsWithSecretsFile in OnServeImportEnvVarsFromSecretsFileHandler: %v", err)
	}

	return se.Next()
}
