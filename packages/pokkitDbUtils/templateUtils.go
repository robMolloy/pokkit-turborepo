package pokkitDbUtils

import (
	"bytes"
	"text/template"
)

var funcMap = template.FuncMap{
	"add": func(a, b float64) int { return int(a + b) },
}

func PopulateTemplate(inputTemplate string, data any) (string, error) {

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
