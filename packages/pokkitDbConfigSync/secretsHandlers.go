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
	if !getIsSecretsSyncSetupComplete(e.App) {
		return e.Next()
	}

	secretsCollection, err := e.App.FindCollectionByNameOrId(secretsCollectionName)
	if err != nil {
		log.Fatalf("failed to e.App.FindCollectionByNameOrId(secretsCollectionName) in onSecretRecordChangeWriteSecretsToSecretsFileHandler: %v", err)
	}
	err = writeSecretsToSecretsFile(e.App, secretsCollection)
	if err != nil {
		log.Fatalf("failed to writeSecretsToSecretsFile in onSecretRecordChangeWriteSecretsToSecretsFileHandler: %v", err)
	}
	return e.Next()
}

func onServeSetIsSecretsSyncSetupCompleteHandler(e *pbCore.ServeEvent) error {
	setIsSecretsSyncSetupComplete(e.App, true)
	return e.Next()
}
