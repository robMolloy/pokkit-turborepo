package utils

import (
	"bytes"
	"html/template"
)

func PopulateTemplate(inputTemplate string, data any) (string, error) {
	tmpl, err := template.New("test").Parse(inputTemplate)
	if err != nil {
		return "", err
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return "", err
	}

	return buf.String(), nil
}
