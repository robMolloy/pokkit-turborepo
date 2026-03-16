package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"os/exec"

	pocketbase "github.com/pocketbase/pocketbase"
	pbApis "github.com/pocketbase/pocketbase/apis"
	pbCore "github.com/pocketbase/pocketbase/core"
)

func transcribeFileFromFilePathAndSaveTranscriptionRecord(App pbCore.App, filePath string, recordID string) {
	cmd := exec.Command(
		"/Users/robert.molloy/Projects/current/whisper.cpp/build/bin/whisper-cli",
		"-m", "/Users/robert.molloy/Projects/current/whisper.cpp/models/ggml-small.bin",
		"-f", filePath,
		"-otxt",
		"-of", "-",
		"-np",
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("Transcription error for record %s: %v\n", recordID, err)
		return
	}

	text := string(output)
	log.Printf("Transcription finished for record %s: %s\n", recordID, text)

	// Save transcription in PocketBase
	audioTranscriptionsCollection, err := App.FindCollectionByNameOrId("audioTranscriptions")
	if err != nil {
		log.Printf("Error finding audioTranscriptions collection: %v\n", err)
		return
	}

	audioTranscriptionRecord := pbCore.NewRecord(audioTranscriptionsCollection)
	audioTranscriptionRecord.Set("id", recordID)
	audioTranscriptionRecord.Set("text", text)

	if err := App.Save(audioTranscriptionRecord); err != nil {
		log.Printf("Error saving transcription for record %s: %v\n", recordID, err)
	}
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return !errors.Is(err, os.ErrNotExist)
}

