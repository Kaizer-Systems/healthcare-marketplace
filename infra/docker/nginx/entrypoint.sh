#!/bin/sh
set -eu

# Resolve host env vars with dev defaults if not provided.
: "${MARKETPLACE_HOST:=marketplace.local}"
: "${SELLER_HOST:=seller.local}"
: "${ADMIN_HOST:=admin.local}"
: "${API_HOST:=api.local}"
: "${SSL_CERT_MODE:=shared}"

export MARKETPLACE_HOST SELLER_HOST ADMIN_HOST API_HOST

# Render per-app server block templates into /etc/nginx/conf.d/.
TEMPLATE_DIR=/etc/nginx/templates
CONF_DIR=/etc/nginx/conf.d

for app in marketplace seller admin api; do
    src="${TEMPLATE_DIR}/${app}.conf.template"
    dst="${CONF_DIR}/${app}.conf"
    if [ -f "$src" ]; then
        envsubst '${MARKETPLACE_HOST} ${SELLER_HOST} ${ADMIN_HOST} ${API_HOST}' < "$src" > "$dst"
    fi
done

# Pick the active cert strategy for each app.
#  - shared:    one ssl-shared.conf for all hosts
#  - dedicated: one ssl-dedicated-<app>.conf per host
case "$SSL_CERT_MODE" in
    shared)
        for app in marketplace seller admin api; do
            cp /etc/nginx/snippets/ssl-shared.conf \
               /etc/nginx/snippets/ssl-active-${app}.conf
        done
        ;;
    dedicated)
        for app in marketplace seller admin api; do
            cp /etc/nginx/snippets/ssl-dedicated-${app}.conf \
               /etc/nginx/snippets/ssl-active-${app}.conf
        done
        ;;
    *)
        echo "SSL_CERT_MODE must be 'shared' or 'dedicated', got: $SSL_CERT_MODE" >&2
        exit 1
        ;;
esac

exec nginx -g 'daemon off;'
