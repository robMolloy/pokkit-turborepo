package pokkitDbConfigWriter

import (
	"fmt"
	"os"

	pbCore "github.com/pocketbase/pocketbase/core"
	"github.com/robMolloy/pokkit-turborepo/apps/pokkit-deployer-db/src/utils"
	pokkitDbUtils "github.com/robMolloy/pokkit-turborepo/packages/pokkit-db-utils"
)

// ImportCollectionsFromCollectionsFile imports collections from pb_data/collections.json.
// If successful, true is returned.
// If this file doesn't exist, a boolean of false is returned.
func ImportCollectionsFromCollectionsFile(app pbCore.App) (bool, error) {
	configDirPath := GetConfigDirPath(app)
	collectionsFilePath := configDirPath + "/" + CollectionsFileName

	isExist := utils.FileExists(collectionsFilePath)
	if !isExist {
		return false, nil
	}

	// File definitely exists, this will only fail with an error that should be logged
	collectionsData, err := os.ReadFile(collectionsFilePath)
	if err != nil {
		return false, err
	}

	err = app.ImportCollectionsByMarshaledJSON(collectionsData, false)
	if err != nil {
		return false, err
	}

	return true, nil
}

// WriteCollectionsToCollectionsFile writes collections to pb_data/collections.json.
// If successful, true is returned.
// If this file doesn't exist, a boolean of false is returned.
func WriteCollectionsToCollectionsFile(app pbCore.App) error {
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
	return err
}

func SyncCollectionsWithCollectionsFile(app pbCore.App) error {
	didImport, err := ImportCollectionsFromCollectionsFile(app)
	if didImport == false && err == nil {
		err = WriteCollectionsToCollectionsFile(app)
	}

	if err != nil {
		return fmt.Errorf("failed to SyncCollectionsWithCollectionsFile %w", err)
	}

	return nil
}
func OnServeSyncCollectionsWithCollectionsFileHandler(se *pbCore.ServeEvent) error {
	err := SyncCollectionsWithCollectionsFile(se.App)

	if err != nil {
		se.App.Logger().Error("OnServeSyncCollectionsWithCollectionsFileHandler", "err", err)
	}

	return se.Next()
}

func OnCollectionChangeWriteCollectionsToFileHandler(e *pbCore.CollectionEvent) error {
	isSetupComplete := e.App.Store().Get("isSetupComplete").(bool)
	if !isSetupComplete {
		return e.Next()
	}

	err := WriteCollectionsToCollectionsFile(e.App)
	if err != nil {
		e.App.Logger().Error("WriteCollectionsToCollectionsFile", "err", err)
	}

	return e.Next()
}
