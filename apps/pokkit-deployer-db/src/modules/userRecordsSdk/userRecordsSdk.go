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

func ConvertUserRecordToStruct(record *pbCore.Record) TUserRecordStruct {
	return TUserRecordStruct{
		Id:              record.GetString("id"),
		Email:           record.GetString("email"),
		EmailVisibility: record.GetBool("emailVisibility"),
		Verified:        record.GetBool("verified"),
		Name:            record.GetInt("name"),
		Avatar:          record.GetString("avatar"),
		Created:         record.GetDateTime("created"),
		Updated:         record.GetDateTime("updated"),
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
