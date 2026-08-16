package pokkitDbPermissions

import (
	"log"

	pbCore "github.com/pocketbase/pocketbase/core"

	"github.com/pocketbase/pocketbase/core"
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
		err := ElevateFirstUserToApprovedSuperadmin(e.App, e.Record)

		if err != nil {
			log.Fatal("Error elevating first user to admin in OnUserRecordAfterCreateSuccess: %w", err)
		}

		return e.Next()
	})

	app.OnRecordCreateRequest(organisationsCollectionName).BindFunc(func(e *core.RecordRequestEvent) error {

		e.Next()
		userId := e.Auth.GetString("id")
		organisationId := e.Record.Id
		err := ElevateOrgCreatorToOrgAdmin(e.App, userId, organisationId)
		if err != nil {
			log.Fatal("Error elevating org creator to admin in OnRecordCreateRequest: %w", err)
		}
		return nil
	})
}
