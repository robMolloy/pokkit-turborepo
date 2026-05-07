package events

import (
	"app-db/src/db"
	"app-db/src/modules/instanceRecordsSdk"
	"app-db/src/modules/instanceSubscriptionsSdk"
	"app-db/src/modules/stripeLedgerRecordsSdk"
	"app-db/src/modules/userBalanceRecordsSdk"
	"app-db/src/pokkitSetup"
	"app-db/src/utils"
	"fmt"
	"log"
	"os/exec"

	"github.com/pocketbase/dbx"
	pbCore "github.com/pocketbase/pocketbase/core"
)

func WriteSettingsToSettingsFileOnSettingsReloadEventHandler(e *pbCore.SettingsReloadEvent) error {
	fmt.Println("OnSettingsReload")
	if err := e.Next(); err != nil {
		return err
	}

	isSetupComplete := e.App.Store().Get("isSetupComplete").(bool)
	if isSetupComplete {
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

	isSetupComplete := e.App.Store().Get("isSetupComplete").(bool)
	if isSetupComplete {
		_, writeErr := pokkitSetup.WriteCollectionsToCollectionsFile(e.App)
		if writeErr != nil {
			e.App.Logger().Error("Error when writing to collections.json", "writeErr", writeErr)
		}
	}

	return nil
}

func SetupCollectionsSettingsAndEnvVarsOnServe(se *pbCore.ServeEvent) error {
	resp, err := pokkitSetup.ImportCollectionsFromCollectionsFile(se.App)
	fmt.Println("ImportCollectionsFromCollectionsFilePath", resp, err)

	resp, err = pokkitSetup.ImportSettingsFromSettingsFile(se.App)
	fmt.Println("ImportSettingsFromSettingsFilePath", resp, err)

	err = pokkitSetup.SaveSecretsJsonAsEnvVars(se.App)
	fmt.Println("SaveSecretsJsonAsEnvVars", err)

	se.Next()

	se.App.Store().Set("isSetupComplete", true)

	fmt.Println("Setup complete.")
	return nil
}

func PromoteFirstUserToApprovedAdminAfterUserCreateEventHandler(e *pbCore.RecordEvent) error {
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

	globalUserPermissionsCollection, err := e.App.FindCollectionByNameOrId(db.AuthGlobalUserPermissionsCollectionName)
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
}

func ExecuteBashCommandFromCommandTemplatesForChangedInstanceRecordAfterInstanceRecordCreatedEventHandler(e *pbCore.RecordEvent) error {
	log.Println("OnDeplymentRecordAfterCreateSuccess - changedRecord")

	instanceRecord := e.Record

	commandTemplateRecords, err := e.App.FindAllRecords(db.CommandTemplatesForChangedInstanceRecordCollectionName, dbx.HashExp{"crudOperation": "create"})
	if err != nil {
		log.Printf("Error finding changedRecordCommandTemplates records: %v\n", err)
		return e.Next()
	}

	instanceRecordData := instanceRecordsSdk.ConvertInstanceRecordToData(instanceRecord)

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
}

func ExecuteBashCommandFromCommandTemplatesForAllInstanceRecordsAfterInstanceRecordCreatedEventHandler(e *pbCore.RecordEvent) error {
	log.Println("OnDeplymentRecordAfterCreateSuccess - all records")

	commandTemplateRecords, err := e.App.FindAllRecords(db.CommandTemplatesForAllInstanceRecordsCollectionName, dbx.HashExp{"crudOperation": "create"})
	if err != nil {
		log.Printf("Error finding allRecordCommandTemplates records: %v\n", err)
		return e.Next()
	}
	instanceRecords, err := e.App.FindAllRecords(db.InstancesCollectionName)
	if err != nil {
		log.Printf("Error finding deployment records: %v\n", err)
		return e.Next()
	}

	instanceRecordsData := instanceRecordsSdk.ConvertInstanceRecordsToData(instanceRecords)

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
}

func ExecuteBashCommandFromCommandTemplatesForChangedInstanceRecordAfterInstanceRecordUpdatedEventHandler(e *pbCore.RecordEvent) error {
	log.Println("OnDeploymentRecordAfterUpdateSuccess")

	commandTemplateRecords, err := e.App.FindAllRecords(db.CommandTemplatesForChangedInstanceRecordCollectionName, dbx.HashExp{"crudOperation": "update"})
	if err != nil {
		log.Printf("Error finding changedRecordCommandTemplates records: %v\n", err)
		return e.Next()
	}

	instanceRecordsData := instanceRecordsSdk.ConvertInstanceRecordToData(e.Record)

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
}

func ExecuteBashCommandFromCommandTemplatesForAllInstanceRecordsAfterInstanceRecordUpdatedEventHandler(e *pbCore.RecordEvent) error {
	log.Println("OnDeplymentRecordAfterUpdateSuccess - all records")

	commandTemplateRecords, err := e.App.FindAllRecords(db.CommandTemplatesForAllInstanceRecordsCollectionName, dbx.HashExp{"crudOperation": "update"})
	if err != nil {
		log.Printf("Error finding allRecordCommandTemplates records: %v\n", err)
		return e.Next()
	}
	deploymentRecords, err := e.App.FindAllRecords(db.InstancesCollectionName)
	if err != nil {
		log.Printf("Error finding deployments records: %v\n", err)
		return e.Next()
	}

	instanceRecordsData := instanceRecordsSdk.ConvertInstanceRecordsToData(deploymentRecords)

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
}

func ExecuteBashCommandFromCommandTemplatesForAllInstanceRecordsAfterInstanceRecordDeletedEventHandler(e *pbCore.RecordEvent) error {
	commandTemplateRecords, err := e.App.FindAllRecords(db.CommandTemplatesForAllInstanceRecordsCollectionName, dbx.HashExp{"crudOperation": "delete"})
	if err != nil {
		return e.Next()
	}
	deploymentRecords, err := e.App.FindAllRecords(db.InstancesCollectionName)
	if err != nil {
		return e.Next()
	}

	instanceRecordsData := instanceRecordsSdk.ConvertInstanceRecordsToData(deploymentRecords)

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
}

func ExecuteBashCommandFromCommandTemplatesForChangedInstanceRecordAfterInstanceRecordDeletedEventHandler(e *pbCore.RecordEvent) error {
	log.Println("OnDeploymentRecordAfterDeleteSuccess - changedRecord")

	commandTemplateRecords, err := e.App.FindAllRecords(db.CommandTemplatesForChangedInstanceRecordCollectionName, dbx.HashExp{"crudOperation": "delete"})
	if err != nil {
		log.Printf("Error finding changedRecordCommandTemplates records: %v\n", err)
		return e.Next()
	}

	instanceRecordData := instanceRecordsSdk.ConvertInstanceRecordToData(e.Record)

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
}

func PromoteOrganisationCreatorToOrgAdminAfterUserCreateEventHandler(e *pbCore.RecordRequestEvent) error {
	log.Println("onRecordCreateRequest - organisations")

	e.Next()

	organisationRecord := e.Record

	organisationUserPermissionsCollection, err := e.App.FindCollectionByNameOrId(db.AuthOrganisationUserPermissionsCollectionName)
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
		e.App.Logger().Error("Fail to save organisation creator as organisation admin.")
	}

	return e.Next()
}

