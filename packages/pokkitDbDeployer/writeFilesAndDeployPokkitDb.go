package pokkitDbDeployer

import (
	"fmt"
	"os"
	"path/filepath"

	pbCore "github.com/pocketbase/pocketbase/core"
)

func writeFilesAndDeployPokkitDb(app pbCore.App, deploymentRecord *deploymentRecord) error {
	deploymentsDir := filepath.Join(app.DataDir(), "..", "_deployments")
	deploymentDir := filepath.Join(deploymentsDir, deploymentRecord.getId())

	os.Remove(deploymentDir)

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

func writeFilesAndDeployPokkitDbs(app pbCore.App, deploymentRecords []*deploymentRecord) *[]error {
	errors := []error{}

	for _, deploymentRecord := range deploymentRecords {
		err := writeFilesAndDeployPokkitDb(app, deploymentRecord)
		if err != nil {
			errors = append(errors, fmt.Errorf("error returned from writeFilesAndDeployPokkitDb in writeFilesAndDeployPokkitDbs for deploymentRecord.getId(): %s: %w", deploymentRecord.getId(), err))
		}
	}
	if len(errors) > 0 {
		return &errors
	}
	return nil
}
