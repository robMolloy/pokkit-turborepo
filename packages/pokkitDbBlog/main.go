package pokkitDbBlog

import (
	"log"

	pbCore "github.com/pocketbase/pocketbase/core"
)

func BindFunctions(app pbCore.App) {
	app.OnServe().BindFunc(func(e *pbCore.ServeEvent) error {
		err := mergePokkitDbBlogCollectionsFromSchema(e.App)
		if err != nil {
			log.Fatal("failed to mergePokkitDbBlogCollectionsFromSchema(e.App) in app.OnServe().BindFunc: %w", err)
		}
		return e.Next()
	})

}
