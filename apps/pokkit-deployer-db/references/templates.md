# Go templating reference

in order to get an

```
cat <<EOF > file.txt
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

{{- range .Instances }}

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

{{- end }}

}
EOF
```
