package pokkitDbConfigSync

import (
	"errors"
	"fmt"
	"os"

	pbCore "github.com/pocketbase/pocketbase/core"
	"github.com/robMolloy/pokkit-turborepo/apps/pokkit-deployer-db/src/utils"
)

const secretsCollectionName = "_pb_config_secrets"

func replaceSecretsCollection(app pbCore.App) (*pbCore.Collection, error) {
	existingSecretsCollection, err := app.FindCollectionByNameOrId(secretsCollectionName)
	if existingSecretsCollection != nil {
		err = app.Delete(existingSecretsCollection)
		if err != nil {
			return nil, fmt.Errorf("error deleting collection _pb_config_secrets in ReplaceSecretsCollectionFromSecretsFile: %w", err)
		}
	}

	secretsCollection, err := createSecretsCollection(app)
	if err != nil {
		return nil, fmt.Errorf("error creating collection _pb_config_secrets in ReplaceSecretsCollectionFromSecretsFile: %w", err)
	}

	return secretsCollection, nil
}

func createSecretsCollection(app pbCore.App) (*pbCore.Collection, error) {
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

func populateSecretsCollectionWithSecretsFile(app pbCore.App) (err error) {
	configDirPath := GetConfigDirPath(app)
	secretsFilePath := configDirPath + "/" + SecretsFileName

	secretsCollection, err := app.FindCollectionByNameOrId(secretsCollectionName)
	if err != nil {
		return fmt.Errorf("error finding collection _pb_config_secrets in PopulateSecretsCollectionWithSecretsFile: %w", err)
	}

	obj, err := utils.ReadJsonFromFile(secretsFilePath)
	if err != nil {
		return fmt.Errorf("cannot read json from %s in populateSecretsCollectionWithSecretsFile: %w", secretsFilePath, err)
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

func writeSecretsCollectionToSecretsFile(app pbCore.App) error {
	configDirPath := GetConfigDirPath(app)
	secretsFilePath := configDirPath + "/" + SecretsFileName

	secretsCollection, err := app.FindCollectionByNameOrId(secretsCollectionName)
	if err != nil {
		return fmt.Errorf("error finding collection _pb_config_secrets in WriteSecretsCollectionToSecretsFile: %w", err)
	}

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

func syncSecretsWithSecretsFile(app pbCore.App) (err error) {
	_, err = replaceSecretsCollection(app)
	if err != nil {
		return fmt.Errorf("error replaceSecretsCollection in SyncSecretsWithSecretsFile: %w", err)
	}

	err = populateSecretsCollectionWithSecretsFile(app)
	noSecretsFileExists := errors.Is(err, os.ErrNotExist)
	if err != nil && !noSecretsFileExists {
		return fmt.Errorf("error populateSecretsCollectionWithSecretsFile in SyncSecretsWithSecretsFile: %w", err)
	}

	return nil
}
