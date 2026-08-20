package pokkitDbConfigSync

import (
	"errors"
	"fmt"
	"os"

	"github.com/google/go-cmp/cmp"
	"github.com/google/go-cmp/cmp/cmpopts"

	pbCore "github.com/pocketbase/pocketbase/core"
	pokkitDbUtils "github.com/robMolloy/pokkit-turborepo/packages/pokkitDbUtils"
)

func getCollectionsFromFile[T any](app pbCore.App) (collections *T, err error) {
	collectionsFilePath := GetConfigDirPath(app) + "/" + CollectionsFileName
	collectionsFile, err := pokkitDbUtils.ReadJsonFromFileGeneric[T](collectionsFilePath)
	if err != nil {
		return nil, fmt.Errorf("failed to ReadJsonFromFileGeneric in getCollectionsFromFile: %w", err)
	}
	return &collectionsFile, nil
}

func convertCollectionPointersToValues(collections []*pbCore.Collection) []pbCore.Collection {
	collectionsValue := make([]pbCore.Collection, len(collections))
	for i, collection := range collections {
		collectionsValue[i] = *collection
	}
	return collectionsValue
}

// importCollectionsFromCollectionsFile imports collections from pb_data/collections.json.
// If successful, true is returned.
// If this file doesn't exist, a boolean of false is returned.
func importCollectionsFromCollectionsFile(app pbCore.App) error {
	collections, err := getCollectionsFromFile[[]map[string]any](app)
	if err != nil {
		return fmt.Errorf("failed to getCollectionsFromFile in ImportCollectionsFromCollectionsFile: %w", err)
	}

	err = app.ImportCollections(*collections, true)
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
		if err != nil {
			return fmt.Errorf("failed to WriteCollectionsToCollectionsFile in SyncCollectionsWithCollectionsFile: %w", err)
		}
	}

	return nil
}

func isCollectionsSameAsCollectionsFile(app pbCore.App) (bool, error) {
	collectionsFileData, err := getCollectionsFromFile[[]pbCore.Collection](app)
	noCollectionsFileExists := errors.Is(err, os.ErrNotExist)
	if noCollectionsFileExists {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("failed to getCollectionsFromFile in isCollectionsSameAsCollectionsFile: %w", err)
	}

	collectionsData, err := app.FindAllCollections()
	if err != nil {
		return false, fmt.Errorf("failed to FindAllCollections in compareCollectionsToCollectionsFile: %w", err)
	}

	diff := compareCollections(*collectionsFileData, convertCollectionPointersToValues(collectionsData))

	return diff == "", nil
}

func compareCollections(collections []pbCore.Collection, collectionsFile []pbCore.Collection) string {
	diff := cmp.Diff(
		collections,
		collectionsFile,
		cmpopts.IgnoreUnexported(pbCore.Collection{}),
		cmpopts.IgnoreFields(pbCore.Collection{}, "Created", "Updated"),
		cmpopts.SortSlices(func(a, b *pbCore.Collection) bool {
			return a.Name < b.Name
		}),
	)
	return diff
}
