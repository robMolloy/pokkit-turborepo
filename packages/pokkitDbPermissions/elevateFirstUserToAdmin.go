package pokkitDbPermissions

import (
	"fmt"

	pbCore "github.com/pocketbase/pocketbase/core"
)

func ElevateFirstUserToApprovedSuperadmin(app pbCore.App, record *pbCore.Record) error {

	records, err := app.FindRecordsByFilter(usersCollectionName, "", "", 2, 0)
	if err != nil {
		return fmt.Errorf("error finding records in ElevateFirstUserToAdmin: %w", err)
	}

	//  will never be 0
	if len(records) == 2 {
		return nil
	}

	globalUserPermissionsCollection, err := app.FindCollectionByNameOrId(globalUserPermissionsCollectionName)
	if err != nil {
		return fmt.Errorf("error finding globalUserPermissions collection in elevateFirstUserToAdmin: %w", err)
	}

	newRecord := pbCore.NewRecord(globalUserPermissionsCollection)
	newRecord.Set("userId", record.Id)
	newRecord.Set("role", "superadmin")
	newRecord.Set("status", "approved")

	err = app.Save(newRecord)
	if err != nil {
		return fmt.Errorf("error saving record in elevateFirstUserToAdmin: %w", err)
	}

	return nil
}
