package main

import (
	"app-db/src/db"
	"app-db/src/modules/instanceRecords"
	"app-db/src/modules/userBalanceLedgerRecords"
	"app-db/src/pokkitSetup"
	"app-db/src/routes"
	"app-db/src/utils"
	"fmt"
	"log"
	"os/exec"

	"github.com/pocketbase/dbx"
	pocketbase "github.com/pocketbase/pocketbase"
	pbApis "github.com/pocketbase/pocketbase/apis"
	pbCore "github.com/pocketbase/pocketbase/core"
)

func WriteSettingsToSettingsFileOnSettingsReloadEventHandler(e *pbCore.SettingsReloadEvent) error {
	fmt.Println("OnSettingsReload")
	if err := e.Next(); err != nil {
		return err
	}

	if setupComplete {
		writeErr := utils.WriteDataToFileAsJson(e.App.DataDir()+"/settings.json", e.App.Settings())
		if writeErr != nil {
			e.App.Logger().Error("Error when writing to settings.json")
		}
	}

	fmt.Println("OnSettingsReload - after")
	return nil
}

func WriteCollectionsToCollectionsFileAfterCollectionChangeEventHandler(e *pbCore.CollectionEvent) error {
	fmt.Println("OnCollectionAfterDeleteSuccess")
	e.Next()

	if setupComplete {
		_, writeErr := pokkitSetup.WriteCollectionsToCollectionsFile(e.App)
		if writeErr != nil {
			e.App.Logger().Error("Error when writing to collections.json", "writeErr", writeErr)
		}
	}

	return nil
}

// // WriteSettingsToSettingsFile writes collections to pb_data/collections.json.
// // If successful, true is returned.
// // If this file doesn't exist, a boolean of false is returned.
// func WriteSettingsToSettingsFile(app pbCore.App) (bool, error) {
// 	fileName := "settings.json"
// 	filePath := fmt.Sprintf("%s/%s", app.DataDir(), fileName)

// 	settings := app.Settings()

// 	settingsJson, err := json.Marshal(settings)
// 	if err != nil {
// 		return false, err
// 	}

// 	err = os.WriteFile(filePath, settingsJson, 0644)
// 	if err != nil {
// 		return false, err
// 	}
// 	return true, nil
// }

var setupComplete = false

