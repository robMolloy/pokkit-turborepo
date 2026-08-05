package pokkitDbConfigSync

import (
	"log"

	pbCore "github.com/pocketbase/pocketbase/core"
)

func onServeSyncSettingsHandler(se *pbCore.ServeEvent) error {
	err := importThenWriteSettingsToSettingsFile(se.App)

	if err != nil {
		log.Fatal("failed to ImportThenWriteSettingsToSettingsFile in OnServeSyncSettingsHandler %w", err)
	}

	return se.Next()
}

func onSettingsChangeWriteSettingsToSettingsFileHandler(e *pbCore.SettingsUpdateRequestEvent) error {
	isSettingsSyncSetupComplete := getIsSettingsSyncSetupComplete(e.App)
	if !isSettingsSyncSetupComplete {
		return e.Next()
	}

	err := writeToSettingsFileAsJson(e.App, e.NewSettings)
	if err != nil {
		log.Fatalf("failed to WriteToSettingsFileAsJson in OnSettingsChangeWriteSettingsToSettingsFileHandler: %v", err)
	}
	return e.Next()

}
