package pokkitDbConfigSync

import (
	"log"

	pbCore "github.com/pocketbase/pocketbase/core"
)

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
