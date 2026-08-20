package pokkitDbUtils

import (
	"fmt"
	"reflect"

	pbCore "github.com/pocketbase/pocketbase/core"
)

func PopulateRecord[T any](record *pbCore.Record, data T) (*pbCore.Record, error) {
	structValue := reflect.ValueOf(data)
	structType := reflect.TypeOf(data)

	if structType.Kind() != reflect.Struct {
		return nil, fmt.Errorf("PopulateRecord: data must be a struct, got %s", structType.Kind())
	}

	numberOfFields := structType.NumField()

	for fieldIndex := range numberOfFields {
		structField := structType.Field(fieldIndex)
		jsonKey := structField.Tag.Get("json")

		if jsonKey == "" || jsonKey == "-" {
			continue
		}

		fieldValue := structValue.Field(fieldIndex)
		if !fieldValue.IsZero() {
			record.Set(jsonKey, fieldValue.Interface())
		}
	}

	return record, nil
}
