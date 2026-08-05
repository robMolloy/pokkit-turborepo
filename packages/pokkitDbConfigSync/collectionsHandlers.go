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
	if !getIsSetupComplete(e.App) {
		return e.Next()
	}

	err := writeCollectionsToCollectionsFile(e.App)
	if err != nil {
		log.Fatalf("failed to WriteCollectionsToCollectionsFile in OnCollectionChangeWriteCollectionsToFileHandler: %v", err)
	}

	return e.Next()
}
