package main

import (
	"app-db/src/db"
	"app-db/src/routes"
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"html/template"
	"io"
	"log"
	"os"
	"os/exec"

	"github.com/pocketbase/dbx"
	pocketbase "github.com/pocketbase/pocketbase"
	pbApis "github.com/pocketbase/pocketbase/apis"
	pbCore "github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"
)

func convertDeploymentRecordToTemplatableData(deploymentRecord *pbCore.Record) map[string]any {
	paidUntil := deploymentRecord.GetDateTime("paidUntil")
	now := types.NowDateTime()
	isExpired := paidUntil.Before(now)

	return map[string]any{
		"id":         deploymentRecord.GetString("id"),
		"portNumber": deploymentRecord.GetInt("portNumber"),
		"appName":    deploymentRecord.GetString("appName"),
		"paidUntil":  paidUntil,
		"isExpired":  isExpired,
		"created":    deploymentRecord.GetDateTime("created"),
		"updated":    deploymentRecord.GetDateTime("updated"),
	}
}
func convertDeploymentRecordsToTemplatableData(deploymentRecords []*pbCore.Record) []map[string]any {
	deploymentRecordsData := []map[string]any{}

	for _, deploymentRecord := range deploymentRecords {
		deploymentRecordData := convertDeploymentRecordToTemplatableData(deploymentRecord)
		deploymentRecordsData = append(deploymentRecordsData, deploymentRecordData)
	}

	return deploymentRecordsData
}

type UserBalanceLedgerLedgerRecordData struct {
	Id              string         `json:"id"`
	UserId          string         `json:"userId"`
	TokenAmount     int            `json:"tokenAmount"`
	Reason          string         `json:"reason"`
	PaymentIntentId string         `json:"paymentIntentId"`
	InstanceId      string         `json:"instanceId"`
	Created         types.DateTime `json:"created"`
	Updated         types.DateTime `json:"updated"`
}

func convertUserBalanceLedgerRecordToData(userBalanceLedgerRecord *pbCore.Record) UserBalanceLedgerLedgerRecordData {
	return UserBalanceLedgerLedgerRecordData{
		Id:              userBalanceLedgerRecord.GetString("id"),
		UserId:          userBalanceLedgerRecord.GetString("userId"),
		TokenAmount:     userBalanceLedgerRecord.GetInt("tokenAmount"),
		Reason:          userBalanceLedgerRecord.GetString("reason"),
		PaymentIntentId: userBalanceLedgerRecord.GetString("paymentIntentId"),
		InstanceId:      userBalanceLedgerRecord.GetString("instanceId"),
		Created:         userBalanceLedgerRecord.GetDateTime("created"),
		Updated:         userBalanceLedgerRecord.GetDateTime("updated"),
	}
}

func populateTemplate(inputTemplate string, data any) (string, error) {
	tmpl, err := template.New("test").Parse(inputTemplate)
	if err != nil {
		return "", err
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return "", err
	}

	return buf.String(), nil
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return !errors.Is(err, os.ErrNotExist)
}

// ImportCollectionsFromCollectionsFile imports collections from pb_data/collections.json.
// If successful, true is returned.
// If this file doesn't exist, a boolean of false is returned.
func ImportCollectionsFromCollectionsFile(app pbCore.App) (bool, error) {
	collectionsFileName := "collections.json"
	collectionsFilePath := fmt.Sprintf("%s/%s", app.DataDir(), collectionsFileName)

	isExist := fileExists(collectionsFilePath)
	if !isExist {
		return false, nil
	}

	// File definitely exists, this will only fail with an error that should be logged
	collectionsData, err := os.ReadFile(collectionsFilePath)
	if err != nil {
		return false, err
	}

	err = app.ImportCollectionsByMarshaledJSON(collectionsData, false)
	if err != nil {
		return false, err
	}

	return true, nil
}

