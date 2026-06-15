package events

import (
	"app-db/src/db"
	"app-db/src/modules/instanceRecordsSdk"
	"app-db/src/modules/instanceSubscriptionsSdk"
	"app-db/src/modules/stripeLedgerRecordsSdk"
	"app-db/src/modules/stripeProductPricesSdk"
	"app-db/src/modules/stripeProductsSdk"
	"app-db/src/modules/userBalanceRecordsSdk"
	"app-db/src/pokkitSetup"
	"app-db/src/utils"
	"fmt"
	"log"

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

func CreateInstanceFromInstanceRequestEventHandler(e *pbCore.RecordEvent) error {
	instanceRequestRecord := e.Record
	instanceRequestRecordId := instanceRequestRecord.GetString("id")

	highestPortNumber := instanceRecordsSdk.DbGetHighestPortNumber(e.App)
	if highestPortNumber < 1000 {
		highestPortNumber = 1000
	}
	nextPortNumber := highestPortNumber + 1

	newInstanceRecordStruct := instanceRecordsSdk.TInstanceRecordStruct{
		PortNumber:        nextPortNumber,
		InstanceRequestId: instanceRequestRecordId,
		Status:            "pending",
	}

	newInstanceRecord, err := instanceRecordsSdk.NewInstanceRecord(e.App)
	if err != nil {
		e.App.Logger().Error("newInstanceRecordErr", "err", err)
		return e.Next()
	}
	instanceRecordsSdk.PopulateInstanceRecordWithStruct(newInstanceRecord, newInstanceRecordStruct)

	err = e.App.Save(newInstanceRecord)
	if err != nil {
		e.App.Logger().Error("newInstanceRecordErr", "err", err)
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
		return e.Next()
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

func UpdateStripeProductRecordAfterStripeLedgerCreatedEventHandler(e *pbCore.RecordEvent) error {
	e.App.Logger().Info("UpdateStripeProductRecordAfterStripeLedgerCreatedEventHandler")

	stripeLedgerRecord := e.Record
	stripeLedgerRecordStruct := stripeLedgerRecordsSdk.ConvertStripeLedgerRecordToStruct(stripeLedgerRecord)

	if stripeLedgerRecordStruct.EventType == "product.created" {
		stripeProductRecordStruct := stripeProductsSdk.TStripeProductStruct{
			StripeProductId:   stripeLedgerRecordStruct.ProductId,
			StripeProductName: stripeLedgerRecordStruct.ProductName,
		}
		err := stripeProductsSdk.DbCreateStripeProductRecord(e.App, stripeProductRecordStruct)
		if err != nil {
			return fmt.Errorf("stripeProductSdk.DbCreateStripeProductRecord: %w", err)
		}
	}
	if stripeLedgerRecordStruct.EventType == "price.created" {
		stripeProductPriceRecordStruct := stripeProductPricesSdk.TStripeProductPriceRecordStruct{
			StripeProductId:         stripeLedgerRecordStruct.ProductId,
			StripePriceId:           stripeLedgerRecordStruct.StripePriceId,
			RecurrenceInterval:      stripeLedgerRecordStruct.RecurrenceInterval,
			RecurrenceIntervalCount: stripeLedgerRecordStruct.RecurrenceIntervalCount,
			Currency:                stripeLedgerRecordStruct.Currency,
			CostPerUnit:             stripeLedgerRecordStruct.CostPerUnit,
		}
		err := stripeProductPricesSdk.DbCreateStripeProductPriceRecord(e.App, stripeProductPriceRecordStruct)
		if err != nil {
			return fmt.Errorf("stripeProductPricesSdk.DbCreateStripeProductPriceRecord: %w", err)
		}
	}

	if stripeLedgerRecordStruct.EventType == "price.updated" {
		stripeProductPriceRecordStructPointer, err :=
			stripeProductPricesSdk.DbGetStripeProductPriceRecordByStripePriceId(e.App, stripeLedgerRecordStruct.StripePriceId)

		if err != nil {
			return fmt.Errorf("stripeProductPricesSdk.DbGetStripeProductPriceRecordByStripePriceId: %w", err)
		}
		stripeProductPriceRecordStruct := stripeProductPricesSdk.TStripeProductPriceRecordStruct{}
		if stripeProductPriceRecordStructPointer != nil {
			stripeProductPriceRecordStruct = *stripeProductPriceRecordStructPointer
		}

		stripeProductPricesSdk.PopulateStripeProductPriceRecordStructWithStripeLedgerRecordStruct(&stripeProductPriceRecordStruct, stripeLedgerRecordStruct)

		err = stripeProductPricesSdk.DbUpsertStripeProductPrice(e.App, stripeProductPriceRecordStruct)
		if err != nil {
			return fmt.Errorf("stripeProductPricesSdk.DbCreateStripeProductPriceRecord: %w", err)
		}
	}

	return e.Next()
}
