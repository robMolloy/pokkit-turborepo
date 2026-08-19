package pokkitDbBlog

import (
	_ "embed"
	"fmt"

	pbCore "github.com/pocketbase/pocketbase/core"
)

//go:embed collectionsSchema.json
var pokkitDbBlogCollectionsSchema []byte

func mergePokkitDbBlogCollectionsFromSchema(app pbCore.App) error {
	err := app.ImportCollectionsByMarshaledJSON(pokkitDbBlogCollectionsSchema, false)
	if err != nil {
		return fmt.Errorf("failed to app.ImportCollectionsByMarshaledJSON(pokkitDbBlogCollectionsSchema, false) in mergePokkitDbBlogCollectionsFromSchema: %w", err)
	}

	return nil
}
