package pokkitDbDeployer

import (
	pbCore "github.com/pocketbase/pocketbase/core"
)

var _ pbCore.RecordProxy = (*deploymentRecord)(nil)

type deploymentRecord struct {
	pbCore.BaseRecordProxy
}

func (a *deploymentRecord) getId() string {
	return a.GetString("id")
}
func (a *deploymentRecord) getPortNumber() string {
	return a.GetString("portNumber")
}

func convertUnproxiedRecordToDeploymentRecord(unproxiedRecord *pbCore.Record) *deploymentRecord {
	record := &deploymentRecord{}
	record.SetProxyRecord(unproxiedRecord)
	return record
}

func convertUnproxiedRecordsToDeploymentRecords(unproxiedRecords []*pbCore.Record) []*deploymentRecord {
	deploymentRecords := []*deploymentRecord{}
	for _, unproxiedRecord := range unproxiedRecords {
		deploymentRecords = append(deploymentRecords, convertUnproxiedRecordToDeploymentRecord(unproxiedRecord))
	}
	return deploymentRecords
}
func convertDeploymentRecordsToFieldsData(deploymentRecords []*deploymentRecord) []map[string]any {
	fieldsData := []map[string]any{}
	for _, deploymentRecord := range deploymentRecords {
		fieldsData = append(fieldsData, deploymentRecord.FieldsData())
	}
	return fieldsData
}
