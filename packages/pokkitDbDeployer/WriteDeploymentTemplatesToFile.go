package pokkitDbDeployer

import (
	"fmt"

	pbCore "github.com/pocketbase/pocketbase/core"
	"github.com/robMolloy/pokkit-turborepo/packages/pokkitDbUtils"
)

func WriteDeploymentTemplatesToFile(app pbCore.App) error {
	unproxiedDeploymentTemplateRecords, err := app.FindAllRecords(deploymentTemplatesCollectionName)
	if err != nil {
		return fmt.Errorf("Error finding nginx template records in WriteDeploymentTemplatesToFile: %w", err)
	}
	deploymentTemplateRecords := convertUnproxiedRecordsToDeploymentTemplateRecords(unproxiedDeploymentTemplateRecords)

	deployPokkitDbFilesRecords, err := findAllDeployPokkitDbFilesRecords(app)
	if err != nil {
		return fmt.Errorf("Error finding deployment records in WriteDeploymentTemplatesToFile: %w", err)
	}
	deployPokkitDbFilesRecordsFieldsData := convertDeployPokkitDbFilesRecordsToFieldsData(deployPokkitDbFilesRecords)

	deployViteFilesRecords, err := findAllDeployViteFilesRecords(app)
	if err != nil {
		return fmt.Errorf("Error finding deployment records in WriteDeploymentTemplatesToFile: %w", err)
	}
	deployViteFilesRecordsFieldsData := convertDeployViteFilesRecordsToFieldsData(deployViteFilesRecords)

	deploymentRecordsFieldData := append(deployPokkitDbFilesRecordsFieldsData, deployViteFilesRecordsFieldsData...)

	for _, deploymentTemplateRecord := range deploymentTemplateRecords {
		templateBody := deploymentTemplateRecord.getTemplateBody()

		populatedTemplate, err := pokkitDbUtils.PopulateTemplate(templateBody, deploymentRecordsFieldData)
		if err != nil {
			return fmt.Errorf("Error populating template in WriteDeploymentTemplatesToFile: %w", err)
		}

		err = pokkitDbUtils.WriteStringToFile(populatedTemplate, deploymentTemplateRecord.getFilePath())
		if err != nil {
			return fmt.Errorf("Error writing populated template to file in WriteDeploymentTemplatesToFile: %w", err)
		}
	}

	return nil
}
