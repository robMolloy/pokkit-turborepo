package userBalanceRecordsSdk

import (
	"app-db/src/db"

	pbCore "github.com/pocketbase/pocketbase/core"
)

func FindUserBalanceRecordAndIncrementTokenAmount(app pbCore.App, userId string, tokenAmountIncrement int) error {
	userBalancesCollection, err := app.FindCollectionByNameOrId(db.UserBalancesCollectionName)
	userBalanceRecord, _ := app.FindRecordById(db.UserBalancesCollectionName, userId)

	// create new record if there isn't one already
	if userBalanceRecord == nil {
		userBalanceRecord = pbCore.NewRecord(userBalancesCollection)
		userBalanceRecord.Set("id", userId)
		userBalanceRecord.Set("userId", userId)
		userBalanceRecord.Set("tokenAmount", 0)
	}
	currentBalanceTokenAmount := userBalanceRecord.GetInt("tokenAmount")
	newBalanceTokenAmount := currentBalanceTokenAmount + tokenAmountIncrement
	userBalanceRecord.Set("tokenAmount", newBalanceTokenAmount)

	if err = app.Save(userBalanceRecord); err != nil {
		return err
	}
	return nil
}
