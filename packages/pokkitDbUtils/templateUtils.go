package pokkitDbUtils

import (
	"bytes"
	"text/template"
)

func PopulateTemplate(inputTemplate string, data any) (string, error) {
	funcMap := template.FuncMap{
		"add": func(a, b int) int { return a + b },
	}

	tmpl, err := template.New("test").Funcs(funcMap).Parse(inputTemplate)
	if err != nil {
		return "", err
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return "", err
	}

	return buf.String(), nil
}
