package pokkitDbConfigSync

import (
	"log"

	pbCore "github.com/pocketbase/pocketbase/core"
)

func onServeReplaceThenPopulateSecretsCollectionWithSecretsFile(se *pbCore.ServeEvent) error {
	err := replaceThenPopulateSecretsCollectionWithSecretsFile(se.App)
	if err != nil {
		log.Fatalf("failed to replaceThenPopulateSecretsCollectionWithSecretsFile in onServeReplaceThenPopulateSecretsCollectionWithSecretsFile: %v", err)
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
