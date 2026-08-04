package pokkitDbPermissions

import (
	"fmt"

	pbCore "github.com/pocketbase/pocketbase/core"
)

func mergePokkitPermissionsDbCollectionsFromSchema(app pbCore.App) error {
	err := app.ImportCollectionsByMarshaledJSON([]byte(pokkitPermissionsCollectionsSchema), false)
	if err != nil {
		return fmt.Errorf("Error importing pokkitPermissionsCollectionsSchema in mergePokkitPermissionsDbCollectionsFromSchema: %w", err)
	}

	return nil
}

// func mergePokkitPermissionsDbCollectionsProgrammatically(app pbCore.App) error {
// 	globalUserPermissionsCollection, err := app.FindCollectionByNameOrId(globalUserPermissionsCollectionName)
// 	if err != nil && !errors.Is(err, sql.ErrNoRows) {
// 		return fmt.Errorf("Error finding globalUserPermissions collection in mergePokkitPermissionsDbCollectionsProgrammatically: %w", err)
// 	}
// 	organisationUserPermissionsCollection, err := app.FindCollectionByNameOrId(organisationUserPermissionsCollectionName)
// 	if err != nil && !errors.Is(err, sql.ErrNoRows) {
// 		return fmt.Errorf("Error finding organisationUserPermissions collection in mergePokkitPermissionsDbCollectionsProgrammatically: %w", err)
// 	}
// 	organisationsCollection, err := app.FindCollectionByNameOrId(organisationsCollectionName)
// 	if err != nil && !errors.Is(err, sql.ErrNoRows) {
// 		return fmt.Errorf("Error finding organisations collection in mergePokkitPermissionsDbCollectionsProgrammatically: %w", err)
// 	}
// 	usersCollection, err := app.FindCollectionByNameOrId(usersCollectionName)
// 	if err != nil {
// 		return fmt.Errorf("Error finding users collection in mergePokkitPermissionsDbCollectionsProgrammatically: %w", err)
// 	}

// 	if organisationsCollection == nil {
// 		organisationsCollection = pbCore.NewBaseCollection(organisationsCollectionName)
// 		organisationsCollection.Fields.Add(&pbCore.TextField{
// 			Name: "name",
// 		})
// 		organisationsCollection.Fields.Add(&pbCore.TextField{
// 			Name: "description",
// 		})
// 		organisationsCollection.Fields.Add(&pbCore.AutodateField{
// 			Name:     "created",
// 			OnCreate: true,
// 			OnUpdate: false,
// 		})
// 		organisationsCollection.Fields.Add(&pbCore.AutodateField{
// 			Name:     "updated",
// 			OnCreate: true,
// 			OnUpdate: true,
// 		})
// 		err := app.Save(organisationsCollection)
// 		if err != nil {
// 			return fmt.Errorf("Error adding organisations collection in mergePokkitPermissionsDbCollectionsProgrammatically: %w", err)
// 		}
// 	}

// 	if globalUserPermissionsCollection == nil {
// 		globalUserPermissionsCollection = pbCore.NewBaseCollection(globalUserPermissionsCollectionName)
// 		globalUserPermissionsCollection.ListRule = types.Pointer(`@request.auth.id != "" && (
//   @request.auth.id = id ||
//   @collection.globalUserPermissions.id ?= @request.auth.id && @collection.globalUserPermissions.role ?= "admin"
// )`)
// 		globalUserPermissionsCollection.ViewRule = types.Pointer(`@request.auth.id != "" && @request.auth.id = id || @collection.globalUserPermissions.id ?= @request.auth.id && @collection.globalUserPermissions.role ?= "admin"`)
// 		globalUserPermissionsCollection.CreateRule = types.Pointer(`@request.auth.id != "" &&
// @collection.globalUserPermissions.id ?= @request.auth.id &&
// @collection.globalUserPermissions.role ?= "admin"`)
// 		globalUserPermissionsCollection.UpdateRule = types.Pointer(`@request.auth.id != "" &&
// @collection.globalUserPermissions.id ?= @request.auth.id &&
// @collection.globalUserPermissions.role ?= "admin"`)
// 		globalUserPermissionsCollection.DeleteRule = types.Pointer(`@request.auth.id != "" &&
// @collection.globalUserPermissions.id ?= @request.auth.id &&
// @collection.globalUserPermissions.role ?= "admin"`)
// 		globalUserPermissionsCollection.Fields.Add(&pbCore.SelectField{
// 			Name:      "role",
// 			MaxSelect: 1,
// 			Values:    []string{"standard", "admin", "superadmin"},
// 		})
// 		globalUserPermissionsCollection.Fields.Add(&pbCore.SelectField{
// 			Name:      "status",
// 			MaxSelect: 1,
// 			Values:    []string{"blocked", "approved", "pending"},
// 		})
// 		globalUserPermissionsCollection.Fields.Add(&pbCore.RelationField{
// 			Name:          "userId",
// 			CollectionId:  usersCollection.Id,
// 			CascadeDelete: true,
// 			MaxSelect:     1,
// 		})
// 		globalUserPermissionsCollection.Fields.Add(&pbCore.AutodateField{
// 			Name:     "created",
// 			OnCreate: true,
// 			OnUpdate: false,
// 		})
// 		globalUserPermissionsCollection.Fields.Add(&pbCore.AutodateField{
// 			Name:     "updated",
// 			OnCreate: true,
// 			OnUpdate: true,
// 		})
// 		err := app.Save(globalUserPermissionsCollection)
// 		if err != nil {
// 			return fmt.Errorf("Error adding globalUserPermissions collection in mergePokkitPermissionsDbCollectionsProgrammatically: %w", err)
// 		}
// 	}

// 	if organisationUserPermissionsCollection == nil {
// 		organisationUserPermissionsCollection = pbCore.NewBaseCollection(organisationUserPermissionsCollectionName)
// 		organisationUserPermissionsCollection.Fields.Add(&pbCore.RelationField{
// 			Name:         "orgId",
// 			CollectionId: organisationsCollection.Id,
// 			MaxSelect:    1,
// 		})
// 		organisationUserPermissionsCollection.Fields.Add(&pbCore.SelectField{
// 			Name:      "role",
// 			MaxSelect: 1,
// 			Values:    []string{"standard", "admin"},
// 		})
// 		organisationUserPermissionsCollection.Fields.Add(&pbCore.SelectField{
// 			Name:      "status",
// 			MaxSelect: 1,
// 			Values:    []string{"blocked", "approved", "pending"},
// 		})
// 		organisationUserPermissionsCollection.Fields.Add(&pbCore.RelationField{
// 			Name:         "userId",
// 			CollectionId: usersCollection.Id,
// 			MaxSelect:    1,
// 		})
// 		organisationUserPermissionsCollection.Fields.Add(&pbCore.TextField{
// 			Name: "userOrgKey",
// 		})
// 		organisationUserPermissionsCollection.Fields.Add(&pbCore.AutodateField{
// 			Name:     "created",
// 			OnCreate: true,
// 			OnUpdate: false,
// 		})
// 		organisationUserPermissionsCollection.Fields.Add(&pbCore.AutodateField{
// 			Name:     "updated",
// 			OnCreate: true,
// 			OnUpdate: true,
// 		})
// 		organisationUserPermissionsCollection.AddIndex("idx_0UWlVOdDqD", true, "userOrgKey", "")
// 		err := app.Save(organisationUserPermissionsCollection)
// 		if err != nil {
// 			return fmt.Errorf("Error adding organisationUserPermissions collection in mergePokkitPermissionsDbCollectionsProgrammatically: %w", err)
// 		}
// 	}

// 	return nil
// }