// WriteCollectionsToCollectionsFile writes collections to pb_data/collections.json.
// If successful, true is returned.
// If this file doesn't exist, a boolean of false is returned.
func WriteCollectionsToCollectionsFile(app pbCore.App) (bool, error) {
	collectionsFileName := "collections.json"
	collectionsFilePath := fmt.Sprintf("%s/%s", app.DataDir(), collectionsFileName)

	collectionsData, err := app.FindAllCollections()
	if err != nil {
		return false, err
	}

	err = writeDataToFileAsJson(collectionsFilePath, collectionsData)

	return err == nil, err
}

func SaveSecretsJsonAsEnvVars(app pbCore.App) error {
	fileName := "secrets.json"
	filePath := fmt.Sprintf("%s/%s", app.DataDir(), fileName)
	obj, err := readJsonFromFile(filePath)
	if err != nil {
		return err
	}

	for key, value := range obj {
		strValue := fmt.Sprintf("%v", value)
		os.Setenv(key, strValue)
	}

	return nil
}
func ImportSettingsFromSettingsFile(app pbCore.App) (bool, error) {
	fileName := "settings.json"
	filePath := fmt.Sprintf("%s/%s", app.DataDir(), fileName)

	isExist := fileExists(filePath)
	if !isExist {
		return false, nil
	}

	// File definitely exists, this will only fail with an error that should be logged
	settingsData, err := os.ReadFile(filePath)
	if err != nil {
		return false, err
	}

	settings := app.Settings()
	unmarshalErr := json.Unmarshal(settingsData, settings)
	if unmarshalErr != nil {
		return false, unmarshalErr
	}
	app.Save(settings)

	return true, nil
}

func readJsonFromFile(filePath string) (map[string]any, error) {
	jsonBytes, err := os.ReadFile(filePath)
	if err != nil {
		return nil, err
	}

	result := map[string]any{}

	err = json.Unmarshal([]byte(jsonBytes), &result)
	return result, err
}

func ReadJsonFromRequestBody(requestBody io.ReadCloser) (map[string]any, error) {
	body := requestBody
	data, err := io.ReadAll(body)
	if err != nil {
		return nil, err
	}
	defer body.Close()

	result := map[string]any{}
	err = json.Unmarshal(data, &result)
	return result, err
}

func writeDataToFileAsJson(filePath string, data any) error {
	jsonData, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(filePath, jsonData, 0644)
}

// WriteSettingsToSettingsFile writes collections to pb_data/collections.json.
// If successful, true is returned.
// If this file doesn't exist, a boolean of false is returned.
func WriteSettingsToSettingsFile(app pbCore.App) (bool, error) {
	fileName := "settings.json"
	filePath := fmt.Sprintf("%s/%s", app.DataDir(), fileName)

	settings := app.Settings()

	settingsJson, err := json.Marshal(settings)
	if err != nil {
		return false, err
	}

	err = os.WriteFile(filePath, settingsJson, 0644)
	if err != nil {
		return false, err
	}
	return true, nil
}

var setupComplete = false

