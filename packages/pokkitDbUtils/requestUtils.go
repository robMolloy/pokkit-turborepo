package pokkitDbUtils

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

func ReadRequestBodyJsonIntoResult[T any](requestBody io.ReadCloser) (T, error) {
	var result T
	defer requestBody.Close()

	data, err := io.ReadAll(requestBody)
	if err != nil {
		return result, err
	}

	err = json.Unmarshal(data, &result)
	return result, err
}
