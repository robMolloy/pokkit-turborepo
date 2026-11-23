package migrations

import (
	"encoding/json/v2"

	"ganigeorgiev.com/pocketbase/pocketbase/core"
	m "ganigeorgiev.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		jsonData := `{
    "id": "pbc_2680520508",
    "listRule": "@request.auth.id = userId\n|| @collection.globalUserPermissions.userId ?= @request.auth.id \n\t&& @collection.globalUserPermissions.status ?= \"approved\" \n|| @collection.globalUserPermissions.userId ?= @request.auth.id \n\t&& @collection.globalUserPermissions.role ?= \"superadmin\"",
    "viewRule": "@request.auth.id = userId\n|| @collection.globalUserPermissions.userId ?= @request.auth.id \n\t&& @collection.globalUserPermissions.status ?= \"approved\" \n|| @collection.globalUserPermissions.userId ?= @request.auth.id \n\t&& @collection.globalUserPermissions.role ?= \"superadmin\"",
    "createRule": "@collection.globalUserPermissions.userId ?= @request.auth.id && \n@collection.globalUserPermissions.role ?= \"superadmin\"",
    "updateRule": "@collection.globalUserPermissions.userId ?= @request.auth.id \n&& @collection.globalUserPermissions.role ?= \"superadmin\"\n&& userId ?!= @request.auth.id \n",
    "deleteRule": "@collection.globalUserPermissions.userId ?= @request.auth.id \n\t&& @collection.globalUserPermissions.role ?= \"superadmin\"\n\t&& userId ?!= @request.auth.id \n|| @collection.globalUserPermissions.userId ?= @request.auth.id \n\t&& @collection.globalUserPermissions.role ?!= \"superadmin\"\n\t&& @collection.globalUserPermissions.status ?= \"approved\"\n\t&& userId ?= @request.auth.id \t\n",
    "name": "globalUserPermissions",
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
        "help": "",
        "hidden": false,
        "id": "select1466534506",
        "maxSelect": 1,
        "name": "role",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": ["standard", "admin", "superadmin"]
      },
      {
        "help": "",
        "hidden": false,
        "id": "select2063623452",
        "maxSelect": 1,
        "name": "status",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": ["blocked", "approved", "pending"]
      },
      {
        "cascadeDelete": true,
        "collectionId": "_pb_users_auth_",
        "help": "",
        "hidden": false,
        "id": "relation1689669068",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "userId",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
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
    "indexes": ["CREATE UNIQUE INDEX ` + "`" + `idx_qqz8nuv4j7` + "`" + ` ON ` + "`" + `globalUserPermissions` + "`" + ` (` + "`" + `userId` + "`" + `)"],
    "system": false
  }`

		collection := &core.Collection{}
		if err := json.Unmarshal([]byte(jsonData), &collection); err != nil {
			return err
		}

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_889091827")
		if err != nil {
			return err
		}

		return app.Delete(collection)
	})
}
