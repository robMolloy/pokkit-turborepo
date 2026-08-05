package pokkitDbConfigSync

import (
	"errors"
	"fmt"
	"os"

	pbCore "github.com/pocketbase/pocketbase/core"
	"github.com/robMolloy/pokkit-turborepo/apps/pokkit-deployer-db/src/utils"
	pokkitDbUtils "github.com/robMolloy/pokkit-turborepo/packages/pokkit-db-utils"
)

var isSettingsSyncSetupCompleteStoreKey = "isSettingsSyncSetupComplete"

func getIsSettingsSyncSetupComplete(app pbCore.App) bool {
	return app.Store().Get(isSettingsSyncSetupCompleteStoreKey).(bool)
}
func setIsSettingsSyncSetupComplete(app pbCore.App, isSettingsSyncSetupComplete bool) {
	app.Store().Set(isSettingsSyncSetupCompleteStoreKey, isSettingsSyncSetupComplete)
}

// importCollectionsFromCollectionsFile imports collections from pb_data/collections.json.
// If successful, true is returned.
// If this file doesn't exist, a boolean of false is returned.
func importSettingsFromSettingsFile(app pbCore.App) error {
	configDirPath := GetConfigDirPath(app)
	settingsFilePath := configDirPath + "/" + SettingsFileName

	// File definitely exists, this will only fail with an error that should be logged
	settingsData, err := utils.ReadJsonFromFileGeneric[*pbCore.Settings](settingsFilePath)
	if err != nil {
		return err
	}

	err = app.Settings().Merge(settingsData)
	if err != nil {
		return err
	}

	return nil
}

// writeSettingsToSettingsFile writes settings to pb_data/settings.json.
// If successful, true is returned.
// If this file doesn't exist, a boolean of false is returned.
func writeSettingsToSettingsFile(app pbCore.App) error {
	configDirPath := GetConfigDirPath(app)
	settingsFilePath := configDirPath + "/" + SettingsFileName

	settingsData := app.Settings()

	err := pokkitDbUtils.WriteDataToFileAsJson(settingsFilePath, settingsData)
	if err != nil {
		return fmt.Errorf("failed to WriteDataToFileAsJson: %w", err)
	}
	return err
}

// writeToSettingsFileAsJson writes settings to pb_data/settings.json.
// If successful, true is returned.
// If this file doesn't exist, a boolean of false is returned.
func writeToSettingsFileAsJson(app pbCore.App, settingsData *pbCore.Settings) error {
	configDirPath := GetConfigDirPath(app)
	settingsFilePath := configDirPath + "/" + SettingsFileName

	err := pokkitDbUtils.WriteDataToFileAsJson(settingsFilePath, settingsData)
	if err != nil {
		return fmt.Errorf("failed to WriteDataToFileAsJson: %w", err)
	}
	return err
}

func importThenWriteSettingsToSettingsFile(app pbCore.App) error {
	err := importSettingsFromSettingsFile(app)

	noSettingsFileExists := errors.Is(err, os.ErrNotExist)
	if err != nil && !noSettingsFileExists {
		return fmt.Errorf("failed to ImportSettingsFromSettingsFile in ImportThenWriteSettingsToSettingsFile %w", err)
	}
	if noSettingsFileExists {
		err = writeSettingsToSettingsFile(app)
	}
	if err != nil {
		return fmt.Errorf("failed to WriteSettingsToSettingsFile in ImportThenWriteSettingsToSettingsFile %w", err)
	}

	return nil
}
