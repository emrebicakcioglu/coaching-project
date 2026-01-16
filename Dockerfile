# Basis-Image: nginx Webserver
FROM nginx:alpine

# Kopiere alle HTML-Dateien in den Container
COPY *.html /usr/share/nginx/html/

# Container lauscht auf Port 80
EXPOSE 80
