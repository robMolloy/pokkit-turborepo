package utils

import (
	"encoding/json"
)

func StructToMap(s any) (map[string]any, error) {
	b, err := json.Marshal(s)
	if err != nil {
		return nil, err
	}
	var m map[string]any
	err = json.Unmarshal(b, &m)
	return m, err
}

func StructSliceToMapSlice(s any) ([]map[string]any, error) {
	b, err := json.Marshal(s)
	if err != nil {
		return nil, err
	}
	var m []map[string]any
	err = json.Unmarshal(b, &m)
	return m, err
}
