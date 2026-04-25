#!/bin/bash
# Generate locally-trusted HTTPS certificates via mkcert for the four subdomain hosts.
#
# Usage:
#   bash infra/scripts/certs/generate.sh                   # shared wildcard cert (default)
#   bash infra/scripts/certs/generate.sh --mode=shared
#   bash infra/scripts/certs/generate.sh --mode=dedicated  # one cert per host
#
# Output directory: infra/certs/ (gitignored).
#
# For the "shared" strategy the script writes:
#   infra/certs/wildcard.crt     # cert
#   infra/certs/wildcard.key     # private key
# which covers all four hosts (marketplace.local, seller.local, admin.local, api.local).
#
# For the "dedicated" strategy the script writes one cert per host:
#   infra/certs/<app>.crt
#   infra/certs/<app>.key
# for app in {marketplace,seller,admin,api}.
#
# This matches the structure documented in docs/DOMAINS_AND_SSL.md and the
# per-snippet expectations in infra/nginx/snippets/ssl-*.conf.

set -euo pipefail

MODE="shared"
for arg in "$@"; do
  case "$arg" in
    --mode=shared) MODE="shared" ;;
    --mode=dedicated) MODE="dedicated" ;;
    *)
      echo "Unknown argument: $arg" >&2
      echo "Usage: $0 [--mode=shared|--mode=dedicated]" >&2
      exit 2
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CERT_DIR="$SCRIPT_DIR/../../certs"
mkdir -p "$CERT_DIR"

command -v mkcert >/dev/null 2>&1 || {
  echo "mkcert is required. Install with: brew install mkcert (macOS) or see https://github.com/FiloSottile/mkcert" >&2
  exit 1
}

echo "[certs] Installing mkcert local CA (idempotent)..."
mkcert -install

HOSTS=(marketplace.local seller.local admin.local api.local media.local)

if [ "$MODE" = "shared" ]; then
  echo "[certs] Generating shared wildcard cert for: ${HOSTS[*]}"
  mkcert \
    -cert-file "$CERT_DIR/wildcard.crt" \
    -key-file  "$CERT_DIR/wildcard.key" \
    "${HOSTS[@]}"
  echo "[certs] Shared cert written to:"
  echo "  $CERT_DIR/wildcard.crt"
  echo "  $CERT_DIR/wildcard.key"
else
  for host in "${HOSTS[@]}"; do
    app="${host%%.local}"
    # media is not an app nginx block (served by R2/S3 custom domain) — skip its cert here
    if [ "$app" = "media" ]; then continue; fi
    echo "[certs] Generating dedicated cert for $host..."
    mkcert \
      -cert-file "$CERT_DIR/${app}.crt" \
      -key-file  "$CERT_DIR/${app}.key" \
      "$host"
  done
  echo "[certs] Dedicated certs written to $CERT_DIR/{marketplace,seller,admin,api}.{crt,key}"
fi

echo ""
echo "[certs] Remember to add to /etc/hosts:"
for host in "${HOSTS[@]}"; do
  echo "  127.0.0.1  $host"
done
