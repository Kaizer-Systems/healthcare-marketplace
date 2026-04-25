# Scaffold-to-Specification Remediation Report

This report captures the audit of the initial scaffold against the authoritative documents in `docs/ai-context/` (TECH_STACK, INFRA_AND_DEPLOYMENT, DEV_MODES_AND_COMMANDS, SECURITY_COMPLIANCE, DATA_MODELS, SEO_IMPLEMENTATION, IMPLEMENTATION_ROADMAP, PROJECT_STRUCTURE), the remediation executed on 2026-04-11, and the final state of each finding.

All 31 identified discrepancies have been resolved. Structural domain + SSL work has also been added per user request.

---

## 1. Summary

| Area | Findings | Status |
|---|---|---|
| Port assignments | 10 files wrong | ✅ Fixed |
| `packages/auth` structure | 8 missing folders/files | ✅ Fixed |
| Root `package.json` scripts | 7 missing/wrong | ✅ Fixed |
| Env files & `packages/config` schema | 6 missing flags, compliance defaults wrong | ✅ Fixed |
| Docker Compose filenames | 5 misnamed | ✅ Fixed |
| nginx config | Path-based instead of hostname-based, missing snippets | ✅ Fixed |
| GitHub workflows | 9 of 10 missing | ✅ Fixed |
| Worker HTTP listener | Exposed port in prod | ✅ Fixed |
| Minor naming (`runner.ts`, `generate.sh`, `seed`) | 3 misnamed | ✅ Fixed |
| Domains + SSL certificate layout (new scope) | Missing entirely | ✅ Added |

Validation: `pnpm install`, `pnpm typecheck` (28 tasks ✓), `pnpm test` (28 tasks ✓) all green after remediation.

---

## 2. Findings and fixes

### 2.1 Port assignments (INFRA_AND_DEPLOYMENT §3, DEV_MODES §2)

Spec: marketplace 3000, seller **3001**, admin **3002**, api **4000**, worker no external port.

| File | Before | After |
|---|---|---|
| `apps/web/web-seller/package.json` | 3002 | 3001 |
| `apps/web/web-admin/package.json` | 3003 | 3002 |
| `apps/api/src/main/main.ts` | 3001 | 4000 |
| `apps/api/src/config/app.config.ts` | 3001 | 4000 |
| `apps/api/.env.example` | 3001 | 4000 |
| `env/.env.base` `PORT` + `NEXT_PUBLIC_API_URL` | 3001 | 4000 |
| `env/.env.prod.example` `PORT` | 3001 | 4000 |
| 3 × `apps/web/*/.env.example` `NEXT_PUBLIC_API_URL` | 3001, `NEXTAUTH_URL` 3002/3003 | 4000, 3001/3002 |
| `infra/docker/api/Dockerfile` EXPOSE | 3001 | 4000 |
| `infra/docker/web-seller/Dockerfile` EXPOSE | 3002 | 3001 |
| `infra/docker/web-admin/Dockerfile` EXPOSE | 3003 | 3002 |
| `infra/docker/worker/Dockerfile` EXPOSE | 3005 | removed (headless) |
| `infra/compose/local-prod/docker-compose.yml` expose | 3001/3002/3003 | 3001/3002/4000 |
| `infra/nginx/conf/default.conf` upstreams | 3001/3002/3003 | 3001/3002/4000 (file later replaced per §2.6) |
| `infra/scripts/health/check-health.sh` curl ports | 3001/3002/3003 | 3001/3002/4000 |

Also fixed: the three frontend `package.json` files had broken `dotenv -e ../../env/...` paths (they needed `../../../env/...` because they live at `apps/web/<app>/`). Normalized.

### 2.2 `packages/auth` restructure (SECURITY_COMPLIANCE §11.3)

Replaced the flat `authjs / guards / roles / sessions / mfa` layout with the specified hierarchy. Stub functions throw `NOT_IMPLEMENTED: <path>` so activation is a body-only change.

