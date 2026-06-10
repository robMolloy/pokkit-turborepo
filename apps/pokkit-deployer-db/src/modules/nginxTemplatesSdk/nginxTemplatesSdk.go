package nginxTemplatesSdk

import (
	"app-db/src/db"
	"app-db/src/modules/instanceRecordsSdk"
	"app-db/src/utils"

	"github.com/pocketbase/dbx"
	pbCore "github.com/pocketbase/pocketbase/core"
	pbTypes "github.com/pocketbase/pocketbase/tools/types"
)

type TNginxTemplateStruct struct {
	ID           string           `db:"id"`
	TemplateBody string           `db:"templateBody"`
	FilePath     string           `db:"filePath"`
	Created      pbTypes.DateTime `db:"created"`
	Updated      pbTypes.DateTime `db:"updated"`
}

func ConvertNginxTemplateToStruct(record *pbCore.Record) TNginxTemplateStruct {
	return TNginxTemplateStruct{
		ID:           record.GetString("id"),
		TemplateBody: record.GetString("templateBody"),
		FilePath:     record.GetString("filePath"),
		Created:      record.GetDateTime("created"),
		Updated:      record.GetDateTime("updated"),
	}
}

func DbGetAllNginxTemplateRecordStructs(app pbCore.App, dbxExpressions ...dbx.Expression) ([]TNginxTemplateStruct, error) {
	nginxTemplateRecordStructs := []TNginxTemplateStruct{}

	nginxTemplateRecords, err := app.FindAllRecords(db.NginxTemplatesCollectionName, dbxExpressions...)

	if err != nil {
		return nil, err
	}

	for _, nginxTemplateRecord := range nginxTemplateRecords {
		nginxTemplateRecordStruct := ConvertNginxTemplateToStruct(nginxTemplateRecord)
		nginxTemplateRecordStructs = append(nginxTemplateRecordStructs, nginxTemplateRecordStruct)
	}

	return nginxTemplateRecordStructs, nil
}

func RebuildAndReloadNginxConfigOnChangeEventHandler(e *pbCore.RecordEvent) error {
	nginxTemplateRecordStructs, err := DbGetAllNginxTemplateRecordStructs(e.App)
	if err != nil {
		e.App.Logger().Error("Error finding nginx template records", "err", err)
		return e.Next()
	}

	allInstanceRecordStructs, err := instanceRecordsSdk.DbGetAllInstanceRecordStructs(e.App)
	if err != nil {
		e.App.Logger().Error("instanceRecordsSdk.DbGetAllInstanceRecordStructs(e.App)", "err", err)
		return e.Next()
	}

	for _, nginxTemplateRecordStruct := range nginxTemplateRecordStructs {
		templateBody := nginxTemplateRecordStruct.TemplateBody
		templateData, err := utils.StructSliceToMapSlice(allInstanceRecordStructs)

		if err != nil {
			e.App.Logger().Error("Error converting instance Record Struct(s) to map/map-slice", "err", err)
			continue
		}

		populatedTemplate, err := utils.PopulateTemplate(templateBody, templateData)
		if err != nil {
			e.App.Logger().Error("Error populating template", "err", err)
			continue
		}

		err = utils.WriteStringToFile(populatedTemplate, nginxTemplateRecordStruct.FilePath)
		if err != nil {
			e.App.Logger().Error("Error writing populated template to file", "err", err)
			continue
		}
	}

	err = utils.ExecuteBashCommand("systemctl reload nginx")
	if err != nil {
		e.App.Logger().Error("Error reloading nginx with new config", "err", err)
	}

	return e.Next()
}
