package instanceRecordsSdk

import (
	pbCore "github.com/pocketbase/pocketbase/core"
	pbTypes "github.com/pocketbase/pocketbase/tools/types"
)

type TInstanceRecord struct {
	Id                string           `json:"id"`
	InstanceRequestId string           `json:"instanceRequestId"`
	PortNumber        int              `json:"portNumber"`
	Created           pbTypes.DateTime `json:"created"`
	Updated           pbTypes.DateTime `json:"updated"`
}

func ConvertInstanceRecordToStruct(instanceRecord *pbCore.Record) TInstanceRecord {
	return TInstanceRecord{
		Id:                instanceRecord.GetString("id"),
		PortNumber:        instanceRecord.GetInt("portNumber"),
		InstanceRequestId: instanceRecord.GetString("instanceRequestId"),
		Created:           instanceRecord.GetDateTime("created"),
		Updated:           instanceRecord.GetDateTime("updated"),
	}
}

func ConvertInstanceRecordToData(instanceRecord *pbCore.Record) map[string]any {
	paidUntil := instanceRecord.GetDateTime("paidUntil")
	now := pbTypes.NowDateTime()
	isExpired := paidUntil.Before(now)

	return map[string]any{
		"id":         instanceRecord.GetString("id"),
		"portNumber": instanceRecord.GetInt("portNumber"),
		"appName":    instanceRecord.GetString("appName"),
		"paidUntil":  paidUntil,
		"isExpired":  isExpired,
		"created":    instanceRecord.GetDateTime("created"),
		"updated":    instanceRecord.GetDateTime("updated"),
	}
}

func ConvertInstanceRecordsToData(instanceRecords []*pbCore.Record) []map[string]any {
	templatableDataList := []map[string]any{}

	for _, instanceRecord := range instanceRecords {
		templatableData := ConvertInstanceRecordToData(instanceRecord)
		templatableDataList = append(templatableDataList, templatableData)
	}

	return templatableDataList
}
