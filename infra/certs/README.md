# TLS Certificates

This directory holds the TLS material consumed by the Nginx container at
runtime. Two layouts are supported, selected by the `SSL_CERT_MODE`
environment variable.

> All `*.crt`, `*.key`, and `*.pem` files in this directory are gitignored.
> The `.gitkeep` file preserves the directory in version control.

---

## Modes

### Shared (default) — one wildcard cert for all subdomains

```
infra/certs/
  wildcard.crt
  wildcard.key
```

Covers `*.<PUBLIC_DOMAIN_ROOT>` (e.g. `*.yourdomain.com`). Used by every
Nginx server block via `infra/nginx/snippets/ssl-shared.conf`.

### Dedicated — one cert per subdomain

```
infra/certs/
  marketplace.crt   marketplace.key
  seller.crt        seller.key
  admin.crt         admin.key
  api.crt           api.key
```

Used per-app via `infra/nginx/snippets/ssl-dedicated-<app>.conf`. Useful
when each app has a separate cert authority, OV/EV cert, or rotation
schedule.

The Nginx container's entrypoint script copies the chosen snippet into
`ssl-active-<app>.conf` at startup based on `SSL_CERT_MODE`, so server
blocks reference a stable include path.

---

## Local development (mkcert)

Install [mkcert](https://github.com/FiloSottile/mkcert):

```bash
brew install mkcert nss
mkcert -install
```

Generate certs (run from repo root):

```bash
# Shared wildcard (matches *.local hosts)
bash infra/scripts/certs/generate.sh --mode=shared

# OR dedicated per-host
bash infra/scripts/certs/generate.sh --mode=dedicated
```

Add the local hostnames to `/etc/hosts`:

```
127.0.0.1 marketplace.local seller.local admin.local api.local media.local
```

Then start the local-prod stack:

```bash
SSL_CERT_MODE=shared pnpm dev:local-prod:up
```

---

## Production

For production, source certs from one of:

- **Cloudflare Origin Certificate** (recommended) — long-lived (15 years),
  trusted only by Cloudflare's edge. Generate in Cloudflare dashboard
  under SSL/TLS → Origin Server, drop into this directory.
- **Let's Encrypt** — issue via certbot or acme.sh outside the container,
  mount the renewed material into `infra/certs/` as `wildcard.{crt,key}`
  or per-app files.
- **Commercial CA** (DigiCert, GlobalSign, etc.) — copy the issued
  certificate chain plus private key into the appropriate file names.

Set `SSL_CERT_MODE=shared` (or `dedicated`) in the production environment
and reload Nginx.

---

## Rotation

1. Replace the `.crt` / `.key` pairs in this directory.
2. Reload Nginx: `docker compose -f infra/compose/local-prod/docker-compose.yml exec nginx nginx -s reload`.
3. Verify the new fingerprint:
   ```bash
   echo | openssl s_client -connect marketplace.yourdomain.com:443 -servername marketplace.yourdomain.com 2>/dev/null \
     | openssl x509 -noout -fingerprint -dates
   ```

---

## File summary

| File | Purpose |
|---|---|
| `.gitkeep` | Preserves the directory in git |
| `wildcard.crt` / `wildcard.key` | Shared wildcard cert (mode=shared) |
| `marketplace.crt` / `marketplace.key` | Dedicated cert (mode=dedicated) |
| `seller.crt` / `seller.key` | Dedicated cert (mode=dedicated) |
| `admin.crt` / `admin.key` | Dedicated cert (mode=dedicated) |
| `api.crt` / `api.key` | Dedicated cert (mode=dedicated) |

See [`docs/DOMAINS_AND_SSL.md`](../../docs/DOMAINS_AND_SSL.md) for the
full domain + cert architecture.
