package pokkitDbDeployer

import (
	pbCore "github.com/pocketbase/pocketbase/core"
)

var _ pbCore.RecordProxy = (*deployViteFilesRecord)(nil)

type deployViteFilesRecord struct {
	pbCore.BaseRecordProxy
}

func (a *deployViteFilesRecord) getId() string {
	return a.GetString("id")
}
func (a *deployViteFilesRecord) getPortNumber() int {
	return a.GetInt("portNumber")
}
func (a *deployViteFilesRecord) setPortNumber(portNumber int) {
	a.Set("portNumber", portNumber)
}
func (a *deployViteFilesRecord) getSslPortNumber() int {
	return a.GetInt("sslPortNumber")
}
func (a *deployViteFilesRecord) setSslPortNumber(portNumber int) {
	a.Set("sslPortNumber", portNumber)
}

func (a *deployViteFilesRecord) getZipFileKey() string {
	zipFileString := a.GetString("zipFile")
	if zipFileString == "" {
		return ""
	}
	return a.BaseFilesPath() + "/" + zipFileString
}

func convertUnproxiedRecordToDeployViteFilesRecord(unproxiedRecord *pbCore.Record) *deployViteFilesRecord {
	record := &deployViteFilesRecord{}
	record.SetProxyRecord(unproxiedRecord)
	return record
}

func convertUnproxiedRecordsToDeployViteFilesRecords(unproxiedRecords []*pbCore.Record) []*deployViteFilesRecord {
	deployViteFilesRecords := []*deployViteFilesRecord{}
	for _, unproxiedRecord := range unproxiedRecords {
		deployViteFilesRecords = append(deployViteFilesRecords, convertUnproxiedRecordToDeployViteFilesRecord(unproxiedRecord))
	}
	return deployViteFilesRecords
}