func main() {
	app := pocketbase.New()

	app.OnServe().BindFunc(func(se *pbCore.ServeEvent) error {
		// serves static files from the provided public dir (if exists)
		// se.Router.GET("/{path...}", pbApis.Static(os.DirFS("./pb_public"), false))

		se.Router.GET("/hello/{name}", routes.HelloNameRouteHandler)
		se.Router.POST("/bye", routes.ByeNameRouteHandler)
		se.Router.POST("/stripe-webhook", routes.StripeWebHookRouteHandler)
		se.Router.POST("/stripe-create-checkout-session", routes.StripeCreateCheckoutSessionRouteHandler).Bind(pbApis.RequireAuth())
		se.Router.POST("/stripe-retrieve-checkout-session", routes.StripeRetrieveCheckoutSessionRouteHandler).Bind(pbApis.RequireAuth())

		resp, err := ImportCollectionsFromCollectionsFile(app)
		fmt.Println("ImportCollectionsFromCollectionsFilePath", resp, err)

		resp, err = ImportSettingsFromSettingsFile(app)
		fmt.Println("ImportSettingsFromSettingsFilePath", resp, err)

		err = SaveSecretsJsonAsEnvVars(app)
		fmt.Println("SaveSecretsJsonAsEnvVars", err)

		se.Next()

		setupComplete = true
		fmt.Println("Setup complete.")
		return nil
	})

	app.OnSettingsReload().BindFunc(func(e *pbCore.SettingsReloadEvent) error {
		fmt.Println("OnSettingsReload")
		if err := e.Next(); err != nil {
			return err
		}

		if setupComplete {
			writeErr := writeDataToFileAsJson(app.DataDir()+"/settings.json", e.App.Settings())
			fmt.Println("writeDataToFileAsJson", writeErr)
		}

		fmt.Println("OnSettingsReload - after")
		return nil
	})

	app.OnCollectionAfterCreateSuccess().BindFunc(func(e *pbCore.CollectionEvent) error {
		fmt.Println("OnCollectionAfterCreateSuccess")
		e.Next()

		if setupComplete {
			writeResp, writeErr := WriteCollectionsToCollectionsFile(e.App)
			fmt.Println("WriteCollectionsToCollectionsFilePath", writeResp, writeErr)
		}

		return nil
	})

	app.OnCollectionAfterUpdateSuccess().BindFunc(func(e *pbCore.CollectionEvent) error {
		fmt.Println("OnCollectionAfterUpdateSuccess")
		e.Next()

		if setupComplete {
			writeResp, writeErr := WriteCollectionsToCollectionsFile(e.App)
			fmt.Println("WriteCollectionsToCollectionsFilePath", writeResp, writeErr)
		}

		return nil
	})

	app.OnCollectionAfterDeleteSuccess().BindFunc(func(e *pbCore.CollectionEvent) error {
		fmt.Println("OnCollectionAfterDeleteSuccess")
		e.Next()

		if setupComplete {
			writeResp, writeErr := WriteCollectionsToCollectionsFile(e.App)
			fmt.Println("WriteCollectionsToCollectionsFilePath", writeResp, writeErr)
		}

		return nil
	})

	app.OnRecordAfterCreateSuccess(db.UserBalanceLedgerCollectionName).BindFunc(func(e *pbCore.RecordEvent) error {
		log.Println("OnUserBalanceLedgerRecordAfterCreateSuccess")

		userBalanceLedgerRecord := e.Record
		userBalanceLedgerRecordData := convertUserBalanceLedgerRecordToData(userBalanceLedgerRecord)
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

		deploymentRecordsData := convertDeploymentRecordToTemplatableData(e.Record)

		for _, commandTemplateRecord := range commandTemplateRecords {
			bashTemplate := commandTemplateRecord.GetString("bashTemplate")
			bashCommand, err := populateTemplate(bashTemplate, deploymentRecordsData)
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

		deploymentRecordsData := convertDeploymentRecordsToTemplatableData(deploymentRecords)

		for _, commandTemplateRecord := range commandTemplateRecords {
			bashTemplate := commandTemplateRecord.GetString("bashTemplate")
			bashCommand, err := populateTemplate(bashTemplate, deploymentRecordsData)
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

		deploymentRecordsData := convertDeploymentRecordToTemplatableData(e.Record)

		for _, commandTemplateRecord := range commandTemplateRecords {
			bashTemplate := commandTemplateRecord.GetString("bashTemplate")
			bashCommand, err := populateTemplate(bashTemplate, deploymentRecordsData)
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

		deploymentRecordsData := convertDeploymentRecordsToTemplatableData(deploymentRecords)

		for _, commandTemplateRecord := range commandTemplateRecords {
			bashTemplate := commandTemplateRecord.GetString("bashTemplate")
			bashCommand, err := populateTemplate(bashTemplate, deploymentRecordsData)
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

		deploymentRecordsData := convertDeploymentRecordToTemplatableData(e.Record)

		for _, commandTemplateRecord := range commandTemplateRecords {
			bashTemplate := commandTemplateRecord.GetString("bashTemplate")
			bashCommand, err := populateTemplate(bashTemplate, deploymentRecordsData)
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

		deploymentRecordsData := convertDeploymentRecordsToTemplatableData(deploymentRecords)

		for _, commandTemplateRecord := range commandTemplateRecords {
			bashTemplate := commandTemplateRecord.GetString("bashTemplate")
			bashCommand, err := populateTemplate(bashTemplate, deploymentRecordsData)
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
