package pokkitDbDeployer

import (
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"

	pbCore "github.com/pocketbase/pocketbase/core"
	pbFilesystem "github.com/pocketbase/pocketbase/tools/filesystem"
	"github.com/robMolloy/pokkit-turborepo/packages/pokkitDbUtils"
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
		deploymentRecord := convertUnproxiedRecordToDeploymentRecord(e.Record)

		err := writeFilesAndDeployPokkitDb(e.App, deploymentRecord)
		if err != nil {
			log.Fatal("error returned from onRecordEventWriteAndDeployPokkitDb in app.OnRecordAfterCreateSuccess(deploymentsCollectionName).BindFunc: %w", err)
		}
		return e.Next()
	})

	app.OnRecordCreate(deploymentsCollectionName).BindFunc(func(e *pbCore.RecordEvent) error {
		deploymentRecord := convertUnproxiedRecordToDeploymentRecord(e.Record)
		portNumber := deploymentRecord.getPortNumber()

		if portNumber <= lowestPortNumber {
			nextPortNumber, err := getNextDeploymentPortNumber(e.App)
			if err != nil {
				log.Fatal("error returned from getNextPortNumber in app.OnRecordCreate(deploymentsCollectionName).BindFunc: %w", err)
			}
			deploymentRecord.setPortNumber(nextPortNumber)
		}

		return e.Next()
	})

	app.OnRecordAfterCreateSuccess(deploymentsCollectionName).BindFunc(func(e *pbCore.RecordEvent) error {
		err := RebuildAndReloadNginxConfig(e.App)
		if err != nil {
			// log.Fatal("error returned from RebuildAndReloadNginxConfig in app.OnRecordAfterCreateSuccess(deploymentsCollectionName).BindFunc: %w", err)
			e.App.Logger().Error("error returned from RebuildAndReloadNginxConfig in app.OnRecordAfterCreateSuccess(deploymentsCollectionName).BindFunc: %w", err)
		}
		return e.Next()
	})

	app.OnTerminate().BindFunc(func(e *pbCore.TerminateEvent) error {
		records, err := e.App.FindAllRecords(deploymentsCollectionName)
		if err != nil {
			log.Fatal("error returned from e.App.FindAllRecords in app.OnTerminate(): %w", err)
		}
		for _, record := range records {
			deploymentRecord := convertUnproxiedRecordToDeploymentRecord(record)
			portNumber := deploymentRecord.getPortNumber()
			pokkitDbUtils.KillProcessByPortNumber(portNumber)
		}

		return e.Next()
	})

}

func writeFilesAndDeployPokkitDb(app pbCore.App, deploymentRecord *deploymentRecord) error {
	deploymentsDir := filepath.Join(app.DataDir(), "..", "_deployments")
	deploymentDir := filepath.Join(deploymentsDir, deploymentRecord.getId())
	pbConfigDir := filepath.Join(deploymentDir, "pb_config")
	err := os.MkdirAll(pbConfigDir, 0755)
	if err != nil {
		return fmt.Errorf("failed to os.MkdirAll(deploymentDir, 0755) in app.OnRecordAfterCreateSuccess(deploymentsCollectionName).BindFunc: %w", err)
	}

	settingsFileKey := deploymentRecord.getSettingsFileKey()
	secretsFileKey := deploymentRecord.getSecretsFileKey()
	collectionsFileKey := deploymentRecord.getCollectionsFileKey()
	buildFileKey := deploymentRecord.getBuildFileKey()

	fsys, err := app.NewFilesystem()
	if err != nil {
		return fmt.Errorf("error returned from e.App.NewFilesystem() in writeFilesAndDeployPokkitDb: %w", err)
	}
	defer fsys.Close()

	pbFilePath := deploymentDir + "/app-db"
	err = writeFileToFileSystemFromKey(fsys, buildFileKey, deploymentDir+"/app-db")
	if err != nil {
		return fmt.Errorf("failed to writeFileToFileSystemFromKey(fsys, buildFileKey, deploymentDir+\"/app-db\") in writeFilesAndDeployPokkitDb: %w", err)
	}

	if settingsFileKey != "" {
		err = writeFileToFileSystemFromKey(fsys, settingsFileKey, deploymentDir+"/pb_config/settings.json")
		if err != nil {
			return fmt.Errorf("failed to writeFileToFileSystemFromKey(fsys, settingsFileKey, deploymentDir+\"/pb_config/settings.json\") in writeFilesAndDeployPokkitDb: %w", err)
		}
	}
	if secretsFileKey != "" {
		err = writeFileToFileSystemFromKey(fsys, secretsFileKey, deploymentDir+"/pb_config/secrets.json")
		if err != nil {
			return fmt.Errorf("failed to writeFileToFileSystemFromKey(fsys, secretsFileKey, deploymentDir+\"/pb_config/secrets.json\") in writeFilesAndDeployPokkitDb: %w", err)
		}
	}

	if collectionsFileKey != "" {
		err = writeFileToFileSystemFromKey(fsys, collectionsFileKey, deploymentDir+"/pb_config/collections.json")
		if err != nil {
			return fmt.Errorf("failed to writeFileToFileSystemFromKey(fsys, collectionsFileKey, deploymentDir+\"/pb_config/collections.json\") in writeFilesAndDeployPokkitDb: %w", err)
		}
	}

	portNumber := deploymentRecord.getPortNumber()

	servePbResp, err := ServePb(pbFilePath, portNumber, filepath.Join(deploymentDir, "log.txt"))
	if err != nil {
		return fmt.Errorf("error returned from ServePb in writeFilesAndDeployPokkitDb: %w", err)
	}
	if servePbResp == nil {
		return fmt.Errorf("servePbResp == nil returned from ServePb in writeFilesAndDeployPokkitDb")
	}

	err = UpsertPbAdminCredentialsFromCli(pbFilePath, deploymentRecord.getSuperuserEmail(), deploymentRecord.getSuperuserPassword())
	if err != nil {
		return fmt.Errorf("error returned from UpsertPbAdminCredentialsFromCli in writeFilesAndDeployPokkitDb: %w", err)
	}

	return nil
}

func writeFileToFileSystemFromKey(fsys *pbFilesystem.System, fileKey string, filePath string) error {
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
