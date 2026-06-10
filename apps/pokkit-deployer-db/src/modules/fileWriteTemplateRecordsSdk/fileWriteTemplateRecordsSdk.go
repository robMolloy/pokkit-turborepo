package fileWriteTemplateRecordsSdk

import (
	"app-db/src/db"
	"app-db/src/modules/instanceRecordsSdk"
	"app-db/src/utils"

	"github.com/pocketbase/dbx"
	pbCore "github.com/pocketbase/pocketbase/core"
	pbTypes "github.com/pocketbase/pocketbase/tools/types"
)

type TFileWriteTemplateRecordsStruct struct {
	ID           string           `db:"id"`
	CrudTrigger  string           `db:"crudTrigger"`
	TemplateBody string           `db:"templateBody"`
	PopulatedBy  string           `db:"populatedBy"`
	FilePath     string           `db:"filePath"`
	Created      pbTypes.DateTime `db:"created"`
	Updated      pbTypes.DateTime `db:"updated"`
}

func ConvertFileWriteTemplateRecordsToStruct(record *pbCore.Record) TFileWriteTemplateRecordsStruct {
	return TFileWriteTemplateRecordsStruct{
		ID:           record.GetString("id"),
		CrudTrigger:  record.GetString("crudTrigger"),
		TemplateBody: record.GetString("templateBody"),
		PopulatedBy:  record.GetString("populatedBy"),
		FilePath:     record.GetString("filePath"),
		Created:      record.GetDateTime("created"),
		Updated:      record.GetDateTime("updated"),
	}
}

func DbGetAllFileWriteTemplateRecordStructs(app pbCore.App, dbxExpressions ...dbx.Expression) ([]TFileWriteTemplateRecordsStruct, error) {
	fileWriteTemplateRecordStructs := []TFileWriteTemplateRecordsStruct{}

	fileWriteTemplateRecords, err := app.FindAllRecords(db.FileWriteTemplatesCollectionName, dbxExpressions...)

	if err != nil {
		return nil, err
	}

	for _, fileWriteTemplateRecord := range fileWriteTemplateRecords {
		fileWriteTemplateRecordStruct := ConvertFileWriteTemplateRecordsToStruct(fileWriteTemplateRecord)
		fileWriteTemplateRecordStructs = append(fileWriteTemplateRecordStructs, fileWriteTemplateRecordStruct)
	}

	return fileWriteTemplateRecordStructs, nil
}

func PopulateTemplateAndWriteToFileOnChangeEventHandler(e *pbCore.RecordEvent, dbxExpression dbx.Expression) error {
	instanceRecordStruct := instanceRecordsSdk.ConvertInstanceRecordToStruct(e.Record)

	fileWriteTemplateRecordStructs, err := DbGetAllFileWriteTemplateRecordStructs(e.App, dbxExpression)
	if err != nil {
		e.App.Logger().Error("Error finding file write template records", "err", err)
		return e.Next()
	}

	allInstanceRecordStructs, err := instanceRecordsSdk.DbGetAllInstanceRecordStructs(e.App)
	if err != nil {
		e.App.Logger().Error("instanceRecordsSdk.DbGetAllInstanceRecordStructs(e.App)", "err", err)
		return e.Next()
	}

	for _, fileWriteTemplateRecordStruct := range fileWriteTemplateRecordStructs {
		templateBody := fileWriteTemplateRecordStruct.TemplateBody

		var templateData any
		if fileWriteTemplateRecordStruct.PopulatedBy == "changedRecord" {
			templateData, err = utils.StructToMap(instanceRecordStruct)
		} else {
			templateData, err = utils.StructSliceToMapSlice(allInstanceRecordStructs)
		}

		if err != nil {
			e.App.Logger().Error("Error converting instance Record Struct(s) to map/map-slice", "err", err)
			continue
		}

		populatedTemplate, err := utils.PopulateTemplate(templateBody, templateData)
		if err != nil {
			e.App.Logger().Error("Error populating template", "err", err)
			continue
		}

		err = utils.WriteStringToFile(populatedTemplate, fileWriteTemplateRecordStruct.FilePath)
		if err != nil {
			e.App.Logger().Error("Error writing populated template to file", "err", err)
			continue
		}
	}

	return e.Next()
}

func PopulateTemplateAndWriteToFileOnCreateEventHandler(e *pbCore.RecordEvent) error {
	e.App.Logger().Info("PopulateTemplateAndWriteToFileOnCreateEventHandler")
	return PopulateTemplateAndWriteToFileOnChangeEventHandler(e, dbx.HashExp{"crudTrigger": "create"})
}

func PopulateTemplateAndWriteToFileOnUpdateEventHandler(e *pbCore.RecordEvent) error {
	e.App.Logger().Info("PopulateTemplateAndWriteToFileOnUpdateEventHandler")
	return PopulateTemplateAndWriteToFileOnChangeEventHandler(e, dbx.HashExp{"crudTrigger": "update"})
}

func PopulateTemplateAndWriteToFileOnDeleteEventHandler(e *pbCore.RecordEvent) error {
	e.App.Logger().Info("PopulateTemplateAndWriteToFileOnDeleteEventHandler")
	return PopulateTemplateAndWriteToFileOnChangeEventHandler(e, dbx.HashExp{"crudTrigger": "delete"})
}
