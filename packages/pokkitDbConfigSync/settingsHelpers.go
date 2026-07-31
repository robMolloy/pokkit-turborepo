package pokkitDbConfigSync

import (
	"fmt"
	"log"

	pbCore "github.com/pocketbase/pocketbase/core"
	"github.com/robMolloy/pokkit-turborepo/apps/pokkit-deployer-db/src/utils"
	pokkitDbUtils "github.com/robMolloy/pokkit-turborepo/packages/pokkit-db-utils"
)

var isSettingsSyncSetupCompleteStoreKey = "isSettingsSyncSetupComplete"

func GetIsSettingsSyncSetupComplete(app pbCore.App) bool {
	return app.Store().Get(isSettingsSyncSetupCompleteStoreKey).(bool)
}
func SetIsSettingsSyncSetupComplete(app pbCore.App, isSettingsSyncSetupComplete bool) {
	app.Store().Set(isSettingsSyncSetupCompleteStoreKey, isSettingsSyncSetupComplete)
}

// ImportCollectionsFromCollectionsFile imports collections from pb_data/collections.json.
// If successful, true is returned.
// If this file doesn't exist, a boolean of false is returned.
func ImportSettingsFromSettingsFile(app pbCore.App) (bool, error) {
	configDirPath := GetConfigDirPath(app)
	settingsFilePath := configDirPath + "/" + SettingsFileName

	isExist := utils.FileExists(settingsFilePath)
	if !isExist {
		return false, nil
	}

	// File definitely exists, this will only fail with an error that should be logged
	settingsData, err := utils.ReadJsonFromFileGeneric[*pbCore.Settings](settingsFilePath)
	if err != nil {
		return false, err
	}

	err = app.Settings().Merge(settingsData)
	if err != nil {
		return false, err
	}

	return true, nil
}

// WriteSettingsToSettingsFile writes settings to pb_data/settings.json.
// If successful, true is returned.
// If this file doesn't exist, a boolean of false is returned.
func WriteSettingsToSettingsFile(app pbCore.App) error {
	configDirPath := GetConfigDirPath(app)
	settingsFilePath := configDirPath + "/" + SettingsFileName

	settingsData := app.Settings()

	err := pokkitDbUtils.WriteDataToFileAsJson(settingsFilePath, settingsData)
	if err != nil {
		return fmt.Errorf("failed to WriteDataToFileAsJson: %w", err)
	}
	return err
}

// WriteContentToSettingsFile writes settings to pb_data/settings.json.
// If successful, true is returned.
// If this file doesn't exist, a boolean of false is returned.
func WriteContentToSettingsFile(app pbCore.App, settingsData *pbCore.Settings) error {
	configDirPath := GetConfigDirPath(app)
	settingsFilePath := configDirPath + "/" + SettingsFileName

	err := pokkitDbUtils.WriteDataToFileAsJson(settingsFilePath, settingsData)
	if err != nil {
		return fmt.Errorf("failed to WriteDataToFileAsJson: %w", err)
	}
	return err
}

func SyncSettingsWithSettingsFile(app pbCore.App) error {
	didImport, err := ImportSettingsFromSettingsFile(app)
	if err != nil {
		return fmt.Errorf("failed to ImportSettingsFromSettingsFile %w", err)
	}
	if didImport == false {
		err = WriteSettingsToSettingsFile(app)
	}

	if err != nil {
		return fmt.Errorf("failed to SyncCollectionsWithCollectionsFile %w", err)
	}

	return nil
}

func ImportThenWriteSettingsToSettingsFile(app pbCore.App) error {
	_, err := ImportSettingsFromSettingsFile(app)
	if err != nil {
		return fmt.Errorf("failed to ImportSettingsFromSettingsFile in ImportThenWriteSettingsToSettingsFile %w", err)
	}
	err = WriteSettingsToSettingsFile(app)
	if err != nil {
		return fmt.Errorf("failed to WriteSettingsToSettingsFile in ImportThenWriteSettingsToSettingsFile %w", err)
	}

	return nil
}

func OnServeSyncSettingsHandler(se *pbCore.ServeEvent) error {
	err := ImportThenWriteSettingsToSettingsFile(se.App)

	if err != nil {
		log.Fatal("failed to ImportSettingsFromSettingsFile in ImportThenWriteSettingsToSettingsFile %w", err)
	}

	return se.Next()
}

func OnSettingsChangeWriteSettingsToSettingsFileHandler(e *pbCore.SettingsUpdateRequestEvent) error {
	isSettingsSyncSetupComplete := GetIsSettingsSyncSetupComplete(e.App)
	if !isSettingsSyncSetupComplete {
		return e.Next()
	}

	err := WriteContentToSettingsFile(e.App, e.NewSettings)
	if err != nil {
		log.Fatal(err)
	}
	return e.Next()

}
