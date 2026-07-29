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

func ReadJsonFromFileGeneric[T any](filePath string) (T, error) {
	var result T

	jsonBytes, err := os.ReadFile(filePath)
	if err != nil {
		return result, err
	}

	err = json.Unmarshal(jsonBytes, &result)
	return result, err
}

func WriteStringToFile(contentBodyString string, filePath string) error {
	return os.WriteFile(filePath, []byte(contentBodyString), 0644)
}
