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
			log.Fatal(err)
		}
		return e.Next()
	})

}

func onRecordAfterCreateSuccessDeploymentsCollectionHandler(e *pbCore.RecordEvent) error {
	deploymentsDir := filepath.Join(e.App.DataDir(), "..", "_deployments", e.Record.Id)

	settingsFileKey := e.Record.BaseFilesPath() + "/" + e.Record.GetString("settingsFile")
	secretsFileKey := e.Record.BaseFilesPath() + "/" + e.Record.GetString("secretsFile")
	collectionsFileKey := e.Record.BaseFilesPath() + "/" + e.Record.GetString("collectionsFile")
	buildFileKey := e.Record.BaseFilesPath() + "/" + e.Record.GetString("buildFile")
	if err := os.MkdirAll(deploymentsDir, 0755); err != nil {
		return err
	}

	// initialize the filesystem
	fsys, err := e.App.NewFilesystem()
	if err != nil {
		return fmt.Errorf("error returned from e.App.NewFilesystem() in app.OnRecordAfterCreateSuccess(deploymentsCollectionName).BindFunc: %w", err)
	}
	defer fsys.Close()

	err = writeFileToFileSystemFromKey(fsys, buildFileKey, filepath.Join(deploymentsDir, "app-db"))
	if err != nil {
		return fmt.Errorf("failed to writeFileToFileSystemFromKey(fsys, buildFileKey, filepath.Join(deploymentsDir, 'app-db')) in app.OnRecordAfterCreateSuccess(deploymentsCollectionName).BindFunc: %w", err)
	}
	err = writeFileToFileSystemFromKey(fsys, settingsFileKey, filepath.Join(deploymentsDir, "settings.json"))
	if err != nil {
		return fmt.Errorf("failed to writeFileToFileSystemFromKey(fsys, settingsFileKey, filepath.Join(deploymentsDir, 'settings.json')) in app.OnRecordAfterCreateSuccess(deploymentsCollectionName).BindFunc: %w", err)
	}
	err = writeFileToFileSystemFromKey(fsys, secretsFileKey, filepath.Join(deploymentsDir, "secrets.json"))
	if err != nil {
		return fmt.Errorf("failed to writeFileToFileSystemFromKey(fsys, secretsFileKey, filepath.Join(deploymentsDir, 'secrets.json')) in app.OnRecordAfterCreateSuccess(deploymentsCollectionName).BindFunc: %w", err)
	}
	err = writeFileToFileSystemFromKey(fsys, collectionsFileKey, filepath.Join(deploymentsDir, "collections.json"))
	if err != nil {
		return fmt.Errorf("failed to writeFileToFileSystemFromKey(fsys, collectionsFileKey, filepath.Join(deploymentsDir, 'collections.json')) in app.OnRecordAfterCreateSuccess(deploymentsCollectionName).BindFunc: %w", err)
	}

	portNumber := e.Record.GetInt("portNumber")

	servePbResp, err := ServePb(deploymentsDir, portNumber, filepath.Join(deploymentsDir, "log.txt"))
	if err != nil {
		return fmt.Errorf("error returned from ServePb in app.OnRecordAfterCreateSuccess(deploymentsCollectionName).BindFunc: %w", err)
	}
	if servePbResp == nil {
		return fmt.Errorf("servePbResp == nil returned from ServePb in app.OnRecordAfterCreateSuccess(deploymentsCollectionName).BindFunc")
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
