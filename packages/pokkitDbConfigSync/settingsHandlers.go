package pokkitDbConfigSync

import (
	"log"

	pbCore "github.com/pocketbase/pocketbase/core"
)

func OnServeSyncSettingsHandler(se *pbCore.ServeEvent) error {
	err := ImportThenWriteSettingsToSettingsFile(se.App)

	if err != nil {
		log.Fatal("failed to ImportThenWriteSettingsToSettingsFile in OnServeSyncSettingsHandler %w", err)
	}

	return se.Next()
}

func OnSettingsChangeWriteSettingsToSettingsFileHandler(e *pbCore.SettingsUpdateRequestEvent) error {
	isSettingsSyncSetupComplete := GetIsSettingsSyncSetupComplete(e.App)
	if !isSettingsSyncSetupComplete {
		return e.Next()
	}

	err := WriteToSettingsFileAsJson(e.App, e.NewSettings)
	if err != nil {
		log.Fatalf("failed to WriteToSettingsFileAsJson in OnSettingsChangeWriteSettingsToSettingsFileHandler: %v", err)
	}
	return e.Next()

}
