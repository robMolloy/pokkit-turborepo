package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"html/template"
	"log"
	"os"
	"os/exec"

	"github.com/pocketbase/dbx"
	pocketbase "github.com/pocketbase/pocketbase"
	pbApis "github.com/pocketbase/pocketbase/apis"
	pbCore "github.com/pocketbase/pocketbase/core"
)

var deploymentsCollectionName = "deployments"
var changedRecordCommandTemplatesCollectionName = "changedRecordCommandTemplates"
var allRecordsCommandTemplatesCollectionName = "allRecordsCommandTemplates"

func convertDeploymentRecordToData(deploymentRecord *pbCore.Record) map[string]any {
	return map[string]any{
		"id":         deploymentRecord.GetString("id"),
		"portNumber": deploymentRecord.GetInt("portNumber"),
		"appName":    deploymentRecord.GetString("appName"),
		"created":    deploymentRecord.GetDateTime("created"),
		"updated":    deploymentRecord.GetDateTime("updated"),
	}
}
func convertDeploymentRecordsToData(deploymentRecords []*pbCore.Record) []map[string]any {
	deploymentRecordsData := []map[string]any{}

	for _, deploymentRecord := range deploymentRecords {
		deploymentRecordData := convertDeploymentRecordToData(deploymentRecord)
		deploymentRecordsData = append(deploymentRecordsData, deploymentRecordData)
	}

	return deploymentRecordsData
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

	data, err := json.Marshal(collectionsData)
	if err != nil {
		return false, err
	}

	err = os.WriteFile(collectionsFilePath, data, 0644)
	if err != nil {
		return false, err
	}
	return true, nil
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

func writeDataToFileAsJson(filePath string, data any) error {
	jsonData, err := json.Marshal(data)
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
		se.Router.GET("/{path...}", pbApis.Static(os.DirFS("./pb_public"), false))

		resp, err := ImportCollectionsFromCollectionsFile(app)
		fmt.Println("ImportCollectionsFromCollectionsFilePath", resp, err)

		resp, err = ImportSettingsFromSettingsFile(app)
		fmt.Println("ImportSettingsFromSettingsFilePath", resp, err)

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

	app.OnRecordAfterCreateSuccess("users").BindFunc(func(e *pbCore.RecordEvent) error {
		log.Println("OnUserRecordAfterCreateSuccess")

		userRecord := e.Record
		userRecordsCount, err := e.App.CountRecords("users")

		if err != nil {
			log.Printf("Error counting user records: %v\n", err)
			return e.Next()
		}

		if userRecordsCount != 1 {
			return e.Next()
		}

		globalUserPermissionsCollection, err := e.App.FindCollectionByNameOrId("globalUserPermissions")
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

	app.OnRecordAfterCreateSuccess(deploymentsCollectionName).BindFunc(func(e *pbCore.RecordEvent) error {
		log.Println("OnDeplymentRecordAfterCreateSuccess - changedRecord")

		commandTemplateRecords, err := app.FindAllRecords(changedRecordCommandTemplatesCollectionName, dbx.HashExp{"crudOperation": "create"})
		if err != nil {
			log.Printf("Error finding changedRecordCommandTemplates records: %v\n", err)
			return e.Next()
		}

		deploymentRecordsData := convertDeploymentRecordToData(e.Record)

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

	app.OnRecordAfterCreateSuccess(deploymentsCollectionName).BindFunc(func(e *pbCore.RecordEvent) error {
		log.Println("OnDeplymentRecordAfterCreateSuccess - all records")

		commandTemplateRecords, err := app.FindAllRecords(allRecordsCommandTemplatesCollectionName, dbx.HashExp{"crudOperation": "create"})
		if err != nil {
			log.Printf("Error finding allRecordCommandTemplates records: %v\n", err)
			return e.Next()
		}
		deploymentRecords, err := app.FindAllRecords(deploymentsCollectionName)
		if err != nil {
			log.Printf("Error finding deployment records: %v\n", err)
			return e.Next()
		}

		deploymentRecordsData := convertDeploymentRecordsToData(deploymentRecords)

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

	app.OnRecordAfterUpdateSuccess(deploymentsCollectionName).BindFunc(func(e *pbCore.RecordEvent) error {
		log.Println("OnDeploymentRecordAfterUpdateSuccess")

		commandTemplateRecords, err := app.FindAllRecords(changedRecordCommandTemplatesCollectionName, dbx.HashExp{"crudOperation": "update"})
		if err != nil {
			log.Printf("Error finding changedRecordCommandTemplates records: %v\n", err)
			return e.Next()
		}

		deploymentRecordsData := convertDeploymentRecordToData(e.Record)

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

	app.OnRecordAfterUpdateSuccess(deploymentsCollectionName).BindFunc(func(e *pbCore.RecordEvent) error {
		log.Println("OnDeplymentRecordAfterUpdateSuccess - all records")

		commandTemplateRecords, err := app.FindAllRecords(allRecordsCommandTemplatesCollectionName, dbx.HashExp{"crudOperation": "update"})
		if err != nil {
			log.Printf("Error finding allRecordCommandTemplates records: %v\n", err)
			return e.Next()
		}
		deploymentRecords, err := app.FindAllRecords(deploymentsCollectionName)
		if err != nil {
			log.Printf("Error finding deployments records: %v\n", err)
			return e.Next()
		}

		deploymentRecordsData := convertDeploymentRecordsToData(deploymentRecords)

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

	app.OnRecordAfterDeleteSuccess(deploymentsCollectionName).BindFunc(func(e *pbCore.RecordEvent) error {
		log.Println("OnDeploymentRecordAfterDeleteSuccess - changedRecord")

		commandTemplateRecords, err := app.FindAllRecords(changedRecordCommandTemplatesCollectionName, dbx.HashExp{"crudOperation": "delete"})
		if err != nil {
			log.Printf("Error finding changedRecordCommandTemplates records: %v\n", err)
			return e.Next()
		}

		deploymentRecordsData := convertDeploymentRecordToData(e.Record)

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

	app.OnRecordAfterDeleteSuccess(deploymentsCollectionName).BindFunc(func(e *pbCore.RecordEvent) error {
		log.Println("OnDeplymentRecordAfterDeleteSuccess - all records")

		commandTemplateRecords, err := app.FindAllRecords(allRecordsCommandTemplatesCollectionName, dbx.HashExp{"crudOperation": "delete"})
		if err != nil {
			log.Printf("Error finding allRecordCommandTemplates records: %v\n", err)
			return e.Next()
		}
		deploymentRecords, err := app.FindAllRecords(deploymentsCollectionName)
		if err != nil {
			log.Printf("Error finding deployments records: %v\n", err)
			return e.Next()
		}

		deploymentRecordsData := convertDeploymentRecordsToData(deploymentRecords)

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

	app.OnRecordCreateRequest("organisations").BindFunc(func(e *pbCore.RecordRequestEvent) error {
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
