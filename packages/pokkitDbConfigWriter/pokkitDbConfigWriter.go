package pokkitDbConfigWriter

import (
	"fmt"
	"os"
	"path/filepath"

	pbCore "github.com/pocketbase/pocketbase/core"
)

var collectionsFileName = "collections.json"
var secretsFileName = "secrets.json"

func CreateConfigDirPath(app pbCore.App) string {
	configDirPath := fmt.Sprintf("%s/%s", app.DataDir(), "../pb_config")
	return configDirPath
}

// WriteCollectionsToCollectionsFile writes collections to pb_data/collections.json.
// If successful, true is returned.
// If this file doesn't exist, a boolean of false is returned.
func WriteCollectionsToCollectionsFile(app pbCore.App) (bool, error) {
	configDirPath := CreateConfigDirPath(app)
	// collectionsFilePath := configDirPath + "/" + collectionsFileName
	err := os.MkdirAll(filepath.Dir(app.DataDir()+"/"+"asda"), 0755)
	fmt.Println(configDirPath)

	err = os.MkdirAll(filepath.Dir(configDirPath), 0755)

	if err != nil {
		return false, fmt.Errorf("failed to create directory: %w", err)
	}
	fmt.Println(err)
	// if err := os.MkdirAll(filepath.Dir(configDirPath), 0755); err != nil {
	// 	return false, fmt.Errorf("failed to create directory: %w", err)
	// }

	return true, err
}

// 	collectionsData, err := app.FindAllCollections()
// 	if err != nil {
// 		return false, err
// 	}

// 	err = pokkitDbUtils.WriteDataToFileAsJson(collectionsFilePath, collectionsData)

// 	return err == nil, err
// }

// func SaveSecretsJsonAsEnvVars(app pbCore.App) error {
// 	configDirPath := CreateConfigDirPath(app)
// 	secretsFilePath := fmt.Sprintf("%s/%s", configDirPath, secretsFileName)

// 	obj, err := utils.ReadJsonFromFile(secretsFilePath)
// 	if err != nil {
// 		return err
// 	}

// 	for key, value := range obj {
// 		strValue := fmt.Sprintf("%v", value)
// 		os.Setenv(key, strValue)
// 	}

// 	return nil
// }

// func ImportSettingsFromSettingsFile(app pbCore.App) (bool, error) {
// 	fileName := "settings.json"
// 	filePath := fmt.Sprintf("%s/%s", app.DataDir(), fileName)

// 	isExist := utils.FileExists(filePath)
// 	if !isExist {
// 		return false, nil
// 	}

// 	// File definitely exists, this will only fail with an error that should be logged
// 	settingsData, err := os.ReadFile(filePath)
// 	if err != nil {
// 		return false, err
// 	}

// 	settings := app.Settings()
// 	unmarshalErr := json.Unmarshal(settingsData, settings)
// 	if unmarshalErr != nil {
// 		return false, unmarshalErr
// 	}
// 	app.Save(settings)

// 	return true, nil
// }

// // ImportCollectionsFromCollectionsFile imports collections from pb_data/collections.json.
// // If successful, true is returned.
// // If this file doesn't exist, a boolean of false is returned.
// func ImportCollectionsFromCollectionsFile(app pbCore.App) (bool, error) {
// 	configDirPath := CreateConfigDirPath(app)
// 	collectionsFilePath := configDirPath + "/" + collectionsFileName

// 	isExist := utils.FileExists(collectionsFilePath)
// 	if !isExist {
// 		return false, nil
// 	}

// 	// File definitely exists, this will only fail with an error that should be logged
// 	collectionsData, err := os.ReadFile(collectionsFilePath)
// 	if err != nil {
// 		return false, err
// 	}

// 	err = app.ImportCollectionsByMarshaledJSON(collectionsData, false)
// 	if err != nil {
// 		return false, err
// 	}

// 	return true, nil
// }

// func WriteSettingsToSettingsFileOnSettingsReloadEventHandler(e *pbCore.SettingsReloadEvent) error {
// 	e.App.Logger().Info("OnSettingsReload")
// 	if err := e.Next(); err != nil {
// 		return err
// 	}

// 	isSetupComplete := e.App.Store().Get("isSetupComplete").(bool)
// 	if isSetupComplete {
// 		writeErr := utils.WriteDataToFileAsJson(e.App.DataDir()+"/settings.json", e.App.Settings())
// 		if writeErr != nil {
// 			e.App.Logger().Error("Error when writing to settings.json")
// 		}
// 	}

// 	e.App.Logger().Info("OnSettingsReload - after")
// 	return nil
// }

// func WriteCollectionsToCollectionsFileAfterCollectionChangeEventHandler(e *pbCore.CollectionEvent) error {
// 	e.App.Logger().Info("OnCollectionAfterDeleteSuccess")
// 	e.Next()

// 	isSetupComplete := e.App.Store().Get("isSetupComplete").(bool)
// 	if isSetupComplete {
// 		_, writeErr := WriteCollectionsToCollectionsFile(e.App)
// 		if writeErr != nil {
// 			e.App.Logger().Error("Error when writing to collections.json", "writeErr", writeErr)
// 		}
// 	}

// 	return nil
// }

// func SetupCollectionsSettingsAndEnvVarsOnServe(se *pbCore.ServeEvent) error {
// 	resp, err := ImportCollectionsFromCollectionsFile(se.App)
// 	se.App.Logger().Info("ImportCollectionsFromCollectionsFilePath", "resp", resp, "err", err)

// 	resp, err = ImportSettingsFromSettingsFile(se.App)
// 	se.App.Logger().Info("ImportSettingsFromSettingsFilePath", "resp", resp, "err", err)

// 	err = SaveSecretsJsonAsEnvVars(se.App)
// 	se.App.Logger().Info("SaveSecretsJsonAsEnvVars", "err", err)

// 	se.Next()

// 	se.App.Store().Set("isSetupComplete", true)

// 	se.App.Logger().Info("Setup complete.")
// 	return nil
// }

func Setup(se *pbCore.ServeEvent) error {
	_, _ = WriteCollectionsToCollectionsFile(se.App)
	return se.Next()

}

func BindFunctions(app pbCore.App) {
	app.Store().Set("isSetupComplete", false)
	app.OnServe().BindFunc(Setup)
}
