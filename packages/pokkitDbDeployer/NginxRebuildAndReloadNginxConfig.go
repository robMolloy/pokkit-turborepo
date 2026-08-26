package pokkitDbDeployer

import (
	"fmt"

	pbCore "github.com/pocketbase/pocketbase/core"
	"github.com/robMolloy/pokkit-turborepo/apps/pokkit-deployer-db/src/utils"
)

func RebuildAndReloadNginxConfig(app pbCore.App) error {
	unproxiedNginxTemplateRecords, err := app.FindAllRecords(nginxTemplatesCollectionName)
	if err != nil {
		return fmt.Errorf("Error finding nginx template records in RebuildAndReloadNginxConfig: %w", err)
	}
	nginxTemplateRecords := convertUnproxiedRecordsToNginxTemplateRecords(unproxiedNginxTemplateRecords)

	unproxiedDeploymentRecords, err := app.FindAllRecords(deploymentsCollectionName)
	if err != nil {
		return fmt.Errorf("Error finding deployment records in RebuildAndReloadNginxConfig: %w", err)
	}
	deploymentRecords := convertUnproxiedRecordsToDeploymentRecords(unproxiedDeploymentRecords)
	deploymentRecordsFieldData := convertDeploymentRecordsToFieldsData(deploymentRecords)

	for _, nginxTemplateRecord := range nginxTemplateRecords {
		templateBody := nginxTemplateRecord.getTemplateBody()

		populatedTemplate, err := utils.PopulateTemplate(templateBody, deploymentRecordsFieldData)
		if err != nil {
			return fmt.Errorf("Error populating template in RebuildAndReloadNginxConfig: %w", err)
		}

		err = utils.WriteStringToFile(populatedTemplate, nginxTemplateRecord.getFilePath())
		if err != nil {
			return fmt.Errorf("Error writing populated template to file in RebuildAndReloadNginxConfig: %w", err)
		}
	}

	err = utils.ExecuteBashCommand("systemctl reload nginx")
	if err != nil {
		return fmt.Errorf("Error reloading nginx with new config in RebuildAndReloadNginxConfig: %w", err)
	}

	return nil
}
