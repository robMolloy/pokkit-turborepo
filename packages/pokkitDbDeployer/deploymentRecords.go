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
func (a *deploymentRecord) getPortNumber() int {
	return a.GetInt("portNumber")
}
func (a *deploymentRecord) setPortNumber(portNumber int) {
	a.Set("portNumber", portNumber)
}
func (a *deploymentRecord) getSettingsFileKey() string {
	settingsFileString := a.GetString("settingsFile")
	if settingsFileString == "" {
		return ""
	}
	return a.BaseFilesPath() + "/" + a.GetString("settingsFile")
}
func (a *deploymentRecord) getSecretsFileKey() string {

	secretsFileString := a.GetString("secretsFile")
	if secretsFileString == "" {
		return ""
	}
	return a.BaseFilesPath() + "/" + secretsFileString
}
func (a *deploymentRecord) getCollectionsFileKey() string {
	collectionsFileString := a.GetString("collectionsFile")
	if collectionsFileString == "" {
		return ""
	}
	return a.BaseFilesPath() + "/" + a.GetString("collectionsFile")
}
func (a *deploymentRecord) getBuildFileKey() string {
	buildFileString := a.GetString("buildFile")
	if buildFileString == "" {
		return ""
	}
	return a.BaseFilesPath() + "/" + buildFileString
}
func (a *deploymentRecord) getSuperuserEmail() string {
	return a.GetString("superuserEmail")
}
func (a *deploymentRecord) getSuperuserPassword() string {
	return a.GetString("superuserPassword")
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
