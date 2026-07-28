package pokkitDbConfigWriter

import (
	"encoding/json"
	"os"

	pbCore "github.com/pocketbase/pocketbase/core"
	"github.com/robMolloy/pokkit-turborepo/apps/pokkit-deployer-db/src/utils"
)

func ImportSettingsFromSettingsFile(app pbCore.App) (bool, error) {
	configDirPath := GetConfigDirPath(app)
	settingsFilePath := configDirPath + "/" + SettingsFileName

	isExist := utils.FileExists(settingsFilePath)
	if !isExist {
		return false, nil
	}

	// File definitely exists, this will only fail with an error that should be logged
	settingsData, readFileErr := os.ReadFile(settingsFilePath)
	if readFileErr != nil {
		return false, readFileErr
	}

	settings := app.Settings()
	unmarshalErr := json.Unmarshal(settingsData, settings)
	if unmarshalErr != nil {
		return false, unmarshalErr
	}

	saveSettingsError := app.Save(settings)
	if saveSettingsError != nil {
		return false, saveSettingsError
	}

	return true, nil
}

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
