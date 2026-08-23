package pokkitDbDeployer

import (
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"

	pbCore "github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/filesystem"
)

func BindFunctions(app pbCore.App) {
	app.OnServe().BindFunc(func(e *pbCore.ServeEvent) error {
		err := mergePokkitDbDeployerCollectionsFromSchema(e.App)
		if err != nil {
			log.Fatal("failed to mergePokkitDbDeployerCollectionsFromSchema(e.App) in app.OnServe().BindFunc: %w", err)
		}
		return e.Next()
	})

	app.OnRecordAfterCreateSuccess(deploymentsCollectionName).BindFunc(func(e *pbCore.RecordEvent) error {
		err := onRecordAfterCreateSuccessDeploymentsCollectionHandler(e)
		if err != nil {
			e.App.Logger().Error("error returned from onRecordAfterCreateSuccessDeploymentsCollectionHandler in app.OnRecordAfterCreateSuccess(deploymentsCollectionName).BindFunc: %w", err)
		}
		return e.Next()
	})

	app.OnRecordCreate(deploymentsCollectionName).BindFunc(func(e *pbCore.RecordEvent) error {
		nextPortNumber, err := getNextPortNumber(e.App)
		if err != nil {
			log.Fatal("error returned from getNextPortNumber in app.OnRecordCreate(deploymentsCollectionName).BindFunc: %w", err)
		}
		e.Record.Set("portNumber", nextPortNumber)

		return e.Next()
	})
}

func getNextPortNumber(app pbCore.App) (int, error) {
	records, err := app.FindRecordsByFilter(
		deploymentsCollectionName,
		"",
		"-portNumber",
		1,
		0,
	)
	if err != nil {
		return 0, fmt.Errorf("error returned from app.FindRecordsByFilter in getNextPortNumber: %w", err)
	}

	highestPortNumber := 0
	if len(records) > 0 {
		highestPortNumber = records[0].GetInt("portNumber")
	}

	nextPortNumber := highestPortNumber + 1
	if nextPortNumber < 9000 {
		return 9000, nil
	}
	return nextPortNumber, nil
}

func onRecordAfterCreateSuccessDeploymentsCollectionHandler(e *pbCore.RecordEvent) error {
	deploymentsDir := filepath.Join(e.App.DataDir(), "..", "_deployments")
	deploymentDir := filepath.Join(deploymentsDir, e.Record.Id)
	err := os.MkdirAll(deploymentDir, 0755)
	if err != nil {
		return fmt.Errorf("failed to os.MkdirAll(deploymentDir, 0755) in app.OnRecordAfterCreateSuccess(deploymentsCollectionName).BindFunc: %w", err)
	}

	settingsFileKey := e.Record.GetString("settingsFile")
	secretsFileKey := e.Record.GetString("secretsFile")
	collectionsFileKey := e.Record.GetString("collectionsFile")
	buildFileKey := e.Record.GetString("buildFile")

	fsys, err := e.App.NewFilesystem()
	if err != nil {
		return fmt.Errorf("error returned from e.App.NewFilesystem() in app.OnRecordAfterCreateSuccess(deploymentsCollectionName).BindFunc: %w", err)
	}
	defer fsys.Close()

	buildFileKeyPath := e.Record.BaseFilesPath() + "/" + buildFileKey
	pbFilePath := deploymentDir + "/" + "app-db"
	err = writeFileToFileSystemFromKey(fsys, buildFileKeyPath, filepath.Join(deploymentDir, "app-db"))
	if err != nil {
		return fmt.Errorf("failed to writeFileToFileSystemFromKey(fsys, buildFileKeyPath, filepath.Join(deploymentsDir, 'app-db')) in app.OnRecordAfterCreateSuccess(deploymentsCollectionName).BindFunc: %w", err)
	}

	if settingsFileKey != "" {
		settingsFileKeyPath := e.Record.BaseFilesPath() + "/" + settingsFileKey
		err = writeFileToFileSystemFromKey(fsys, settingsFileKeyPath, filepath.Join(deploymentDir, "settings.json"))
		if err != nil {
			return fmt.Errorf("failed to writeFileToFileSystemFromKey(fsys, settingsFileKey, filepath.Join(deploymentsDir, 'settings.json')) in app.OnRecordAfterCreateSuccess(deploymentsCollectionName).BindFunc: %w", err)
		}
	}
	if secretsFileKey != "" {
		secretsFileKeyPath := e.Record.BaseFilesPath() + "/" + secretsFileKey
		err = writeFileToFileSystemFromKey(fsys, secretsFileKeyPath, filepath.Join(deploymentDir, "secrets.json"))
		if err != nil {
			return fmt.Errorf("failed to writeFileToFileSystemFromKey(fsys, secretsFileKeyPath, filepath.Join(deploymentsDir, 'secrets.json')) in app.OnRecordAfterCreateSuccess(deploymentsCollectionName).BindFunc: %w", err)
		}
	}

	if collectionsFileKey != "" {
		collectionsFileKeyPath := e.Record.BaseFilesPath() + "/" + collectionsFileKey
		err = writeFileToFileSystemFromKey(fsys, collectionsFileKeyPath, filepath.Join(deploymentDir, "collections.json"))
		if err != nil {
			return fmt.Errorf("failed to writeFileToFileSystemFromKey(fsys, collectionsFileKeyPath, filepath.Join(deploymentsDir, 'collections.json')) in app.OnRecordAfterCreateSuccess(deploymentsCollectionName).BindFunc: %w", err)
		}
	}

	portNumber := e.Record.GetInt("portNumber")

	servePbResp, err := ServePb(pbFilePath, portNumber, filepath.Join(deploymentDir, "log.txt"))
	if err != nil {
		return fmt.Errorf("error returned from ServePb in app.OnRecordAfterCreateSuccess(deploymentsCollectionName).BindFunc: %w", err)
	}
	if servePbResp == nil {
		return fmt.Errorf("servePbResp == nil returned from ServePb in app.OnRecordAfterCreateSuccess(deploymentsCollectionName).BindFunc")
	}

	superuserEmail := e.Record.GetString("superuserEmail")
	superuserPassword := e.Record.GetString("superuserPassword")

	err = UpsertPbAdminCredentialsFromCli(pbFilePath, superuserEmail, superuserPassword)
	if err != nil {
		return fmt.Errorf("error returned from UpsertPbAdminCredentialsFromCli in app.OnRecordAfterCreateSuccess(deploymentsCollectionName).BindFunc: %w", err)
	}

	return nil
}

func writeFileToFileSystemFromKey(fsys *filesystem.System, fileKey string, filePath string) error {
	buildFileReader, err := fsys.GetReader(fileKey)
	if err != nil {
		return err
	}
	defer buildFileReader.Close()

	data, err := io.ReadAll(buildFileReader)
	if err != nil {
		return err
	}

	if err := os.WriteFile(filePath, data, 0755); err != nil {
		return err
	}
	return nil
}
