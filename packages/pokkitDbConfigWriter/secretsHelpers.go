package pokkitDbConfigWriter

import (
	"fmt"
	"os"

	pbCore "github.com/pocketbase/pocketbase/core"
	"github.com/robMolloy/pokkit-turborepo/apps/pokkit-deployer-db/src/utils"
)

func ImportEnvVarsFromSecretsFile(app pbCore.App) error {
	configDirPath := GetConfigDirPath(app)
	secretsFilePath := configDirPath + "/" + SecretsFileName

	obj, err := utils.ReadJsonFromFile(secretsFilePath)
	if err != nil {
		return fmt.Errorf("cannot read json from %s: %w", secretsFilePath, err)
	}

	for key, value := range obj {
		strValue := fmt.Sprintf("%v", value)
		os.Setenv(key, strValue)
	}

	return nil
}

func OnServeImportEnvVarsFromSecretsFileHandler(se *pbCore.ServeEvent) error {
	err := ImportEnvVarsFromSecretsFile(se.App)
	if err != nil {
		se.App.Logger().Error("ImportEnvVarsFromSecretsFile", "err", err)
	}

	return se.Next()
}

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
