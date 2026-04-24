package events

import (
	"app-db/src/db"
	"app-db/src/modules/instanceRecordsSdk"
	"app-db/src/modules/instanceSubscriptionsSdk"
	"app-db/src/modules/stripeBalanceLedgerRecordsSdk"
	"app-db/src/modules/userBalanceRecordsSdk"
	"app-db/src/modules/userRecordsSdk"
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

func UpdateBalanceAfterStripeBalanceLedgerCreatedEventHandler(e *pbCore.RecordEvent) error {
	log.Println("OnStripeBalanceLedgerRecordAfterCreateSuccess")
	stripeBalanceLedgerRecord := e.Record
	stripeBalanceLedgerRecordStruct := stripeBalanceLedgerRecordsSdk.ConvertStripeBalanceLedgerRecordToStruct(stripeBalanceLedgerRecord)
	if stripeBalanceLedgerRecordStruct.EventType != "checkout.session.completed" {
		e.App.Logger().Info("event type must be checkout.session.completed to be used")
		return e.Next()
	}
	if stripeBalanceLedgerRecordStruct.Quantity <= 0 {
		e.App.Logger().Error("stripeBalanceLedgerRecordStruct.Quantity cannot be <= 0", "stripeBalanceLedgerRecordStruct", stripeBalanceLedgerRecordStruct)
		return e.Next()
	}
	if stripeBalanceLedgerRecordStruct.Currency != "usd" {
		e.App.Logger().Error("currency must be usd")
		return e.Next()
	}

	userId := stripeBalanceLedgerRecordStruct.UserId
	user, err := userRecordsSdk.FindUserRecordStructById(e.App, userId)
	if user == nil || err != nil {
		e.App.Logger().Error("no user found")
		return e.Next()
	}

	if stripeBalanceLedgerRecordStruct.ProductName == "instance_subscription" {

		err = instanceSubscriptionsSdk.FindInstancesSubscriptionRecordAndUpdateFromStripeBalanceLedgerStruct(e.App, stripeBalanceLedgerRecordStruct)
		if err != nil {
			e.App.Logger().Error("Error Incrementing number of instances on userBalanceRecord", "err", err)
			return err
		}
	}

	if stripeBalanceLedgerRecordStruct.ProductName == "token" {
		err = userBalanceRecordsSdk.FindUserBalanceRecordAndIncrementTokenAmount(e.App, userId, stripeBalanceLedgerRecordStruct.Quantity)
		if err != nil {
			e.App.Logger().Error("Error Incrementing TokenAmount on userBalanceRecord", "err", err)
			return err
		}
	}

	return e.Next()
}
