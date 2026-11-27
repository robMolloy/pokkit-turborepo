package migrations

import (
	"encoding/json/v2"

	"ganigeorgiev.com/pocketbase/pocketbase/core"
	m "ganigeorgiev.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		jsonData := `{
    "id": "pbc_1053844701",
    "listRule": "@collection.globalUserPermissions.userId ?= @request.auth.id \n&& @collection.globalUserPermissions.role ?= \"superadmin\"\n\t|| @collection.globalUserPermissions.userId ?= @request.auth.id \n&& @collection.globalUserPermissions.status ?= \"approved\"\n\t|| @collection.organisationUserPermissions.userId ?= @request.auth.id \n&& @collection.organisationUserPermissions.status ?= \"approved\"\n&& @collection.organisationUserPermissions.orgId ?= id\n\t|| @collection.organisationUserPermissions.userId ?= @request.auth.id \n&& @collection.organisationUserPermissions.role ?= \"admin\"\n&& @collection.organisationUserPermissions.orgId ?= id",
    "viewRule": "@collection.globalUserPermissions.userId ?= @request.auth.id \n&& @collection.globalUserPermissions.role ?= \"superadmin\"\n\t|| @collection.globalUserPermissions.userId ?= @request.auth.id \n&& @collection.globalUserPermissions.status ?= \"approved\"\n\t|| @collection.organisationUserPermissions.userId ?= @request.auth.id \n&& @collection.organisationUserPermissions.status ?= \"approved\"\n&& @collection.organisationUserPermissions.orgId ?= id\n\t|| @collection.organisationUserPermissions.userId ?= @request.auth.id \n&& @collection.organisationUserPermissions.role ?= \"admin\"\n&& @collection.organisationUserPermissions.orgId ?= id\n",
    "createRule": "@collection.globalUserPermissions.userId ?= @request.auth.id \n&& @collection.globalUserPermissions.role ?= \"superadmin\"",
    "updateRule": "@collection.globalUserPermissions.userId ?= @request.auth.id \n&& @collection.globalUserPermissions.role ?= \"superadmin\"\n\t|| @collection.organisationUserPermissions.userId ?= @request.auth.id \n&& @collection.organisationUserPermissions.role ?= \"admin\"\n&& @collection.organisationUserPermissions.status ?= \"approved\"",
    "deleteRule": "@collection.globalUserPermissions.userId ?= @request.auth.id \n&& @collection.globalUserPermissions.role ?= \"superadmin\"\n\t|| @collection.organisationUserPermissions.userId ?= @request.auth.id \n&& @collection.organisationUserPermissions.role ?= \"admin\"\n&& @collection.organisationUserPermissions.status ?= \"approved\"\n\n",
    "name": "organisations",
    "type": "base",
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "help": "",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text1579384326",
        "max": 0,
        "min": 0,
        "name": "name",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text1843675174",
        "max": 0,
        "min": 0,
        "name": "description",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "autodate2990389176",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate3332085495",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "indexes": ["CREATE UNIQUE INDEX ` + "`" + `idx_l5jn9kiytc` + "`" + ` ON ` + "`" + `organisations` + "`" + ` (` + "`" + `name` + "`" + `)"],
    "system": false
  }`

		collection := &core.Collection{}
		if err := json.Unmarshal([]byte(jsonData), &collection); err != nil {
			return err
		}

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_1053844701")
		if err != nil {
			return err
		}

		return app.Delete(collection)
	})
}
