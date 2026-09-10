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
