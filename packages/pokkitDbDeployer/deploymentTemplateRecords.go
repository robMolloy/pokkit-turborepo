package pokkitDbDeployer

import (
	pbCore "github.com/pocketbase/pocketbase/core"
)

const deploymentTemplatesCollectionName = "deploymentTemplates"

var _ pbCore.RecordProxy = (*deploymentTemplateRecord)(nil)

type deploymentTemplateRecord struct {
	pbCore.BaseRecordProxy
}

//	func (a *deploymentTemplateRecord) getId() string {
//		return a.GetString("id")
//	}
func (a *deploymentTemplateRecord) getTemplateBody() string {
	return a.GetString("templateBody")
}

//	func (a *deploymentTemplateRecord) setTemplateBody(templateBody string) {
//		a.Set("templateBody", templateBody)
//	}
func (a *deploymentTemplateRecord) getFilePath() string {
	return a.GetString("filePath")
}

// func (a *deploymentTemplateRecord) setFilePath(filePath string) {
// 	a.Set("filePath", filePath)
// }
// func (a *deploymentTemplateRecord) getCreated() pbTypes.DateTime {
// 	return a.GetDateTime("created")
// }
// func (a *deploymentTemplateRecord) getUpdated() pbTypes.DateTime {
// 	return a.GetDateTime("updated")
// }

func convertUnproxiedRecordToDeploymentTemplateRecord(unproxiedRecord *pbCore.Record) deploymentTemplateRecord {
	deploymentTemplateRecord := &deploymentTemplateRecord{}
	deploymentTemplateRecord.SetProxyRecord(unproxiedRecord)
	return *deploymentTemplateRecord
}

func convertUnproxiedRecordsToDeploymentTemplateRecords(unproxiedRecords []*pbCore.Record) []deploymentTemplateRecord {
	deploymentTemplateRecords := []deploymentTemplateRecord{}
	for _, unproxiedRecord := range unproxiedRecords {
		deploymentTemplateRecords = append(deploymentTemplateRecords, convertUnproxiedRecordToDeploymentTemplateRecord(unproxiedRecord))
	}
	return deploymentTemplateRecords
}
