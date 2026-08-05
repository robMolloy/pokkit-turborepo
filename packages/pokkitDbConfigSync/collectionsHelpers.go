package pokkitDbConfigSync

import (
	"errors"
	"fmt"
	"os"

	pbCore "github.com/pocketbase/pocketbase/core"
	pokkitDbUtils "github.com/robMolloy/pokkit-turborepo/packages/pokkit-db-utils"
)

var isCollectionsSyncSetupCompleteStoreKey = "isCollectionsSyncSetupComplete"

func getIsCollectionsSyncSetupComplete(app pbCore.App) bool {
	return app.Store().Get(isCollectionsSyncSetupCompleteStoreKey).(bool)
}
func setIsCollectionsSyncSetupComplete(app pbCore.App, isCollectionsSyncSetupComplete bool) {
	app.Store().Set(isCollectionsSyncSetupCompleteStoreKey, isCollectionsSyncSetupComplete)
}

// importCollectionsFromCollectionsFile imports collections from pb_data/collections.json.
// If successful, true is returned.
// If this file doesn't exist, a boolean of false is returned.
func importCollectionsFromCollectionsFile(app pbCore.App) error {
	configDirPath := GetConfigDirPath(app)
	collectionsFilePath := configDirPath + "/" + CollectionsFileName

	collectionsData, err := os.ReadFile(collectionsFilePath)
	if err != nil {
		return fmt.Errorf("failed to os.ReadFile in ImportCollectionsFromCollectionsFile: %w", err)
	}

	err = app.ImportCollectionsByMarshaledJSON(collectionsData, true)
	if err != nil {
		return fmt.Errorf("failed to app.ImportCollectionsByMarshaledJSON in ImportCollectionsFromCollectionsFile: %w", err)
	}

	return nil
}

// writeCollectionsToCollectionsFile writes collections to pb_data/collections.json.
// If successful, true is returned.
// If this file doesn't exist, a boolean of false is returned.
func writeCollectionsToCollectionsFile(app pbCore.App) error {
	configDirPath := GetConfigDirPath(app)
	collectionsFilePath := configDirPath + "/" + CollectionsFileName

	collectionsData, err := app.FindAllCollections()
	if err != nil {
		return fmt.Errorf("failed to app.FindAllCollections: %w", err)
	}

	err = pokkitDbUtils.WriteDataToFileAsJson(collectionsFilePath, collectionsData)
	if err != nil {
		return fmt.Errorf("failed to WriteDataToFileAsJson: %w", err)
	}
	return nil
}

// syncCollectionsWithCollectionsFile syncs collections with the collections file.
// If valid collections file is found, collections are imported and (for ease) written to the file.
// If this file doesn't exist, a boolean of false is returned.
func syncCollectionsWithCollectionsFile(app pbCore.App) error {
	err := importCollectionsFromCollectionsFile(app)

	noCollectionsFileExists := errors.Is(err, os.ErrNotExist)

	if err != nil && !noCollectionsFileExists {
		return fmt.Errorf("failed to ImportCollectionsFromCollectionsFile in SyncCollectionsWithCollectionsFile: %w", err)
	}

	if noCollectionsFileExists {
		err = writeCollectionsToCollectionsFile(app)
	}

	if err != nil {
		return fmt.Errorf("failed to WriteCollectionsToCollectionsFile in SyncCollectionsWithCollectionsFile: %w", err)
	}

	return nil
}
