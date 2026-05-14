package instanceRecordsSdk

import (
	"app-db/src/db"
	"fmt"

	pbCore "github.com/pocketbase/pocketbase/core"
)

func DbGetRecordWithHighestPortNumber(app pbCore.App) (*pbCore.Record, error) {
	instanceRecords, err := app.FindRecordsByFilter(
		db.InstancesCollectionName,
		"",
		"-portNumber",
		1,
		0,
	)
	if err != nil {
		return nil, err
	}
	if len(instanceRecords) == 0 {
		return nil, fmt.Errorf("no instance records found")
	}
	return instanceRecords[0], nil
}

func DbGetHighestPortNumber(app pbCore.App) int {
	instanceRecord, err := DbGetRecordWithHighestPortNumber(app)
	if err != nil {
		return 0
	}
	return instanceRecord.GetInt("portNumber")
}

func NewInstanceRecord(app pbCore.App) (*pbCore.Record, error) {
	instanceRecordCollection, err := app.FindCollectionByNameOrId(db.InstancesCollectionName)
	if err != nil {
		app.Logger().Error("app.FindCollectionByNameOrId(db.InstancesCollectionName)", "err", err)
		return nil, err
	}
	newInstanceRecord := pbCore.NewRecord(instanceRecordCollection)
	return newInstanceRecord, nil
}
