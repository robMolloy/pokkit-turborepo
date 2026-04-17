package utils

import (
	"encoding/json"
	"io"
)

func ReadJsonFromRequestBody(requestBody io.ReadCloser) (map[string]any, error) {
	body := requestBody
	data, err := io.ReadAll(body)
	if err != nil {
		return nil, err
	}
	defer body.Close()

	result := map[string]any{}
	err = json.Unmarshal(data, &result)
	return result, err
}
