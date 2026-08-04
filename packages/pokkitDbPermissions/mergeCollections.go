package pokkitDbPermissions

import (
	"fmt"
	"os"

	pbCore "github.com/pocketbase/pocketbase/core"
)

func mergePokkitPermissionsDbCollectionsFromSchema(app pbCore.App) error {
	err := app.ImportCollectionsByMarshaledJSON([]byte(pokkitPermissionsCollectionsSchema), false)
	if err != nil {
		return fmt.Errorf("Error importing pokkitPermissionsCollectionsSchema in mergePokkitPermissionsDbCollectionsFromSchema: %w", err)
	}

	return nil
}

func mergePokkitPermissionsDbCollectionsProgrammatically(app pbCore.App) error {
	globalUserPermissionsCollection, err := app.FindCollectionByNameOrId(globalUserPermissionsCollectionName)
	if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("Error finding globalUserPermissions collection in mergePokkitPermissionsDbCollectionsProgrammatically: %w", err)
	}
	organisationUserPermissionsCollection, err := app.FindCollectionByNameOrId(organisationUserPermissionsCollectionName)
	if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("Error finding organisationUserPermissions collection in mergePokkitPermissionsDbCollectionsProgrammatically: %w", err)
	}
	organisationsCollection, err := app.FindCollectionByNameOrId(organisationsCollectionName)
	if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("Error finding organisations collection in mergePokkitPermissionsDbCollectionsProgrammatically: %w", err)
	}
	usersCollection, err := app.FindCollectionByNameOrId(usersCollectionName)
	if err != nil {
		return fmt.Errorf("Error finding users collection in mergePokkitPermissionsDbCollectionsProgrammatically: %w", err)
	}

	if globalUserPermissionsCollection == nil {
		globalUserPermissionsCollection = pbCore.NewBaseCollection(globalUserPermissionsCollectionName)
		globalUserPermissionsCollection.Name = globalUserPermissionsCollectionName
		globalUserPermissionsCollection.Fields.Add(&pbCore.RelationField{
			Name:         "userId",
			CollectionId: usersCollection.Id,
		})
		globalUserPermissionsCollection.Fields.Add(&pbCore.SelectField{
			Name:   "role",
			Values: []string{"standard", "admin", "superadmin"},
		})
		globalUserPermissionsCollection.Fields.Add(&pbCore.SelectField{
			Name:   "status",
			Values: []string{"pending", "approved", "blocked"},
		})
		err := app.Save(globalUserPermissionsCollection)
		if err != nil {
			return fmt.Errorf("Error adding globalUserPermissions collection in mergePokkitPermissionsDbCollectionsProgrammatically: %w", err)
		}
	}

	if organisationUserPermissionsCollection == nil {
		organisationUserPermissionsCollection = pbCore.NewBaseCollection(organisationUserPermissionsCollectionName)
		organisationUserPermissionsCollection.Name = organisationUserPermissionsCollectionName
		organisationUserPermissionsCollection.Fields.Add(&pbCore.RelationField{
			Name:         "userId",
			CollectionId: usersCollection.Id,
		})
		organisationUserPermissionsCollection.Fields.Add(&pbCore.RelationField{
			Name:         "organisationId",
			CollectionId: organisationsCollection.Id,
		})
		organisationUserPermissionsCollection.Fields.Add(&pbCore.SelectField{
			Name:   "role",
			Values: []string{"standard", "admin"},
		})
		organisationUserPermissionsCollection.Fields.Add(&pbCore.SelectField{
			Name:   "status",
			Values: []string{"pending", "approved", "blocked"},
		})
		err := app.Save(organisationUserPermissionsCollection)
		if err != nil {
			return fmt.Errorf("Error adding organisationUserPermissions collection in mergePokkitPermissionsDbCollectionsProgrammatically: %w", err)
		}
	}

	if organisationsCollection == nil {
		organisationsCollection = pbCore.NewBaseCollection(organisationsCollectionName)
		organisationsCollection.Name = organisationsCollectionName
		organisationsCollection.Fields.Add(&pbCore.TextField{
			Name: "name",
		})
		err := app.Save(organisationsCollection)
		if err != nil {
			return fmt.Errorf("Error adding organisations collection in mergePokkitPermissionsDbCollectionsProgrammatically: %w", err)
		}
	}

	return nil
}
