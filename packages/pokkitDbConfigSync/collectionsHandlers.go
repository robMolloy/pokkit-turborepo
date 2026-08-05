package pokkitDbConfigSync

import (
	"log"

	pbCore "github.com/pocketbase/pocketbase/core"
)

func onServeSyncCollectionsWithCollectionsFileHandler(se *pbCore.ServeEvent) error {
	err := syncCollectionsWithCollectionsFile(se.App)

	if err != nil {
		log.Fatalf("failed to SyncCollectionsWithCollectionsFile in OnServeSyncCollectionsWithCollectionsFileHandler: %v", err)
	}

	return se.Next()
}

func onCollectionChangeWriteCollectionsToFileHandler(e *pbCore.CollectionEvent) error {
	isCollectionsSyncSetupComplete := getIsCollectionsSyncSetupComplete(e.App)
	if !isCollectionsSyncSetupComplete {
		return e.Next()
	}

	err := writeCollectionsToCollectionsFile(e.App)
	if err != nil {
		log.Fatalf("failed to WriteCollectionsToCollectionsFile in OnCollectionChangeWriteCollectionsToFileHandler: %v", err)
	}

	return e.Next()
}

func onServeSetIsCollectionsSyncSetupCompleteHandler(e *pbCore.ServeEvent) error {
	setIsCollectionsSyncSetupComplete(e.App, true)
	return e.Next()
}
