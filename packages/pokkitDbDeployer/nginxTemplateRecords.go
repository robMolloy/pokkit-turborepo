package pokkitDbDeployer

import (
	pbCore "github.com/pocketbase/pocketbase/core"
)

const nginxTemplatesCollectionName = "nginxTemplates"

var _ pbCore.RecordProxy = (*nginxTemplateRecord)(nil)

type nginxTemplateRecord struct {
	pbCore.BaseRecordProxy
}

func (a *nginxTemplateRecord) getId() string {
	return a.GetString("id")
}
func (a *nginxTemplateRecord) getTemplateBody() string {
	return a.GetString("templateBody")
}
func (a *nginxTemplateRecord) setTemplateBody(templateBody string) {
	a.Set("templateBody", templateBody)
}
func (a *nginxTemplateRecord) getFilePath() string {
	return a.GetString("filePath")
}

// func (a *nginxTemplateRecord) setFilePath(filePath string) {
// 	a.Set("filePath", filePath)
// }
// func (a *nginxTemplateRecord) getCreated() pbTypes.DateTime {
// 	return a.GetDateTime("created")
// }
// func (a *nginxTemplateRecord) getUpdated() pbTypes.DateTime {
// 	return a.GetDateTime("updated")
// }

func convertUnproxiedRecordToNginxTemplateRecord(unproxiedRecord *pbCore.Record) nginxTemplateRecord {
	nginxTemplateRecord := &nginxTemplateRecord{}
	nginxTemplateRecord.SetProxyRecord(unproxiedRecord)
	return *nginxTemplateRecord
}

func convertUnproxiedRecordsToNginxTemplateRecords(unproxiedRecords []*pbCore.Record) []nginxTemplateRecord {
	nginxTemplateRecords := []nginxTemplateRecord{}
	for _, unproxiedRecord := range unproxiedRecords {
		nginxTemplateRecords = append(nginxTemplateRecords, convertUnproxiedRecordToNginxTemplateRecord(unproxiedRecord))
	}
	return nginxTemplateRecords
}
