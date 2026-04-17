package instanceRecordsSdk

import (
	pbCore "github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"
)

func ConvertInstanceRecordToData(instanceRecord *pbCore.Record) map[string]any {
	paidUntil := instanceRecord.GetDateTime("paidUntil")
	now := types.NowDateTime()
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