```
packages/auth/src/
├─ authjs/            config.ts, adapter.ts, index.ts
├─ providers/         credentials (active), email-otp, phone-otp, google, webauthn, index
├─ factors/           email-otp (active), phone-otp, totp, magic-link, index
├─ session/           session.types.ts (PlatformSession), session.helpers.ts, index.ts
├─ guards/            auth.guard.ts, role.guard.ts, mfa.guard.ts, index.ts
├─ roles/             roles.constants.ts, roles.helpers.ts, index.ts
├─ otp/               otp.service.ts, otp.store.ts, index.ts
├─ passwords/         hash.ts (ARGON2_OPTIONS), verify.ts, index.ts
└─ index.ts           re-exports every subfolder
```

Session shape matches §11.4 exactly (`method`, `verified`, `factorUsed`, `mfaEnrolled`, `sessionId`, timestamps). Auth.js session config set to `strategy: 'database'`, `maxAge: 30*60`, `updateAge: 5*60` per §11.8.

### 2.3 Root `package.json` scripts (DEV_MODES §10)

Before: incomplete `dev:local-prod`, missing `infra:up:module`, `infra:certs`, `db:seed:accounts`, wrong `db:seed` target, `dev:lite` ran across every workspace, `infra:down` missed dev-module.

After: all 26 scripts per spec table (§10). `dev:lite` filtered to the three web apps. Compose paths updated to the renamed `docker-compose.yml` files. `db:seed` routes through `pnpm --filter database run seed`.

### 2.4 Env files + `packages/config` schema (DEV_MODES §3–§4)

Added missing flags: `USE_REAL_AUTH`, `USE_REAL_SEARCH`, `USE_REAL_STORAGE`, `USE_REAL_QUEUE`, `ENABLE_EDGE_CACHE_HINTS`. Flipped `.env.base` compliance flags (`ENABLE_CONSENT_MANAGEMENT`, GDPR, DPDP, etc.) from `false` → `true` per §3 so every mode inherits a compliant baseline. Added `NODE_ENV=development`. Added domain + SSL vars (`PUBLIC_DOMAIN_ROOT`, `ENV_SUBDOMAIN_PREFIX`, `MARKETPLACE_HOST`, `SELLER_HOST`, `ADMIN_HOST`, `API_HOST`, `MEDIA_HOST`, `SSL_CERT_MODE`).

Zod schema in `packages/config/src/env/env.ts` extended to validate all new fields with sensible defaults. Exported `getDomainConfig()` from `packages/config/src/domains/domains.ts` and re-exported from package root.

### 2.5 Docker Compose filenames (DEV_MODES §15)

Renamed all five compose files to `docker-compose.yml` (one per directory):

| Dir | Before | After |
|---|---|---|
| `infra/compose/base/` | `docker-compose.base.yml` | `docker-compose.yml` |
| `infra/compose/dev-lite/` | `docker-compose.dev-lite.yml` | `docker-compose.yml` |
| `infra/compose/dev-module/` | `docker-compose.dev-module.yml` | `docker-compose.yml` |
| `infra/compose/dev-integrated/` | `docker-compose.dev-integrated.yml` | `docker-compose.yml` |
| `infra/compose/local-prod/` | `docker-compose.local-prod.yml` | `docker-compose.yml` |

All root scripts updated to match.

### 2.6 nginx configuration (INFRA_AND_DEPLOYMENT §7, DEV_MODES §9)

Replaced the single path-prefixed `default.conf` with per-app server-block templates:

```
infra/nginx/
├─ conf/
│  ├─ marketplace.conf.template
│  ├─ seller.conf.template
│  ├─ admin.conf.template
│  └─ api.conf.template
└─ snippets/
   ├─ ssl.conf                       TLS protocols/ciphers baseline
   ├─ ssl-shared.conf                shared wildcard cert paths
   ├─ ssl-dedicated-marketplace.conf per-host cert paths
   ├─ ssl-dedicated-seller.conf
   ├─ ssl-dedicated-admin.conf
   ├─ ssl-dedicated-api.conf
   ├─ security-headers.conf          X-Frame, XCTO, XSS, Referrer, Permissions, HSTS
   └─ proxy-params.conf              Host, X-Real-IP, X-Forwarded-*, upgrade, timeouts
```

