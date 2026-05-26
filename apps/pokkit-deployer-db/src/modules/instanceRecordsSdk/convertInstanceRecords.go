package instanceRecordsSdk

import (
	"app-db/src/utils"

	pbCore "github.com/pocketbase/pocketbase/core"
	pbTypes "github.com/pocketbase/pocketbase/tools/types"
)

type TInstanceRecordStruct struct {
	Id                string           `json:"id"`
	InstanceRequestId string           `json:"instanceRequestId"`
	PortNumber        int              `json:"portNumber"`
	Status            string           `json:"status"`
	Created           pbTypes.DateTime `json:"created"`
	Updated           pbTypes.DateTime `json:"updated"`
}

// tested as part of TestConvertStructToInstanceRecordAndBackAgain
func ConvertInstanceRecordToStruct(instanceRecord *pbCore.Record) TInstanceRecordStruct {
	return TInstanceRecordStruct{
		Id:                instanceRecord.GetString("id"),
		PortNumber:        instanceRecord.GetInt("portNumber"),
		InstanceRequestId: instanceRecord.GetString("instanceRequestId"),
		Status:            instanceRecord.GetString("status"),
		Created:           instanceRecord.GetDateTime("created"),
		Updated:           instanceRecord.GetDateTime("updated"),
	}
}

func ConvertInstanceRecordToDataMap(instanceRecord *pbCore.Record) map[string]any {
	paidUntil := instanceRecord.GetDateTime("paidUntil")
	now := pbTypes.NowDateTime()
	isExpired := paidUntil.Before(now)

	dataMap := instanceRecord.FieldsData()
	dataMap["paidUntil"] = paidUntil
	dataMap["isExpired"] = isExpired

	return dataMap
}

func ConvertInstanceRecordsToData(instanceRecords []*pbCore.Record) []map[string]any {
	templatableDataList := []map[string]any{}

	for _, instanceRecord := range instanceRecords {
		templatableData := ConvertInstanceRecordToDataMap(instanceRecord)
		templatableDataList = append(templatableDataList, templatableData)
	}

	return templatableDataList
}

// tested as part of TestConvertStructToInstanceRecordAndBackAgain
func PopulateInstanceRecordWithStruct(record *pbCore.Record, data TInstanceRecordStruct) (*pbCore.Record, error) {
	return utils.PopulateRecord(record, data)
}
