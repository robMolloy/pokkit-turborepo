package pokkitDbPermissions

import (
	"log"

	pbCore "github.com/pocketbase/pocketbase/core"
)

func BindFunctions(app pbCore.App) {
	app.OnServe().BindFunc(func(e *pbCore.ServeEvent) error {
		err := mergePokkitPermissionsDbCollectionsFromSchema(e.App)
		if err != nil {
			log.Fatal("Error merging pokkitPermissionsDbCollectionsFromSchema in BindFunctions: %w", err)
		}
		return e.Next()
	})

	// if first user, make approved superadmin
	app.OnRecordAfterCreateSuccess(usersCollectionName).BindFunc(func(e *pbCore.RecordEvent) error {
		err := ElevateFirstUserToAdmin(e.App, e.Record)

		if err != nil {
			log.Fatal("Error elevating first user to admin in OnUserRecordAfterCreateSuccess: %w", err)
		}

		return e.Next()
	})

}
