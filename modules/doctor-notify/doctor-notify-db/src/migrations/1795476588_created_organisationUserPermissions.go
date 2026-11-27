package migrations

import (
	"encoding/json/v2"

	"ganigeorgiev.com/pocketbase/pocketbase/core"
	m "ganigeorgiev.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		jsonData := `{
    "id": "pbc_230240349",
    "listRule": "@request.auth.id ?= userId\n\t|| @collection.globalUserPermissions.userId ?= @request.auth.id \n&& @collection.globalUserPermissions.status ?= \"approved\"\n\t|| @collection.organisationUserPermissions.userId ?= @request.auth.id \n&& @collection.organisationUserPermissions.status ?= \"approved\"\n&& @collection.organisationUserPermissions.orgId ?= orgId",
    "viewRule": "@request.auth.id ?= userId\n\t|| @collection.globalUserPermissions.userId ?= @request.auth.id \n&& @collection.globalUserPermissions.status ?= \"approved\"\n\t|| @collection.organisationUserPermissions.userId ?= @request.auth.id \n&& @collection.organisationUserPermissions.status ?= \"approved\"\n&& @collection.organisationUserPermissions.orgId ?= orgId",
    "createRule": "@collection.globalUserPermissions.userId ?= @request.auth.id \n&& @collection.globalUserPermissions.role ?= \"superadmin\" \n&& @collection.globalUserPermissions.status ?= \"approved\"\n\t|| @collection.organisationUserPermissions.userId ?= @request.auth.id \n&& @collection.organisationUserPermissions.role ?= \"admin\"\n&& @collection.organisationUserPermissions.status ?= \"approved\"\n&& @collection.organisationUserPermissions.orgId ?= orgId\n&& @collection.organisationUserPermissions.userId ?!= userId\n",
    "updateRule": "@collection.globalUserPermissions.userId ?= @request.auth.id \n&& @collection.globalUserPermissions.role ?= \"superadmin\" \n&& @collection.globalUserPermissions.status ?= \"approved\"\n&& @request.body.orgId:changed = false\n&& @request.body.userId:changed = false\n  || @collection.organisationUserPermissions.userId ?= @request.auth.id \n&& @collection.organisationUserPermissions.role ?= \"admin\"\n&& @collection.organisationUserPermissions.status ?= \"approved\"\n&& @collection.organisationUserPermissions.orgId ?= orgId\n&& @collection.organisationUserPermissions.userId ?!= userId\n&& @request.body.orgId = orgId\n&& @request.body.userId:changed = false\n",
    "deleteRule": "@collection.globalUserPermissions.userId ?= @request.auth.id \n&& @collection.globalUserPermissions.role ?= \"superadmin\" \n&& @collection.globalUserPermissions.status ?= \"approved\"\n\t|| @collection.organisationUserPermissions.userId ?= @request.auth.id \n&& @collection.organisationUserPermissions.role ?= \"admin\"\n&& @collection.organisationUserPermissions.status ?= \"approved\"\n&& @collection.organisationUserPermissions.orgId ?= orgId\n&& @collection.organisationUserPermissions.userId ?!= userId\n",
    "name": "organisationUserPermissions",
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
        "cascadeDelete": true,
        "collectionId": "pbc_2680520508",
        "help": "",
        "hidden": false,
        "id": "relation982184766",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "orgId",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
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
        "values": ["standard", "admin"]
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
    "indexes": [
      "CREATE UNIQUE INDEX ` + "`" + `idx_2ag063yzee` + "`" + ` ON ` + "`" + `organisationUserPermissions` + "`" + ` (\n  ` + "`" + `orgId` + "`" + `,\n  ` + "`" + `userId` + "`" + `\n)"
    ],
    "system": false
  }`

		collection := &core.Collection{}
		if err := json.Unmarshal([]byte(jsonData), &collection); err != nil {
			return err
		}

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_230240349")
		if err != nil {
			return err
		}

		return app.Delete(collection)
	})
}
