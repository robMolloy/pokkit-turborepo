package utils

import (
	"encoding/json"
	"errors"
	"os"
)

func FileExists(path string) bool {
	_, err := os.Stat(path)
	return !errors.Is(err, os.ErrNotExist)
}

func WriteDataToFileAsJson(filePath string, data any) error {
	jsonData, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(filePath, jsonData, 0644)
}

func ReadJsonFromFile(filePath string) (map[string]any, error) {
	jsonBytes, err := os.ReadFile(filePath)
	if err != nil {
		return nil, err
	}

	result := map[string]any{}

	err = json.Unmarshal([]byte(jsonBytes), &result)
	return result, err
}
