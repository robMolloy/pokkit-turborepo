package pokkitDbConfigSync

import (
	"log"

	pbCore "github.com/pocketbase/pocketbase/core"
)

func OnServeSyncCollectionsWithCollectionsFileHandler(se *pbCore.ServeEvent) error {
	err := SyncCollectionsWithCollectionsFile(se.App)

	if err != nil {
		log.Fatalf("failed to SyncCollectionsWithCollectionsFile in OnServeSyncCollectionsWithCollectionsFileHandler: %v", err)
	}

	return se.Next()
}

func OnCollectionChangeWriteCollectionsToFileHandler(e *pbCore.CollectionEvent) error {
	isCollectionsSyncSetupComplete := GetIsCollectionsSyncSetupComplete(e.App)
	if !isCollectionsSyncSetupComplete {
		return e.Next()
	}

	err := WriteCollectionsToCollectionsFile(e.App)
	if err != nil {
		log.Fatalf("failed to WriteCollectionsToCollectionsFile in OnCollectionChangeWriteCollectionsToFileHandler: %v", err)
	}

	return e.Next()
}
