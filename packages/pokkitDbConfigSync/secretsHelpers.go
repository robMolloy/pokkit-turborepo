package pokkitDbConfigSync

import (
	"errors"
	"fmt"
	"os"

	pbCore "github.com/pocketbase/pocketbase/core"
	"github.com/robMolloy/pokkit-turborepo/apps/pokkit-deployer-db/src/utils"
)

const secretsCollectionName = "_pb_config_secrets"

var isSecretsSyncSetupCompleteStoreKey = "isSecretsSyncSetupComplete"

func GetIsSecretsSyncSetupComplete(app pbCore.App) bool {
	return app.Store().Get(isSecretsSyncSetupCompleteStoreKey).(bool)
}
func SetIsSecretsSyncSetupComplete(app pbCore.App, isSecretsSyncSetupComplete bool) {
	app.Store().Set(isSecretsSyncSetupCompleteStoreKey, isSecretsSyncSetupComplete)
}

func ReplaceSecretsCollection(app pbCore.App) (*pbCore.Collection, error) {
	existingSecretsCollection, err := app.FindCollectionByNameOrId(secretsCollectionName)
	if existingSecretsCollection != nil {
		err = app.Delete(existingSecretsCollection)
		if err != nil {
			return nil, fmt.Errorf("error deleting collection _pb_config_secrets in ReplaceSecretsCollectionFromSecretsFile: %w", err)
		}
	}

	secretsCollection, err := CreateSecretsCollection(app)
	if err != nil {
		return nil, fmt.Errorf("error creating collection _pb_config_secrets in ReplaceSecretsCollectionFromSecretsFile: %w", err)
	}

	return secretsCollection, nil
}

func CreateSecretsCollection(app pbCore.App) (*pbCore.Collection, error) {
	collection := pbCore.NewBaseCollection(secretsCollectionName)
	collection.Fields.Add(&pbCore.TextField{
		Name:     "key",
		Required: true,
	})
	collection.Fields.Add(&pbCore.TextField{
		Name:     "value",
		Required: true,
	})
	collection.Fields.Add(&pbCore.AutodateField{
		Name:     "created",
		OnCreate: true,
		OnUpdate: true,
	})
	collection.Fields.Add(&pbCore.AutodateField{
		Name:     "updated",
		OnCreate: false,
		OnUpdate: true,
	})
	collection.AddIndex("idx_secrets_key", true, "key", "")

	err := app.Save(collection)
	if err != nil {
		return nil, fmt.Errorf("error saving collection _pb_config_secrets in CreateSecretsCollection: %w", err)
	}
	return collection, nil
}

func PopulateSecretsCollectionFromSecretsFile(app pbCore.App, secretsCollection *pbCore.Collection) (err error) {
	configDirPath := GetConfigDirPath(app)
	secretsFilePath := configDirPath + "/" + SecretsFileName

	obj, err := utils.ReadJsonFromFile(secretsFilePath)
	if err != nil {
		return fmt.Errorf("cannot read json from %s: %w", secretsFilePath, err)
	}

	for key, value := range obj {
		strValue := fmt.Sprintf("%v", value)
		newRecord := pbCore.NewRecord(secretsCollection)
		newRecord.Set("key", key)
		newRecord.Set("value", strValue)

		err = app.Save(newRecord)
		if err != nil {
			return fmt.Errorf("error saving record in PopulateSecretsCollectionFromSecretsFile: %w", err)
		}
	}

	return nil
}

func WriteSecretsToSecretsFile(app pbCore.App, secretsCollection *pbCore.Collection) error {
	configDirPath := GetConfigDirPath(app)
	secretsFilePath := configDirPath + "/" + SecretsFileName

	records, err := app.FindAllRecords(secretsCollection)
	if err != nil {
		return fmt.Errorf("error finding all records in WriteSecretsToSecretsFile: %w", err)
	}

	secretsMap := map[string]string{}
	for _, record := range records {
		secretsMap[record.GetString("key")] = record.GetString("value")
	}

	err = utils.WriteDataToFileAsJson(secretsFilePath, secretsMap)
	if err != nil {
		return fmt.Errorf("error writing json to %s: %w", secretsFilePath, err)
	}

	return nil
}

func SyncSecretsWithSecretsFile(app pbCore.App) (err error) {
	secretsCollection, err := ReplaceSecretsCollection(app)

	err = PopulateSecretsCollectionFromSecretsFile(app, secretsCollection)
	noSecretsFileExists := errors.Is(err, os.ErrNotExist)
	if err != nil && !noSecretsFileExists {
		return fmt.Errorf("error WriteSecretsToSecretsFile in SyncSecretsWithSecretsFile: %w", err)
	}

	if noSecretsFileExists {
		err = WriteSecretsToSecretsFile(app, secretsCollection)
	}
	if err != nil {
		return fmt.Errorf("error WriteSecretsToSecretsFile in SyncSecretsWithSecretsFile: %w", err)
	}

	return nil
}
