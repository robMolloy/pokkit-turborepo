package userBalanceLedgerRecords

import (
	pbCore "github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"
)

type UserBalanceLedgerRecordData struct {
	Id              string         `json:"id"`
	UserId          string         `json:"userId"`
	TokenAmount     int            `json:"tokenAmount"`
	Reason          string         `json:"reason"`
	PaymentIntentId string         `json:"paymentIntentId"`
	InstanceId      string         `json:"instanceId"`
	Created         types.DateTime `json:"created"`
	Updated         types.DateTime `json:"updated"`
}

func ConvertUserBalanceLedgerRecordToData(userBalanceLedgerRecord *pbCore.Record) UserBalanceLedgerRecordData {
	return UserBalanceLedgerRecordData{
		Id:              userBalanceLedgerRecord.GetString("id"),
		UserId:          userBalanceLedgerRecord.GetString("userId"),
		TokenAmount:     userBalanceLedgerRecord.GetInt("tokenAmount"),
		Reason:          userBalanceLedgerRecord.GetString("reason"),
		PaymentIntentId: userBalanceLedgerRecord.GetString("paymentIntentId"),
		InstanceId:      userBalanceLedgerRecord.GetString("instanceId"),
		Created:         userBalanceLedgerRecord.GetDateTime("created"),
		Updated:         userBalanceLedgerRecord.GetDateTime("updated"),
	}
}