A new `infra/docker/nginx/entrypoint.sh` runs `envsubst` to materialize `/etc/nginx/conf.d/<app>.conf` from each `.conf.template`, substituting `${MARKETPLACE_HOST}`, `${SELLER_HOST}`, `${ADMIN_HOST}`, `${API_HOST}`. It then copies the correct `ssl-shared.conf` or `ssl-dedicated-<app>.conf` to `ssl-active-<app>.conf` based on `SSL_CERT_MODE`. nginx starts `daemon off`. Dockerfile updated to `apk add gettext` and run the custom entrypoint.

This gives hostname-based routing without any source edits between environments; flipping from `marketplace.local` to `marketplace.yourdomain.com` is just an env var change.

### 2.7 GitHub workflows (INFRA_AND_DEPLOYMENT §9)

Before: single `ci.yml`. After: 10 workflow files per spec §9.1.

- `ci-pr.yml` — PR validation (lint + typecheck + unit)
- `ci-main.yml` — main/develop CI with e2e and image build
- `deploy-staging.yml` — develop push triggers droplet deploys + smoke check
- `deploy-production.yml` — tagged release deploy with required approval gate
- `reusable-setup.yml`, `reusable-test.yml`, `reusable-build-images.yml`, `reusable-deploy.yml`, `reusable-smoke-check.yml` — four reusable workflow pieces per §9.6–§9.10
- `dependency-audit.yml` — weekly `pnpm audit` cron

Image tag naming uses `ghcr.io/<owner>/grip-health/<app>:<sha|latest>`. SSH deploy uses `appleboy/ssh-action@v1`.

### 2.8 Worker HTTP listener (INFRA_AND_DEPLOYMENT §2)

Spec: worker has no external port. Scaffold was starting Fastify on 3005 unconditionally.

Rewrote `apps/worker/src/main/main.ts`: by default starts `NestApplicationContext` (headless). Adds SIGTERM/SIGINT graceful shutdown. Only when `WORKER_ENABLE_HEALTH_HTTP=true` does it create a Fastify app with `/health` — opt-in for dev debugging. Dockerfile removed `EXPOSE 3005`.

### 2.9 Minor naming

| What | Before | After |
|---|---|---|
| Seed runner filename | `packages/database/src/seeds/run-seeds.ts` | `runner.ts` |
| Seed runner supports `--accounts-only` | no | yes |
| `packages/database` script | `db:seed` | `seed` + `seed:accounts` |
| mkcert script | `infra/scripts/certs/generate-certs.sh` | `generate.sh` (with `--mode=shared|dedicated`) |

### 2.10 Domains and SSL (new scope added at user request)

Problem: scaffold had no first-class model for domains or certs. Every environment requires per-app hostnames and certificate material, and the user wanted to keep `yourdomain.com` as a placeholder while supporting **both** shared-wildcard and dedicated-per-subdomain strategies.

Added:

1. Env-driven domain resolution (see §2.4). All hostnames computed from `PUBLIC_DOMAIN_ROOT` + per-app `*_HOST` vars.
2. `SSL_CERT_MODE=shared|dedicated` env flag.
3. nginx snippet structure supporting both modes (see §2.6). No config edits to swap modes.
4. `infra/certs/` directory with README documenting both layouts, plus `.gitkeep` to preserve it through fresh clones. `.gitignore` continues to block `*.pem`, `*.key`, `*.crt`.
5. `infra/scripts/certs/generate.sh` takes `--mode=shared|dedicated` and generates the right files for `marketplace.local`, `seller.local`, `admin.local`, `api.local`, `media.local` via mkcert.
6. `docs/DOMAINS_AND_SSL.md` — full reference: hostname map per environment (Mermaid diagram), env var list, both cert strategies with Cloudflare Origin Cert + Let's Encrypt fallback, rotation checklist, and a comprehensive "files that reference a hostname" list so a future rename is a single grep.

