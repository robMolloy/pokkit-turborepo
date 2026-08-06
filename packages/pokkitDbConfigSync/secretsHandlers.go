package pokkitDbConfigSync

import (
	"log"

	pbCore "github.com/pocketbase/pocketbase/core"
)

func onServeSyncSecretsWithSecretsFileHandler(se *pbCore.ServeEvent) error {
	err := syncSecretsWithSecretsFile(se.App)
	if err != nil {
		log.Fatalf("failed to SyncSecretsWithSecretsFile in OnServeImportEnvVarsFromSecretsFileHandler: %v", err)
	}

	return se.Next()
}

func onSecretRecordChangeWriteSecretsToSecretsFileHandler(e *pbCore.RecordEvent) error {
	if !getIsSetupComplete(e.App) {
		return e.Next()
	}

	err := writeSecretsCollectionToSecretsFile(e.App)
	if err != nil {
		log.Fatalf("failed to writeSecretsCollectionToSecretsFile in onSecretRecordChangeWriteSecretsToSecretsFileHandler: %v", err)
	}
	return e.Next()
}

func onServeWriteSecretsCollectionToSecretsFileHandler(se *pbCore.ServeEvent) error {
	err := writeSecretsCollectionToSecretsFile(se.App)
	if err != nil {
		log.Fatalf("failed to writeSecretsCollectionToSecretsFile in onServeWriteSecretsCollectionToSecretsFileHandler: %v", err)
	}
	return se.Next()
}