// ImportCollectionsFromCollectionsFilePath imports collections from pb_data/collections.json.
// If successful, true is returned.
// If this file doesn't exist, a boolean of false is returned.
func ImportCollectionsFromCollectionsFilePath(app pbCore.App) (bool, error) {
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

// WriteCollectionsToCollectionsFilePath writes collections to pb_data/collections.json.
// If successful, true is returned.
// If this file doesn't exist, a boolean of false is returned.
func WriteCollectionsToCollectionsFilePath(app pbCore.App) (bool, error) {
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

func ImportSettingsFromSettingsFilePath(app pbCore.App) (bool, error) {
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

// WriteSettingsToSettingsFilePath writes collections to pb_data/collections.json.
// If successful, true is returned.
// If this file doesn't exist, a boolean of false is returned.
func WriteSettingsToSettingsFilePath(app pbCore.App) (bool, error) {
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

		resp, err := ImportCollectionsFromCollectionsFilePath(app)
		fmt.Println("ImportCollectionsFromCollectionsFilePath", resp, err)

		resp, err = ImportSettingsFromSettingsFilePath(app)
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
			writeResp, writeErr := WriteCollectionsToCollectionsFilePath(e.App)
			fmt.Println("WriteCollectionsToCollectionsFilePath", writeResp, writeErr)
		}

		return nil
	})

	app.OnCollectionAfterUpdateSuccess().BindFunc(func(e *pbCore.CollectionEvent) error {
		fmt.Println("OnCollectionAfterUpdateSuccess")
		e.Next()

		if setupComplete {
			writeResp, writeErr := WriteCollectionsToCollectionsFilePath(e.App)
			fmt.Println("WriteCollectionsToCollectionsFilePath", writeResp, writeErr)
		}

		return nil
	})

	app.OnCollectionAfterDeleteSuccess().BindFunc(func(e *pbCore.CollectionEvent) error {
		fmt.Println("OnCollectionAfterDeleteSuccess")
		e.Next()

		if setupComplete {
			writeResp, writeErr := WriteCollectionsToCollectionsFilePath(e.App)
			fmt.Println("WriteCollectionsToCollectionsFilePath", writeResp, writeErr)
		}

		return nil
	})

	app.OnRecordAfterCreateSuccess("audioRecordings").BindFunc(func(e *pbCore.RecordEvent) error {
		log.Println("OnAudioRecordingRecordAfterCreateSuccess")

		e.Next()

		audioRecordingRecord := e.Record

		fmt.Println(audioRecordingRecord.Get("id"))
		fmt.Println(audioRecordingRecord.Get("fileName"))
		fmt.Println(audioRecordingRecord.BaseFilesPath() + "/" + audioRecordingRecord.GetString("fileName"))

		filePath := app.DataDir() + "/storage/" + audioRecordingRecord.BaseFilesPath() + "/" + audioRecordingRecord.GetString("fileName")
		go transcribeFileFromFilePathAndSaveTranscriptionRecord(e.App, filePath, audioRecordingRecord.GetString("id"))

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

	app.OnRecordCreate("organisationDocuments").BindFunc(func(e *pbCore.RecordEvent) error {
		fmt.Println("OnRecordCreate - organisationDocuments")

		orgDocRecord := e.Record

		unsavedFiles := orgDocRecord.GetUnsavedFiles("file")
		unsavedFile := unsavedFiles[0]
		orgDocRecord.Set("versionNumber", 1)
		orgDocRecord.Set("fileName", unsavedFile.OriginalName)
		orgDocRecord.Set("fileSizeBytes", unsavedFile.Size)

		e.Next()

		if orgDocRecord.Get("id") == nil {
			return e.Next()
		}

		organisationDocumentVersionsCollection, err := e.App.FindCollectionByNameOrId(
			"organisationDocumentVersions",
		)
		if err != nil {
			log.Printf("Error finding organisationDocumentVersions collection: %v\n", err)
			return e.Next()
		}

		organisationDocumentVersionRecord := pbCore.NewRecord(organisationDocumentVersionsCollection)

		organisationDocumentVersionRecord.Set("versionNumber", orgDocRecord.Get("versionNumber"))
		organisationDocumentVersionRecord.Set("file", unsavedFile)
		organisationDocumentVersionRecord.Set("fileName", orgDocRecord.Get("fileName"))
		organisationDocumentVersionRecord.Set("fileSizeBytes", orgDocRecord.Get("fileSizeBytes"))
		organisationDocumentVersionRecord.Set("organisationId", orgDocRecord.Get("organisationId"))
		organisationDocumentVersionRecord.Set("organisationDocumentId", orgDocRecord.Get("id"))
		organisationDocumentVersionRecord.Set("docIdVersionNumberKey", fmt.Sprintf("%s-%s", orgDocRecord.Get("id"), orgDocRecord.Get("versionNumber")))

		return e.App.Save(organisationDocumentVersionRecord)
	})

	app.OnRecordUpdate("organisationDocuments").BindFunc(func(e *pbCore.RecordEvent) error {
		fmt.Println("OnRecordUpdate - organisationDocuments")

		orgDocRecord := e.Record
		original := e.Record.Original()

		unsavedFiles := orgDocRecord.GetUnsavedFiles("file")
		unsavedFile := unsavedFiles[0]
		orgDocRecord.Set("versionNumber", original.GetFloat("versionNumber")+1)
		orgDocRecord.Set("fileName", unsavedFile.OriginalName)
		orgDocRecord.Set("fileSizeBytes", unsavedFile.Size)

		e.Next()

		if orgDocRecord.Get("id") == nil {
			return e.Next()
		}

		organisationDocumentVersionsCollection, err := e.App.FindCollectionByNameOrId(
			"organisationDocumentVersions",
		)
		if err != nil {
			log.Printf("Error finding organisationDocumentVersions collection: %v\n", err)
			return e.Next()
		}

		organisationDocumentVersionRecord := pbCore.NewRecord(organisationDocumentVersionsCollection)

		organisationDocumentVersionRecord.Set("versionNumber", orgDocRecord.Get("versionNumber"))
		organisationDocumentVersionRecord.Set("file", unsavedFile)
		organisationDocumentVersionRecord.Set("fileName", orgDocRecord.Get("fileName"))
		organisationDocumentVersionRecord.Set("fileSizeBytes", orgDocRecord.Get("fileSizeBytes"))
		organisationDocumentVersionRecord.Set("organisationId", orgDocRecord.Get("organisationId"))
		organisationDocumentVersionRecord.Set("organisationDocumentId", orgDocRecord.Get("id"))
		organisationDocumentVersionRecord.Set("docIdVersionNumberKey", fmt.Sprintf("%s-%s", orgDocRecord.Get("id"), orgDocRecord.Get("versionNumber")))

		return e.App.Save(organisationDocumentVersionRecord)
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
