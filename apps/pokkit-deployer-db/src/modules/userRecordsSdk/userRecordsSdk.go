package userRecordsSdk

import (
	"app-db/src/db"

	pbCore "github.com/pocketbase/pocketbase/core"
	pbTypes "github.com/pocketbase/pocketbase/tools/types"
)

type TUserRecordStruct struct {
	Id              string           `json:"id"`
	Email           string           `json:"email"`
	EmailVisibility bool             `json:"emailVisibility"`
	Verified        bool             `json:"verified"`
	Name            int              `json:"name"`
	Avatar          string           `json:"avatar"`
	Created         pbTypes.DateTime `json:"created"`
	Updated         pbTypes.DateTime `json:"updated"`
}

func ConvertUserRecordToStruct(userBalanceLedgerRecord *pbCore.Record) TUserRecordStruct {
	return TUserRecordStruct{
		Id:              userBalanceLedgerRecord.GetString("id"),
		Email:           userBalanceLedgerRecord.GetString("email"),
		EmailVisibility: userBalanceLedgerRecord.GetBool("emailVisibility"),
		Verified:        userBalanceLedgerRecord.GetBool("verified"),
		Name:            userBalanceLedgerRecord.GetInt("name"),
		Avatar:          userBalanceLedgerRecord.GetString("avatar"),
		Created:         userBalanceLedgerRecord.GetDateTime("created"),
		Updated:         userBalanceLedgerRecord.GetDateTime("updated"),
	}
}

func FindUserRecordStructById(app pbCore.App, userId string) (*TUserRecordStruct, error) {
	user, err := app.FindRecordById(db.UsersCollectionName, userId)
	if err != nil {
		return nil, err
	}

	if user == nil {
		return nil, nil
	}

	userRecordStruct := ConvertUserRecordToStruct(user)
	return &userRecordStruct, nil
}
