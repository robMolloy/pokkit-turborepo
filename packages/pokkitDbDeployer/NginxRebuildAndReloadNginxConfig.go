package pokkitDbDeployer

import (
	"fmt"

	pbCore "github.com/pocketbase/pocketbase/core"
	"github.com/robMolloy/pokkit-turborepo/packages/pokkitDbUtils"
)

func WriteNginxConfigToFile(app pbCore.App) error {
	unproxiedNginxTemplateRecords, err := app.FindAllRecords(nginxTemplatesCollectionName)
	if err != nil {
		return fmt.Errorf("Error finding nginx template records in WriteNginxConfigToFile: %w", err)
	}
	nginxTemplateRecords := convertUnproxiedRecordsToNginxTemplateRecords(unproxiedNginxTemplateRecords)

	unproxiedDeploymentRecords, err := app.FindAllRecords(deploymentsCollectionName)
	if err != nil {
		return fmt.Errorf("Error finding deployment records in WriteNginxConfigToFile: %w", err)
	}
	deploymentRecords := convertUnproxiedRecordsToDeploymentRecords(unproxiedDeploymentRecords)
	deploymentRecordsFieldData := convertDeploymentRecordsToFieldsData(deploymentRecords)

	app.Logger().Info(
		"deploymentRecordsFieldData",
		"deploymentRecordsFieldData",
		deploymentRecordsFieldData,
		"deploymentRecords",
		deploymentRecords,
		"nginxTemplateRecords",
		nginxTemplateRecords,
	)
	for _, nginxTemplateRecord := range nginxTemplateRecords {
		templateBody := nginxTemplateRecord.getTemplateBody()

		populatedTemplate, err := pokkitDbUtils.PopulateTemplate(templateBody, deploymentRecordsFieldData)
		if err != nil {
			return fmt.Errorf("Error populating template in WriteNginxConfigToFile: %w", err)
		}

		nginxTemplateRecordFilePath := nginxTemplateRecord.getFilePath()
		app.Logger().Info("nginxTemplateRecordFilePath", "nginxTemplateRecordFilePath", nginxTemplateRecordFilePath, "populatedTemplate", populatedTemplate)
		err = pokkitDbUtils.WriteStringToFile(populatedTemplate, nginxTemplateRecord.getFilePath())
		if err != nil {
			return fmt.Errorf("Error writing populated template to file in WriteNginxConfigToFile: %w", err)
		}
	}

	return nil
}

func ReloadNginxConfig(app pbCore.App) error {
	err := pokkitDbUtils.ExecuteBashCommand("systemctl reload nginx")
	if err != nil {
		return fmt.Errorf("Error reloading nginx with new config in reloadNginxConfig: %w", err)
	}
	return nil
}
