package pokkitDbDeployer

import (
	_ "embed"
	"fmt"

	pbCore "github.com/pocketbase/pocketbase/core"
)

//go:embed collectionsSchema.json
var pokkitDbDeployerCollectionsSchema []byte

func mergePokkitDbDeployerCollectionsFromSchema(app pbCore.App) error {
	err := app.ImportCollectionsByMarshaledJSON(pokkitDbDeployerCollectionsSchema, false)
	if err != nil {
		return fmt.Errorf("failed to app.ImportCollectionsByMarshaledJSON(pokkitDbDeployerCollectionsSchema, false) in mergePokkitDbDeployerCollectionsFromSchema: %w", err)
	}

	return nil
}
