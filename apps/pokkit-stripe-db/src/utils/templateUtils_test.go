package utils

import (
	"testing"
)

func TestPopulateTemplate(t *testing.T) {
	resp, err := PopulateTemplate("{{.A}}", struct {
		A string
	}{
		A: "test",
	})

	if err != nil || resp != "test" {
		t.Errorf("resp!=\"test\" => got %v; want %v", resp, "test")
	}
}

func TestPopulateTemplate2(t *testing.T) {
	resp, err := PopulateTemplate("{{.a}}", map[string]string{
		"a": "test",
	})

	if err != nil || resp != "test" {
		t.Errorf("resp!=\"test\" => got %v; want %v", resp, "test")
	}
}

func TestPopulateTemplate3(t *testing.T) {
	resp, err := PopulateTemplate("{{range .}}{{.}}{{end}}", []string{
		"1", "2",
	})

	if err != nil || resp != "12" {
		t.Errorf("resp!=\"12\" => got %v; want %v", resp, "12")
	}
}

func TestPopulateTemplate4(t *testing.T) {
	resp, err := PopulateTemplate("{{range .}}{{.a}}{{end}}", []map[string]string{
		{"a": "1"},
		{"a": "2"},
	})

	if err != nil || resp != "12" {
		t.Errorf("resp!=\"12\" => got %v; want %v", resp, "12")
	}
}
func TestPopulateTemplate5(t *testing.T) {
	resp, err := PopulateTemplate("{{range .}}{{.portNumber}}{{end}}", []map[string]string{
		{"portNumber": "1"},
		{"portNumber": "2"},
	})

	if err != nil || resp != "12" {
		t.Errorf("resp!=\"12\" => got %v; want %v", resp, "12")
	}
}
func TestPopulateTemplate6(t *testing.T) {
	resp, err := PopulateTemplate(`cat <<EOF > file.txt
server {
    listen 80;
    server_name pokkit.cloud;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name pokkit.cloud;

    ssl_certificate /etc/letsencrypt/live/pokkit.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pokkit.cloud/privkey.pem;
{{range .}}
    location /{{ .appName }}/ {
        proxy_pass http://127.0.0.1:{{ .portNumber }}/;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
{{end}}
}
EOF`, []map[string]string{
		{"portNumber": "1", "appName": "one"},
		{"portNumber": "2", "appName": "two"},
	})

	expectedResult := `cat <<EOF > file.txt
server {
    listen 80;
    server_name pokkit.cloud;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name pokkit.cloud;

    ssl_certificate /etc/letsencrypt/live/pokkit.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pokkit.cloud/privkey.pem;

    location /one/ {
        proxy_pass http://127.0.0.1:1/;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /two/ {
        proxy_pass http://127.0.0.1:2/;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

}
EOF`

	if err != nil || resp != expectedResult {
		t.Errorf("err != nil || resp != expectedResult => got %v; want %v", resp, expectedResult)
	}
}
