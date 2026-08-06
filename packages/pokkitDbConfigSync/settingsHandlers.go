package pokkitDbConfigSync

import (
	"log"

	pbCore "github.com/pocketbase/pocketbase/core"
)

func onServeSyncSettingsHandler(se *pbCore.ServeEvent) error {
	err := syncSettingsToSettingsFile(se.App)

	if err != nil {
		log.Fatal("failed to syncSettingsToSettingsFile in OnServeSyncSettingsHandler %w", err)
	}

	return se.Next()
}

func onSettingsChangeWriteSettingsToSettingsFileHandler(e *pbCore.SettingsUpdateRequestEvent) error {
	if !getIsSetupComplete(e.App) {
		return e.Next()
	}

	err := writeToSettingsFileAsJson(e.App, e.NewSettings)
	if err != nil {
		log.Fatalf("failed to WriteToSettingsFileAsJson in OnSettingsChangeWriteSettingsToSettingsFileHandler: %v", err)
	}

	return e.Next()
}

func onServeWriteSettingsToSettingsFileHandler(se *pbCore.ServeEvent) error {
	err := writeSettingsToSettingsFile(se.App)
	if err != nil {
		log.Fatalf("failed to writeSettingsToSettingsFile in onServeWriteSettingsToSettingsFileHandler: %v", err)
	}
	return se.Next()
}
