package pokkitDbConfigSync

import (
	"errors"
	"log"
	"os"

	pbCore "github.com/pocketbase/pocketbase/core"
)

func onServeImportCollectionsFromCollectionsFileHandler(se *pbCore.ServeEvent) error {
	err := importCollectionsFromCollectionsFile(se.App)
	noCollectionsFileExists := errors.Is(err, os.ErrNotExist)

	if err != nil && !noCollectionsFileExists {
		log.Fatalf("failed to ImportCollectionsFromCollectionsFile in OnServeImportCollectionsFromCollectionsFileHandler: %v", err)
	}

	return se.Next()
}

func onServeWriteCollectionsToCollectionsFileIfNotSameHandler(e *pbCore.ServeEvent) error {
	isCollectionsSame, err := isCollectionsSameAsCollectionsFile(e.App)
	if err != nil {
		log.Fatalf("failed to isCollectionsSameAsCollectionsFile in onServeCheckCollectionsHandler: %v", err)
	}

	if !isCollectionsSame {
		err = writeCollectionsToCollectionsFile(e.App)
		if err != nil {
			log.Fatalf("failed to writeCollectionsToCollectionsFile in onServeWriteCollectionsToCollectionsFileIfNotSameHandler: %v", err)
		}
	}

	return e.Next()
}

func onCollectionChangeWriteCollectionsToFileHandler(e *pbCore.CollectionEvent) error {
	if !getIsSetupComplete(e.App) {
		return e.Next()
	}

	err := writeCollectionsToCollectionsFile(e.App)
	if err != nil {
		log.Fatalf("failed to WriteCollectionsToCollectionsFile in OnCollectionChangeWriteCollectionsToFileHandler: %v", err)
	}

	return e.Next()
}
