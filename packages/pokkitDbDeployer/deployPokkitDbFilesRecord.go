package pokkitDbDeployer

import (
	pbCore "github.com/pocketbase/pocketbase/core"
)

var _ pbCore.RecordProxy = (*deployPokkitDbFilesRecord)(nil)

type deployPokkitDbFilesRecord struct {
	pbCore.BaseRecordProxy
}

func (a *deployPokkitDbFilesRecord) getId() string {
	return a.GetString("id")
}
func (a *deployPokkitDbFilesRecord) getPortNumber() int {
	return a.GetInt("portNumber")
}
func (a *deployPokkitDbFilesRecord) setPortNumber(portNumber int) {
	a.Set("portNumber", portNumber)
}
func (a *deployPokkitDbFilesRecord) getSslPortNumber() int {
	return a.GetInt("sslPortNumber")
}
func (a *deployPokkitDbFilesRecord) setSslPortNumber(portNumber int) {
	a.Set("sslPortNumber", portNumber)
}

func (a *deployPokkitDbFilesRecord) getSettingsFileKey() string {
	settingsFileString := a.GetString("settingsFile")
	if settingsFileString == "" {
		return ""
	}
	return a.BaseFilesPath() + "/" + a.GetString("settingsFile")
}
func (a *deployPokkitDbFilesRecord) getSecretsFileKey() string {

	secretsFileString := a.GetString("secretsFile")
	if secretsFileString == "" {
		return ""
	}
	return a.BaseFilesPath() + "/" + secretsFileString
}
func (a *deployPokkitDbFilesRecord) getCollectionsFileKey() string {
	collectionsFileString := a.GetString("collectionsFile")
	if collectionsFileString == "" {
		return ""
	}
	return a.BaseFilesPath() + "/" + a.GetString("collectionsFile")
}
func (a *deployPokkitDbFilesRecord) getBuildFileKey() string {
	buildFileString := a.GetString("buildFile")
	if buildFileString == "" {
		return ""
	}
	return a.BaseFilesPath() + "/" + buildFileString
}
func (a *deployPokkitDbFilesRecord) getSuperuserEmail() string {
	return a.GetString("superuserEmail")
}
func (a *deployPokkitDbFilesRecord) getSuperuserPassword() string {
	return a.GetString("superuserPassword")
}

func convertUnproxiedRecordToDeployPokkitDbFilesRecord(unproxiedRecord *pbCore.Record) *deployPokkitDbFilesRecord {
	record := &deployPokkitDbFilesRecord{}
	record.SetProxyRecord(unproxiedRecord)
	return record
}

func convertUnproxiedRecordsToDeployPokkitDbFilesRecords(unproxiedRecords []*pbCore.Record) []*deployPokkitDbFilesRecord {
	deployPokkitDbFilesRecords := []*deployPokkitDbFilesRecord{}
	for _, unproxiedRecord := range unproxiedRecords {
		deployPokkitDbFilesRecords = append(deployPokkitDbFilesRecords, convertUnproxiedRecordToDeployPokkitDbFilesRecord(unproxiedRecord))
	}
	return deployPokkitDbFilesRecords
}
func convertDeployPokkitDbFilesRecordsToFieldsData(deployPokkitDbFilesRecords []*deployPokkitDbFilesRecord) []map[string]any {
	fieldsData := []map[string]any{}
	for _, deployPokkitDbFilesRecord := range deployPokkitDbFilesRecords {
		fieldsData = append(fieldsData, deployPokkitDbFilesRecord.FieldsData())
	}
	return fieldsData
}
