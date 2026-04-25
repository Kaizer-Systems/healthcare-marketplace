FROM nginx:1.27-alpine
RUN apk add --no-cache gettext
COPY infra/nginx/conf/ /etc/nginx/templates/
COPY infra/nginx/snippets/ /etc/nginx/snippets/
COPY infra/docker/nginx/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 80 443
ENTRYPOINT ["/entrypoint.sh"]