func UpdateProductsAfterStripeLedgerCreatedEventHandler(e *pbCore.RecordEvent) error {
	log.Println("OnStripeLedgerRecordAfterCreateSuccess")
	stripeLedgerRecord := e.Record
	stripeLedgerRecordStruct := stripeLedgerRecordsSdk.ConvertStripeLedgerRecordToStruct(stripeLedgerRecord)

	if stripeLedgerRecordStruct.EventType != "checkout.session.completed" && stripeLedgerRecordStruct.EventType != "customer.subscription.updated" {
		e.App.Logger().Info("event type must be checkout.session.completed to update products")
		return nil
	}

	if stripeLedgerRecordStruct.Currency != "usd" {
		return fmt.Errorf("currency must be usd")
	}

	userId := stripeLedgerRecordStruct.UserId

	if stripeLedgerRecordStruct.ProductName == "instance_subscription" {
		err := instanceSubscriptionsSdk.FindInstancesSubscriptionRecordAndUpdateFromStripeLedgerStruct(e.App, stripeLedgerRecordStruct)
		if err != nil {
			return fmt.Errorf("instanceSubscriptionsSdk.FindInstancesSubscriptionRecordAndUpdateFromStripeLedgerStruct: %w", err)
		}
	}

	if stripeLedgerRecordStruct.ProductName == "token" {
		err := userBalanceRecordsSdk.FindUserBalanceRecordAndIncrementTokenAmount(e.App, userId, stripeLedgerRecordStruct.Quantity)
		if err != nil {
			return fmt.Errorf("userBalanceRecordsSdk.FindUserBalanceRecordAndIncrementTokenAmount error: %w", err)
		}
	}

	return e.Next()
}
