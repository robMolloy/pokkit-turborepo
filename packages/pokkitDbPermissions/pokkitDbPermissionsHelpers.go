package pokkitDbPermissions

import (
	"fmt"

	pbCore "github.com/pocketbase/pocketbase/core"
)

var globalUserPermissionsCollectionName = "globalUserPermissions"
var organisationUserPermissionsCollectionName = "organisationUserPermissions"
var organisationsCollectionName = "organisations"
var usersCollectionName = "users"

func mergePokkitPermissionsDbCollectionsFromSchema(app pbCore.App) error {
	err := app.ImportCollectionsByMarshaledJSON([]byte(pokkitPermissionsCollectionsSchema), false)
	if err != nil {
		return fmt.Errorf("Error importing pokkitPermissionsCollectionsSchema in mergePokkitPermissionsDbCollectionsFromSchema: %w", err)
	}

	return nil
}

// func mergePokkitPermissionsDbCollectionsProgrammatically(app pbCore.App) error {
// 	globalUserPermissionsCollection, err := app.FindCollectionByNameOrId(globalUserPermissionsCollectionName)
// 	if err != nil && !os.IsNotExist(err) {
// 		return fmt.Errorf("Error finding globalUserPermissions collection in mergePokkitPermissionsDbCollections: %w", err)
// 	}
// 	organisationUserPermissionsCollection, err := app.FindCollectionByNameOrId(organisationUserPermissionsCollectionName)
// 	if err != nil && !os.IsNotExist(err) {
// 		return fmt.Errorf("Error finding organisationUserPermissions collection in mergePokkitPermissionsDbCollections: %w", err)
// 	}
// 	organisationsCollection, err := app.FindCollectionByNameOrId(organisationsCollectionName)
// 	if err != nil && !os.IsNotExist(err) {
// 		return fmt.Errorf("Error finding organisations collection in mergePokkitPermissionsDbCollections: %w", err)
// 	}

// 	usersCollection, err := app.FindCollectionByNameOrId(usersCollectionName)
// 	if err != nil {
// 		return fmt.Errorf("Error finding users collection in mergePokkitPermissionsDbCollections: %w", err)
// 	}
// 	if globalUserPermissionsCollection == nil {
// 		globalUserPermissionsCollection = pbCore.NewBaseCollection(globalUserPermissionsCollectionName)
// 		globalUserPermissionsCollection.Name = globalUserPermissionsCollectionName
// 		globalUserPermissionsCollection.Fields.Add(&pbCore.RelationField{
// 			Name:       "userId",
// 			RelationTo: usersCollectionName,
// 		})
// 		globalUserPermissionsCollection.Fields.Add(models.NewRelationField("userId", usersCollectionName))
// 		globalUserPermissionsCollection.Fields.Add(models.NewSelectField("role", []string{"standard", "admin", "superadmin"}))
// 		globalUserPermissionsCollection.Fields.Add(models.NewSelectField("status", []string{"pending", "approved", "blocked"}))
// 		err := app.AddCollection(globalUserPermissionsCollection)
// 		if err != nil {
// 			return fmt.Errorf("Error adding globalUserPermissions collection in mergePokkitPermissionsDbCollections: %w", err)
// 		}
// 	}

// 	if organisationsCollection == nil {
// 		organisationsCollection = app.NewCollection()
// 		organisationsCollection.Name = organisationsCollectionName
// 		organisationsCollection.AddField(models.NewIdField("id"))
// 		organisationsCollection.AddField(models.NewTextField("name"))
// 		err := app.AddCollection(organisationsCollection)
// 		if err != nil {
// 			return fmt.Errorf("Error adding organisations collection in mergePokkitPermissionsDbCollections: %w", err)
// 		}
// 	}

// 	if organisationUserPermissionsCollection == nil {
// 		organisationUserPermissionsCollection = app.NewCollection()
// 		organisationUserPermissionsCollection.Name = organisationUserPermissionsCollectionName
// 		organisationUserPermissionsCollection.AddField(models.NewIdField("id"))
// 		organisationUserPermissionsCollection.AddField(models.NewRelationField("userId", usersCollectionName))
// 		organisationUserPermissionsCollection.AddField(models.NewRelationField("organisationId", organisationsCollectionName))
// 		organisationUserPermissionsCollection.AddField(models.NewSelectField("role", []string{"standard", "admin"}))
// 		organisationUserPermissionsCollection.AddField(models.NewSelectField("status", []string{"pending", "approved", "blocked"}))
// 		err := app.AddCollection(organisationUserPermissionsCollection)
// 		if err != nil {
// 			return fmt.Errorf("Error adding organisationUserPermissions collection in mergePokkitPermissionsDbCollections: %w", err)
// 		}
// 		return nil
// 	}
// }