Validation of the shared ↔ dedicated flip:

- `SSL_CERT_MODE=shared`: entrypoint copies `ssl-shared.conf` → `ssl-active-<app>.conf` for all four apps. All apps share `/etc/nginx/certs/wildcard.{crt,key}`.
- `SSL_CERT_MODE=dedicated`: entrypoint copies `ssl-dedicated-<app>.conf` → `ssl-active-<app>.conf` for each app. Each reads its own `/etc/nginx/certs/<app>.{crt,key}`.

Per-app `.conf.template` files `include /etc/nginx/snippets/ssl-active-<app>.conf;` — so the app configs don't change between strategies.

---

## 3. Items explicitly out of scope for scaffolding (confirmed non-issues)

These are called out as Phase A0/A4/A5/B work in `IMPLEMENTATION_ROADMAP.md` and correctly left as placeholders:

- **Full MongoDB schemas and 16 seed files** (DATA_MODELS §19) — Phase A0
- **SEO routes, sitemap generators, JSON-LD emitters** (SEO_IMPLEMENTATION) — Phase B
- **Compliance workflows** (consent banner wiring, DSR queue UI, breach reporter) — Phase A4/A5
- **`LocalisedString`, `MoneyAmount`, `audit_db` separation** — Phase A0

These remain intentional stubs.

---

## 4. Validation evidence

```
pnpm install                # completes cleanly
pnpm typecheck              # 28 tasks successful, all green
pnpm test                   # 28 tasks successful, all passing
```

nginx entrypoint tested conceptually via script inspection (requires Docker to run live).

---

## 5. Files created or modified (high level)

Modified root: `package.json`.
Modified env: all six `env/.env.*` files.
Modified `packages/config`: `src/env/env.ts`, `src/index.ts`; added `src/domains/domains.ts`.
Modified `packages/database`: `package.json`, replaced `seeds/run-seeds.ts` with `seeds/runner.ts`.
Replaced `packages/auth/src/*`: added `providers/`, `factors/`, `session/`, `otp/`, `passwords/` folders; restructured `roles/` and `guards/`; updated `authjs/config.ts`; deleted obsolete `sessions/` and `mfa/` folders.
Modified `apps/api`: `src/main/main.ts`, `src/config/app.config.ts`, `.env.example`.
Modified `apps/worker`: `src/main/main.ts` (now headless by default).
Modified `apps/web/*`: all three `package.json` + `.env.example` for ports and env paths.
Modified `infra/docker/*`: all six Dockerfiles (ports, worker EXPOSE removal, nginx entrypoint).
Added `infra/docker/nginx/entrypoint.sh`.
Replaced `infra/nginx/`: per-app `.conf.template` files, snippet set expanded to include `security-headers.conf`, `proxy-params.conf`, `ssl.conf`, `ssl-shared.conf`, `ssl-dedicated-*.conf`.
Renamed `infra/compose/*/docker-compose.*.yml` → `docker-compose.yml` (five files).
Modified `infra/compose/local-prod/docker-compose.yml` for ports and nginx env vars.
Modified `infra/scripts/health/check-health.sh` for new ports.
Renamed `infra/scripts/certs/generate-certs.sh` → `generate.sh` and rewrote it.
Modified `infra/certs/README.md`; added `infra/certs/.gitkeep`.
Replaced `.github/workflows/ci.yml` with 10 workflow files.
Added `docs/DOMAINS_AND_SSL.md`.
Added this file: `docs/SCAFFOLD_REMEDIATION.md`.

---

## 6. Next steps (not part of this remediation)

- Phase A0: finalize data models, schemas, indexes, and seeds per `DATA_MODELS.md`.
- Activate stubbed auth providers (email-OTP, Google, WebAuthn) when business decides the rollout order.
- Replace `yourdomain.com` placeholder in `env/.env.prod.example` and the two `deploy-*.yml` smoke-check URLs once the real domain is registered.
- Run `pnpm infra:certs` on a developer machine and verify `https://marketplace.local` serves the correct cert chain.
