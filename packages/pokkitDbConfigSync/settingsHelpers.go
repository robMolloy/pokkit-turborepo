package pokkitDbConfigSync

import (
	"fmt"

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
	fmt.Println(settingsData)

	err = app.Settings().Merge(settingsData) // needs to be of type *core.Settings
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
	if err == nil {
		err = WriteSettingsToSettingsFile(app)
	}

	if err != nil {
		return fmt.Errorf("failed to SyncCollectionsWithCollectionsFile %w", err)
	}

	return nil
}

func OnServeSyncSettingsWithSettingsFileHandler(se *pbCore.ServeEvent) error {
	err := SyncSettingsWithSettingsFile(se.App)

	if err != nil {
		se.App.Logger().Error("OnServeSyncSettingsWithSettingsFileHandler", "err", err)
		return err
	}

	return se.Next()
}

func OnSettingsChangeWriteSettingsToSettingsFileHandler(e *pbCore.SettingsUpdateRequestEvent) error {
	// e.NewSettings
	isSettingsSyncSetupComplete := GetIsSettingsSyncSetupComplete(e.App)
	if !isSettingsSyncSetupComplete {
		return e.Next()
	}

	e.Next()

	err := WriteSettingsToSettingsFile(e.App)
	if err != nil {
		e.App.Logger().Error("WriteSettingsToSettingsFile in OnSettingsChangeWriteSettingsToFileHandler", "err", err)
	}

	return nil
}
