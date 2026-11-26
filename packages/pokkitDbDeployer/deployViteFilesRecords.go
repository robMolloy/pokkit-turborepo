package pokkitDbDeployer

import (
	"github.com/pocketbase/dbx"
	pbCore "github.com/pocketbase/pocketbase/core"
)

func FindDeployViteFilesRecordsByFilter(app pbCore.App, filter string, sort string, limit int, offset int, params ...dbx.Params) ([]*deployViteFilesRecord, error) {
	unproxiedRecords, err := app.FindRecordsByFilter(deployViteFilesCollectionName, filter, sort, limit, offset, params...)
	if err != nil {
		return nil, err
	}
	return convertUnproxiedRecordsToDeployViteFilesRecords(unproxiedRecords), nil
}

func findAllDeployViteFilesRecords(app pbCore.App, exprs ...dbx.Expression) ([]*deployViteFilesRecord, error) {
	unproxiedRecords, err := app.FindAllRecords(deployViteFilesCollectionName, exprs...)
	if err != nil {
		return nil, err
	}
	return convertUnproxiedRecordsToDeployViteFilesRecords(unproxiedRecords), nil
}

func convertDeployViteFilesRecordsToFieldsData(deployViteFilesRecords []*deployViteFilesRecord) []map[string]any {
	fieldsData := []map[string]any{}
	for _, deployViteFilesRecord := range deployViteFilesRecords {
		fieldsData = append(fieldsData, deployViteFilesRecord.FieldsData())
	}
	return fieldsData
}
