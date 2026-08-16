package pokkitDbPermissions

import (
	"fmt"

	pbCore "github.com/pocketbase/pocketbase/core"
)

func ElevateOrgCreatorToOrgAdmin(app pbCore.App, userId string, organisationId string) error {
	organisationUserPermissionsCollection, err := app.FindCollectionByNameOrId(organisationUserPermissionsCollectionName)
	if err != nil {
		return fmt.Errorf("error finding organisationUserPermissions collection in elevateOrgCreatorToOrgAdmin: %w", err)
	}

	newRecord := pbCore.NewRecord(organisationUserPermissionsCollection)
	newRecord.Set("userId", userId)
	newRecord.Set("orgId", organisationId)
	newRecord.Set("role", "admin")
	newRecord.Set("status", "approved")

	err = app.Save(newRecord)

	if err != nil {
		return fmt.Errorf("error saving record in elevateOrgCreatorToOrgAdmin: %w", err)
	}

	return nil
}