func main() {
	app := pocketbase.New()

	app.OnServe().BindFunc(func(se *pbCore.ServeEvent) error {
		se.Router.GET("/hello/{name}", routes.HelloNameRouteHandler)
		se.Router.POST("/bye", routes.ByeNameRouteHandler)
		se.Router.POST("/stripe-webhook", routes.StripeWebHookRouteHandler)
		se.Router.POST("/stripe-create-checkout-session", routes.StripeCreateCheckoutSessionRouteHandler).Bind(pbApis.RequireAuth())
		se.Router.POST("/stripe-retrieve-checkout-session", routes.StripeRetrieveCheckoutSessionRouteHandler).Bind(pbApis.RequireAuth())
		se.Next()

		return nil
	})

	app.OnServe().BindFunc(func(se *pbCore.ServeEvent) error {
		// serves static files from the provided public dir (if exists)
		// se.Router.GET("/{path...}", pbApis.Static(os.DirFS("./pb_public"), false))

		resp, err := pokkitSetup.ImportCollectionsFromCollectionsFile(app)
		fmt.Println("ImportCollectionsFromCollectionsFilePath", resp, err)

		resp, err = pokkitSetup.ImportSettingsFromSettingsFile(app)
		fmt.Println("ImportSettingsFromSettingsFilePath", resp, err)

		err = pokkitSetup.SaveSecretsJsonAsEnvVars(app)
		fmt.Println("SaveSecretsJsonAsEnvVars", err)

		se.Next()

		setupComplete = true
		fmt.Println("Setup complete.")
		return nil
	})

	app.OnSettingsReload().BindFunc(WriteSettingsToSettingsFileOnSettingsReloadEventHandler)

	app.OnCollectionAfterCreateSuccess().BindFunc(WriteCollectionsToCollectionsFileAfterCollectionChangeEventHandler)
	app.OnCollectionAfterUpdateSuccess().BindFunc(WriteCollectionsToCollectionsFileAfterCollectionChangeEventHandler)
	app.OnCollectionAfterDeleteSuccess().BindFunc(WriteCollectionsToCollectionsFileAfterCollectionChangeEventHandler)

	app.OnRecordAfterCreateSuccess(db.UserBalanceLedgerCollectionName).BindFunc(func(e *pbCore.RecordEvent) error {
		log.Println("OnUserBalanceLedgerRecordAfterCreateSuccess")

		userBalanceLedgerRecord := e.Record
		userBalanceLedgerRecordData := userBalanceLedgerRecords.ConvertUserBalanceLedgerRecordToData(userBalanceLedgerRecord)
		userId := userBalanceLedgerRecordData.UserId

		userBalancesCollection, err := app.FindCollectionByNameOrId(db.UserBalancesCollectionName)
		userBalanceRecord, _ := app.FindRecordById(db.UserBalancesCollectionName, userId)
		if userBalanceRecord == nil {
			userBalanceRecord = pbCore.NewRecord(userBalancesCollection)
			userBalanceRecord.Set("id", userId)
			userBalanceRecord.Set("userId", userId)
			userBalanceRecord.Set("tokenAmount", 0)
		}
		currentBalanceTokenAmount := userBalanceRecord.GetInt("tokenAmount")
		newBalanceTokenAmount := currentBalanceTokenAmount + userBalanceLedgerRecordData.TokenAmount
		userBalanceRecord.Set("tokenAmount", newBalanceTokenAmount)

		err = e.App.Save(userBalanceRecord)
		if err != nil {
			log.Printf("Error saving userBalanceRecord: %v\n", err)
		}

		return e.Next()
	})

	app.OnRecordAfterCreateSuccess(db.UsersCollectionName).BindFunc(func(e *pbCore.RecordEvent) error {
		log.Println("OnUserRecordAfterCreateSuccess")

		userRecord := e.Record
		userRecordsCount, err := e.App.CountRecords(db.UsersCollectionName)

		if err != nil {
			log.Printf("Error counting user records: %v\n", err)
			return e.Next()
		}

		if userRecordsCount != 1 {
			return e.Next()
		}

		globalUserPermissionsCollection, err := e.App.FindCollectionByNameOrId(db.GlobalUserPermissionsCollectionName)
		if err != nil {
			log.Printf("Error finding globalUserPermissions collection: %v\n", err)
			return e.Next()
		}

		globalUserPermissionsRecord := pbCore.NewRecord(globalUserPermissionsCollection)
		globalUserPermissionsRecord.Set("id", userRecord.Id)
		globalUserPermissionsRecord.Set("userId", userRecord.Id)
		globalUserPermissionsRecord.Set("role", "admin")
		globalUserPermissionsRecord.Set("status", "approved")

		err = e.App.Save(globalUserPermissionsRecord)
		if err != nil {
			log.Printf("Error saving globalUserPermissions record: %v\n", err)
		}

		return e.Next()
	})

	app.OnRecordAfterCreateSuccess(db.InstancesCollectionName).BindFunc(func(e *pbCore.RecordEvent) error {
		log.Println("OnDeplymentRecordAfterCreateSuccess - changedRecord")

		commandTemplateRecords, err := app.FindAllRecords(db.CommandTemplatesForChangedInstanceRecordCollectionName, dbx.HashExp{"crudOperation": "create"})
		if err != nil {
			log.Printf("Error finding changedRecordCommandTemplates records: %v\n", err)
			return e.Next()
		}

		instanceRecordData := instanceRecords.ConvertInstanceRecordToData(e.Record)

		for _, commandTemplateRecord := range commandTemplateRecords {
			bashTemplate := commandTemplateRecord.GetString("bashTemplate")
			bashCommand, err := utils.PopulateTemplate(bashTemplate, instanceRecordData)
			if err != nil {
				log.Println(err)
				return e.Next()
			}

			cmd := exec.Command("bash", "-c", bashCommand)
			cmd.Start()
		}

		return e.Next()
	})

	app.OnRecordAfterCreateSuccess(db.InstancesCollectionName).BindFunc(func(e *pbCore.RecordEvent) error {
		log.Println("OnDeplymentRecordAfterCreateSuccess - all records")

		commandTemplateRecords, err := app.FindAllRecords(db.CommandTemplatesForAllInstanceRecordsCollectionName, dbx.HashExp{"crudOperation": "create"})
		if err != nil {
			log.Printf("Error finding allRecordCommandTemplates records: %v\n", err)
			return e.Next()
		}
		deploymentRecords, err := app.FindAllRecords(db.InstancesCollectionName)
		if err != nil {
			log.Printf("Error finding deployment records: %v\n", err)
			return e.Next()
		}

		instanceRecordsData := instanceRecords.ConvertInstanceRecordsToData(deploymentRecords)

		for _, commandTemplateRecord := range commandTemplateRecords {
			bashTemplate := commandTemplateRecord.GetString("bashTemplate")
			bashCommand, err := utils.PopulateTemplate(bashTemplate, instanceRecordsData)
			if err != nil {
				log.Println(err)
				return e.Next()
			}

			cmd := exec.Command("bash", "-c", bashCommand)
			cmd.Start()
		}

		return e.Next()
	})

	app.OnRecordAfterUpdateSuccess(db.InstancesCollectionName).BindFunc(func(e *pbCore.RecordEvent) error {
		log.Println("OnDeploymentRecordAfterUpdateSuccess")

		commandTemplateRecords, err := app.FindAllRecords(db.CommandTemplatesForChangedInstanceRecordCollectionName, dbx.HashExp{"crudOperation": "update"})
		if err != nil {
			log.Printf("Error finding changedRecordCommandTemplates records: %v\n", err)
			return e.Next()
		}

		deploymentRecordsData := instanceRecords.ConvertInstanceRecordToData(e.Record)

		for _, commandTemplateRecord := range commandTemplateRecords {
			bashTemplate := commandTemplateRecord.GetString("bashTemplate")
			bashCommand, err := utils.PopulateTemplate(bashTemplate, deploymentRecordsData)
			if err != nil {
				log.Println(err)
				return e.Next()
			}

			cmd := exec.Command("bash", "-c", bashCommand)
			cmd.Start()
		}

		return e.Next()
	})

	app.OnRecordAfterUpdateSuccess(db.InstancesCollectionName).BindFunc(func(e *pbCore.RecordEvent) error {
		log.Println("OnDeplymentRecordAfterUpdateSuccess - all records")

		commandTemplateRecords, err := app.FindAllRecords(db.CommandTemplatesForAllInstanceRecordsCollectionName, dbx.HashExp{"crudOperation": "update"})
		if err != nil {
			log.Printf("Error finding allRecordCommandTemplates records: %v\n", err)
			return e.Next()
		}
		deploymentRecords, err := app.FindAllRecords(db.InstancesCollectionName)
		if err != nil {
			log.Printf("Error finding deployments records: %v\n", err)
			return e.Next()
		}

		instanceRecordsData := instanceRecords.ConvertInstanceRecordsToData(deploymentRecords)

		for _, commandTemplateRecord := range commandTemplateRecords {
			bashTemplate := commandTemplateRecord.GetString("bashTemplate")
			bashCommand, err := utils.PopulateTemplate(bashTemplate, instanceRecordsData)
			if err != nil {
				log.Println(err)
				return e.Next()
			}

			cmd := exec.Command("bash", "-c", bashCommand)
			cmd.Start()
		}

		return e.Next()
	})

	app.OnRecordAfterDeleteSuccess(db.InstancesCollectionName).BindFunc(func(e *pbCore.RecordEvent) error {
		log.Println("OnDeploymentRecordAfterDeleteSuccess - changedRecord")

		commandTemplateRecords, err := app.FindAllRecords(db.CommandTemplatesForChangedInstanceRecordCollectionName, dbx.HashExp{"crudOperation": "delete"})
		if err != nil {
			log.Printf("Error finding changedRecordCommandTemplates records: %v\n", err)
			return e.Next()
		}

		instanceRecordData := instanceRecords.ConvertInstanceRecordToData(e.Record)

		for _, commandTemplateRecord := range commandTemplateRecords {
			bashTemplate := commandTemplateRecord.GetString("bashTemplate")
			bashCommand, err := utils.PopulateTemplate(bashTemplate, instanceRecordData)
			if err != nil {
				log.Println(err)
				return e.Next()
			}

			cmd := exec.Command("bash", "-c", bashCommand)
			cmd.Start()
		}

		return e.Next()
	})

	app.OnRecordAfterDeleteSuccess(db.InstancesCollectionName).BindFunc(func(e *pbCore.RecordEvent) error {
		log.Println("OnDeplymentRecordAfterDeleteSuccess - all records")

		commandTemplateRecords, err := app.FindAllRecords(db.CommandTemplatesForAllInstanceRecordsCollectionName, dbx.HashExp{"crudOperation": "delete"})
		if err != nil {
			log.Printf("Error finding allRecordCommandTemplates records: %v\n", err)
			return e.Next()
		}
		deploymentRecords, err := app.FindAllRecords(db.InstancesCollectionName)
		if err != nil {
			log.Printf("Error finding deployments records: %v\n", err)
			return e.Next()
		}

		instanceRecordsData := instanceRecords.ConvertInstanceRecordsToData(deploymentRecords)

		for _, commandTemplateRecord := range commandTemplateRecords {
			bashTemplate := commandTemplateRecord.GetString("bashTemplate")
			bashCommand, err := utils.PopulateTemplate(bashTemplate, instanceRecordsData)
			if err != nil {
				log.Println(err)
				return e.Next()
			}

			cmd := exec.Command("bash", "-c", bashCommand)
			cmd.Start()
		}

		return e.Next()
	})

	app.OnRecordCreateRequest(db.OrganisationsCollectionName).BindFunc(func(e *pbCore.RecordRequestEvent) error {
		log.Println("onRecordCreateRequest - organisations")

		e.Next()

		organisationRecord := e.Record

		organisationUserPermissionsCollection, err := e.App.FindCollectionByNameOrId(
			"organisationUserPermissions",
		)
		if err != nil {
			log.Printf("Error finding organisationUserPermissions collection: %v\n", err)
			return e.Next()
		}

		organisationUserPermissionsRecord := pbCore.NewRecord(organisationUserPermissionsCollection)

		organisationUserPermissionsRecord.Set("userId", e.Auth.Id)
		organisationUserPermissionsRecord.Set("organisationId", organisationRecord.Id)
		organisationUserPermissionsRecord.Set("role", "admin")
		organisationUserPermissionsRecord.Set("status", "approved")
		organisationUserPermissionsRecord.Set("userOrgKey", fmt.Sprintf("%s-%s", e.Auth.Id, organisationRecord.Id))

		err = e.App.Save(organisationUserPermissionsRecord)
		if err != nil {
			log.Printf("Error saving organisationUserPermissions record: %v\n", err)
		}

		return e.Next()
	})

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
