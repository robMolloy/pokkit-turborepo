package pokkitSetup

import (
	"encoding/json"
	"fmt"
	"os"

	pbCore "github.com/pocketbase/pocketbase/core"
	"github.com/robMolloy/pokkit-turborepo/apps/pokkit-deployer-db/src/utils"
)

// WriteCollectionsToCollectionsFile writes collections to pb_data/collections.json.
// If successful, true is returned.
// If this file doesn't exist, a boolean of false is returned.
func WriteCollectionsToCollectionsFile(app pbCore.App) (bool, error) {
	collectionsFileName := "collections.json"
	collectionsFilePath := fmt.Sprintf("%s/%s", app.DataDir(), collectionsFileName)

	collectionsData, err := app.FindAllCollections()
	if err != nil {
		return false, err
	}

	err = utils.WriteDataToFileAsJson(collectionsFilePath, collectionsData)

	return err == nil, err
}

func SaveSecretsJsonAsEnvVars(app pbCore.App) error {
	fileName := "secrets.json"
	filePath := fmt.Sprintf("%s/%s", app.DataDir(), fileName)
	obj, err := utils.ReadJsonFromFile(filePath)
	if err != nil {
		return err
	}

	for key, value := range obj {
		strValue := fmt.Sprintf("%v", value)
		os.Setenv(key, strValue)
	}

	return nil
}

func ImportSettingsFromSettingsFile(app pbCore.App) (bool, error) {
	fileName := "settings.json"
	filePath := fmt.Sprintf("%s/%s", app.DataDir(), fileName)

	isExist := utils.FileExists(filePath)
	if !isExist {
		return false, nil
	}

	// File definitely exists, this will only fail with an error that should be logged
	settingsData, err := os.ReadFile(filePath)
	if err != nil {
		return false, err
	}

	settings := app.Settings()
	unmarshalErr := json.Unmarshal(settingsData, settings)
	if unmarshalErr != nil {
		return false, unmarshalErr
	}
	app.Save(settings)

	return true, nil
}

// ImportCollectionsFromCollectionsFile imports collections from pb_data/collections.json.
// If successful, true is returned.
// If this file doesn't exist, a boolean of false is returned.
func ImportCollectionsFromCollectionsFile(app pbCore.App) (bool, error) {
	collectionsFileName := "collections.json"
	collectionsFilePath := fmt.Sprintf("%s/%s", app.DataDir(), collectionsFileName)

	isExist := utils.FileExists(collectionsFilePath)
	if !isExist {
		return false, nil
	}

	// File definitely exists, this will only fail with an error that should be logged
	collectionsData, err := os.ReadFile(collectionsFilePath)
	if err != nil {
		return false, err
	}

	err = app.ImportCollectionsByMarshaledJSON(collectionsData, false)
	if err != nil {
		return false, err
	}

	return true, nil
}

func WriteSettingsToSettingsFileOnSettingsReloadEventHandler(e *pbCore.SettingsReloadEvent) error {
	fmt.Println("OnSettingsReload")
	if err := e.Next(); err != nil {
		return err
	}

	isSetupComplete := e.App.Store().Get("isSetupComplete").(bool)
	if isSetupComplete {
		writeErr := utils.WriteDataToFileAsJson(e.App.DataDir()+"/settings.json", e.App.Settings())
		if writeErr != nil {
			e.App.Logger().Error("Error when writing to settings.json")
		}
	}

	fmt.Println("OnSettingsReload - after")
	return nil
}

func WriteCollectionsToCollectionsFileAfterCollectionChangeEventHandler(e *pbCore.CollectionEvent) error {
	fmt.Println("OnCollectionAfterDeleteSuccess")
	e.Next()

	isSetupComplete := e.App.Store().Get("isSetupComplete").(bool)
	if isSetupComplete {
		_, writeErr := WriteCollectionsToCollectionsFile(e.App)
		if writeErr != nil {
			e.App.Logger().Error("Error when writing to collections.json", "writeErr", writeErr)
		}
	}

	return nil
}

func SetupCollectionsSettingsAndEnvVarsOnServe(se *pbCore.ServeEvent) error {
	resp, err := ImportCollectionsFromCollectionsFile(se.App)
	fmt.Println("ImportCollectionsFromCollectionsFilePath", resp, err)

	resp, err = ImportSettingsFromSettingsFile(se.App)
	fmt.Println("ImportSettingsFromSettingsFilePath", resp, err)

	err = SaveSecretsJsonAsEnvVars(se.App)
	fmt.Println("SaveSecretsJsonAsEnvVars", err)

	se.Next()

	se.App.Store().Set("isSetupComplete", true)

	fmt.Println("Setup complete.")
	return nil
}
