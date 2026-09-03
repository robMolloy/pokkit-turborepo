package pokkitDbDeployer

import (
	"github.com/pocketbase/dbx"
	pbCore "github.com/pocketbase/pocketbase/core"
)

func FindDeployPokkitDbFilesRecordsByFilter(app pbCore.App, filter string, sort string, limit int, offset int, params ...dbx.Params) ([]*deployPokkitDbFilesRecord, error) {
	unproxiedRecords, err := app.FindRecordsByFilter(deployPokkitDbFilesCollectionName, filter, sort, limit, offset, params...)
	if err != nil {
		return nil, err
	}
	return convertUnproxiedRecordsToDeployPokkitDbFilesRecords(unproxiedRecords), nil
}
