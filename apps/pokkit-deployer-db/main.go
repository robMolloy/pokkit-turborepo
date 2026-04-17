package main

import (
	"app-db/src/db"
	"app-db/src/events"
	"app-db/src/pokkitSetup"
	"app-db/src/routes"
	"fmt"
	"log"

	pocketbase "github.com/pocketbase/pocketbase"
	pbApis "github.com/pocketbase/pocketbase/apis"
	pbCore "github.com/pocketbase/pocketbase/core"
)

func main() {
	app := pocketbase.New()
	app.Store().Set("isSetupComplete", false)

	app.OnServe().BindFunc(func(se *pbCore.ServeEvent) error {
		// serves static files from the provided public dir (if exists)
		// se.Router.GET("/{path...}", pbApis.Static(os.DirFS("./pb_public"), false))

		se.Router.GET("/hello/{name}", routes.HelloNameRouteHandler)
		se.Router.POST("/bye", routes.ByeNameRouteHandler)
		se.Router.POST("/stripe-webhook", routes.StripeWebHookRouteHandler)
		se.Router.POST("/stripe-create-checkout-session", routes.StripeCreateCheckoutSessionRouteHandler).Bind(pbApis.RequireAuth())
		se.Router.POST("/stripe-retrieve-checkout-session", routes.StripeRetrieveCheckoutSessionRouteHandler).Bind(pbApis.RequireAuth())
		se.Next()

		return nil
	})

	app.OnServe().BindFunc(pokkitSetup.SetupCollectionsSettingsAndEnvVarsOnServe)

	app.OnSettingsReload().BindFunc(pokkitSetup.WriteSettingsToSettingsFileOnSettingsReloadEventHandler)

	app.OnCollectionAfterCreateSuccess().BindFunc(pokkitSetup.WriteCollectionsToCollectionsFileAfterCollectionChangeEventHandler)
	app.OnCollectionAfterUpdateSuccess().BindFunc(pokkitSetup.WriteCollectionsToCollectionsFileAfterCollectionChangeEventHandler)
	app.OnCollectionAfterDeleteSuccess().BindFunc(pokkitSetup.WriteCollectionsToCollectionsFileAfterCollectionChangeEventHandler)

	app.OnRecordAfterCreateSuccess(db.UserBalanceLedgerCollectionName).BindFunc(events.UpdateBalanceAfterUserBalanceLedgerCreatedEventHandler)

	app.OnRecordAfterCreateSuccess(db.UsersCollectionName).BindFunc(events.PromoteFirstUserToApprovedAdminAfterUserCreateEventHandler)

	app.OnRecordAfterCreateSuccess(db.InstancesCollectionName).BindFunc(events.ExecuteBashCommandFromCommandTemplatesForChangedInstanceRecordAfterInstanceRecordCreatedEventHandler)
	app.OnRecordAfterCreateSuccess(db.InstancesCollectionName).BindFunc(events.ExecuteBashCommandFromCommandTemplatesForAllInstanceRecordsAfterInstanceRecordCreatedEventHandler)

	app.OnRecordAfterUpdateSuccess(db.InstancesCollectionName).BindFunc(events.ExecuteBashCommandFromCommandTemplatesForChangedInstanceRecordAfterInstanceRecordUpdatedEventHandler)
	app.OnRecordAfterUpdateSuccess(db.InstancesCollectionName).BindFunc(events.ExecuteBashCommandFromCommandTemplatesForAllInstanceRecordsAfterInstanceRecordUpdatedEventHandler)

	app.OnRecordAfterDeleteSuccess(db.InstancesCollectionName).BindFunc(events.ExecuteBashCommandFromCommandTemplatesForChangedInstanceRecordAfterInstanceRecordDeletedEventHandler)
	app.OnRecordAfterDeleteSuccess(db.InstancesCollectionName).BindFunc(events.ExecuteBashCommandFromCommandTemplatesForAllInstanceRecordsAfterInstanceRecordDeletedEventHandler)

	app.OnRecordCreateRequest(db.OrganisationsCollectionName).BindFunc(events.PromoteOrganisationCreatorToOrgAdminAfterUserCreateEventHandler)

	app.OnTerminate().BindFunc(func(e *pbCore.TerminateEvent) error {
		log.Println("OnTerminate")

		return e.Next()
	})

	app.OnSettingsUpdateRequest().BindFunc(func(e *pbCore.SettingsUpdateRequestEvent) error {
		fmt.Println("OnSettingsUpdateRequest")

		return e.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
