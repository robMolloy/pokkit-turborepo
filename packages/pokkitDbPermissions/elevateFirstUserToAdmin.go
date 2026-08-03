package pokkitDbPermissions

import (
	"fmt"

	pbCore "github.com/pocketbase/pocketbase/core"
)

func ElevateFirstUserToAdmin(app pbCore.App, record *pbCore.Record) error {

	records, err := app.FindRecordsByFilter(usersCollectionName, "", "", 2, 0)
	if err != nil {
		return fmt.Errorf("error finding records in ElevateFirstUserToAdmin: %w", err)
	}

	fmt.Println("errrrror")
	fmt.Println("records", len(records))

	//  will never be 0
	if len(records) == 2 {
		return nil
	}

	_globalUserPermissionsCollection, err := app.FindCollectionByNameOrId(globalUserPermissionsCollectionName)
	if err != nil {
		return fmt.Errorf("error finding globalUserPermissions collection in elevateFirstUserToAdmin: %w", err)
	}
	fmt.Println("errrrror")
	fmt.Println("errrrror")
	fmt.Println("_globalUserPermissionsCollection", _globalUserPermissionsCollection)

	newRecord := pbCore.NewRecord(_globalUserPermissionsCollection)
	newRecord.Set("userId", records[0].Id)
	newRecord.Set("role", "superadmin")
	newRecord.Set("status", "approved")

	err = app.Save(newRecord)
	if err != nil {
		fmt.Println("errrrror123")
		fmt.Println("errrrror123")
		fmt.Println("errrrror123")
		fmt.Println("errrrror123")
		fmt.Println("errrrror123")
		fmt.Println("error saving record in elevateFirstUserToAdmin: %w", err)
		return fmt.Errorf("error saving record in elevateFirstUserToAdmin: %w", err)
	}

	return nil
}
