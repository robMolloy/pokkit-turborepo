package pokkitDbConfigWriter

import (
	"fmt"
	"os"

	pbCore "github.com/pocketbase/pocketbase/core"
	"github.com/robMolloy/pokkit-turborepo/apps/pokkit-deployer-db/src/utils"
	pokkitDbUtils "github.com/robMolloy/pokkit-turborepo/packages/pokkit-db-utils"
)

var configDirName = "pb_config"
var collectionsFileName = "collections.json"
var secretsFileName = "secrets.json"
var getConfigDirPath = func(app pbCore.App) string {
	return app.DataDir() + "/../" + configDirName
}

// ImportCollectionsFromCollectionsFile imports collections from pb_data/collections.json.
// If successful, true is returned.
// If this file doesn't exist, a boolean of false is returned.
func ImportCollectionsFromCollectionsFile(app pbCore.App) (bool, error) {
	configDirPath := getConfigDirPath(app)
	collectionsFilePath := configDirPath + "/" + collectionsFileName

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

// WriteCollectionsToCollectionsFile writes collections to pb_data/collections.json.
// If successful, true is returned.
// If this file doesn't exist, a boolean of false is returned.
func WriteCollectionsToCollectionsFile(app pbCore.App) error {
	configDirPath := getConfigDirPath(app)
	err := os.MkdirAll(configDirPath, 0755)

	if err != nil {
		return fmt.Errorf("failed to create configDirPath: %w", err)
	}

	collectionsFilePath := configDirPath + "/" + collectionsFileName
	collectionsData, err := app.FindAllCollections()
	if err != nil {
		return fmt.Errorf("failed to find all collections: %w", err)
	}

	err = pokkitDbUtils.WriteDataToFileAsJson(collectionsFilePath, collectionsData)
	if err != nil {
		return fmt.Errorf("failed to write collections to file: %w", err)
	}
	return err
}

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

func onServeSyncCollectionsWithFile(se *pbCore.ServeEvent) error {
	didImport, err := ImportCollectionsFromCollectionsFile(se.App)
	if err != nil {
		se.App.Logger().Error("ImportCollectionsFromCollectionsFile", "err", err)
	}

	if didImport == true {
		fmt.Println("successfully imported collections from collections.json")
	}
	if didImport == false {
		err = WriteCollectionsToCollectionsFile(se.App)
		if err != nil {
			se.App.Logger().Error("WriteCollectionsToCollectionsFile", "err", err)
		}
	}

	return se.Next()
}

func OnCollectionChangeWriteCollectionsToFile(e *pbCore.CollectionEvent) error {
	isSetupComplete := e.App.Store().Get("isSetupComplete").(bool)
	if !isSetupComplete {
		return e.Next()
	}

	err := WriteCollectionsToCollectionsFile(e.App)
	if err != nil {
		e.App.Logger().Error("WriteCollectionsToCollectionsFile", "err", err)
	}

	return e.Next()
}

func BindFunctions(app pbCore.App) {
	app.Store().Set("isSetupComplete", false)

	app.OnServe().BindFunc(onServeSyncCollectionsWithFile)

	app.OnServe().BindFunc(func(e *pbCore.ServeEvent) error {
		app.Store().Set("isSetupComplete", true)
		return e.Next()
	})

	app.OnCollectionAfterCreateSuccess().BindFunc(OnCollectionChangeWriteCollectionsToFile)
	app.OnCollectionAfterUpdateSuccess().BindFunc(OnCollectionChangeWriteCollectionsToFile)
	app.OnCollectionAfterDeleteSuccess().BindFunc(OnCollectionChangeWriteCollectionsToFile)
}
