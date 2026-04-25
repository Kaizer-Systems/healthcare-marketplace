# Healthcare Marketplace Platform — Development Modes, Commands, and Deployment

## 1. Purpose of This Document

This document defines every development mode, every command, every environment flag, the data service resolver mechanism, the Docker Compose topology, the two-droplet deployment target, and the GitHub Container Registry image strategy. It is a working reference for Cursor agent to understand exactly how to start, switch, and validate the platform at every stage of development.

---

## 2. The Four Official Development Modes

The platform supports exactly four local development modes. Mode switching happens entirely through environment variables and pnpm scripts. No code file is ever commented or uncommented to switch modes.

### Mode overview matrix

| Aspect | `dev-lite` | `dev-module` | `dev-integrated` | `local-prod` |
|--------|-----------|-------------|-----------------|-------------|
| Purpose | View rendering with seed data, zero dependencies | One module with selective real dependencies | Full real stack, hot reload processes | Full Dockerized stack, local HTTPS |
| Auth | Mock | Real | Real | Real |
| API | Seed-based resolver | Real | Real | Real (containerized) |
| DB (Atlas) | No | Real | Real | Real (containerized config) |
| Redis | No | Optional | Real | Real (containerized) |
| BullMQ/Worker | No | Optional | Real | Real (containerized) |
| Atlas Search | No | Optional | Real when needed | Real |
| Storage | Local FS | Optional provider | Real when needed | Real provider |
| HTTPS | No | No | No | Yes (mkcert) |
| Containers | No | No | No | Yes (all) |
| Hot reload | Yes | Yes | Yes | No |

---

## 3. Environment Flags Reference

All flags are loaded from env files through `packages/config`. No app maintains its own config system.

### Primary mode selector

```env
APP_RUNTIME_MODE=dev-lite | dev-module | dev-integrated | local-prod | production
```

### Service adapter flags

```env
AUTH_MODE=mock | real
SEARCH_MODE=mock | atlas
STORAGE_MODE=local-fs | provider
CACHE_MODE=memory | redis
QUEUE_MODE=inline | redis
USE_REAL_API=false | true
USE_REAL_DB=false | true
USE_REAL_AUTH=false | true
USE_REAL_SEARCH=false | true
USE_REAL_STORAGE=false | true
USE_REAL_QUEUE=false | true
```

### Scope flags (used in `dev-module`)

```env
ENABLED_APPS=web-marketplace,web-seller,web-admin,api,worker
ENABLED_MODULES=catalog,listing,checkout,account,...   # or: all
```

### Feature and security flags

```env
ENABLE_RATE_LIMITING=false | true
ENABLE_AUDIT_LOGGING=false | true
ENABLE_EDGE_CACHE_HINTS=false | true
MFA_MODE=disabled | required
```

### Compliance flags (must be `true` in all non-local environments)

```env
ENABLE_CONSENT_MANAGEMENT=true
ENABLE_COOKIE_CONSENT_BANNER=true
ENABLE_DSR_WORKFLOWS=true
ENABLE_GDPR_MODE=true
ENABLE_DPDP_MODE=true
ENABLE_DATA_RETENTION_JOBS=true
ENABLE_BREACH_NOTIFICATION_WORKFLOW=true
DATA_RESIDENCY_REGION=IN   # or EU, UK, etc.
CHILDREN_DATA_PROTECTION_MODE=true
```

### Connection variables (secrets — never in Git, injected at runtime)

```env
MONGODB_URI=<atlas-connection-string>
MONGODB_DB_NAME=<database-name>
REDIS_URL=redis://<host>:<port>
AUTH_SECRET=<auth-js-secret>
AUTH_TRUST_HOST=true
NEXTAUTH_URL=https://<domain>
STORAGE_PROVIDER=s3 | r2
STORAGE_BUCKET=<bucket-name>
STORAGE_ACCESS_KEY=<key>
STORAGE_SECRET_KEY=<secret>
STORAGE_REGION=<region>
STORAGE_ENDPOINT=<endpoint-for-r2-or-custom>
CDN_BASE_URL=<cdn-url>
```

---

## 4. Env File Structure

```text
env/
├─ .env.base              # Non-secret shared defaults — committed to Git
├─ .env.dev-lite          # Mode-specific non-secret config — committed
├─ .env.dev-module        # Mode-specific non-secret config — committed
├─ .env.dev-integrated    # Mode-specific non-secret config — committed
├─ .env.local-prod        # Mode-specific non-secret config — committed
└─ .env.prod.example      # All production variable names, no real values — committed
```

Each app also has its own `.env.example` at its root. Real secret values are never committed. Secrets live in GitHub Encrypted Secrets and are injected by CI/CD workflows at deploy time.

### `.env.base` contents (example)

```env
# Non-secret shared defaults
NODE_ENV=development
ENABLE_CONSENT_MANAGEMENT=true
ENABLE_COOKIE_CONSENT_BANNER=true
ENABLE_DSR_WORKFLOWS=true
ENABLE_GDPR_MODE=true
ENABLE_DPDP_MODE=true
ENABLE_DATA_RETENTION_JOBS=true
ENABLE_BREACH_NOTIFICATION_WORKFLOW=true
DATA_RESIDENCY_REGION=IN
CHILDREN_DATA_PROTECTION_MODE=true
```

### `.env.dev-lite` contents (example)

```env
APP_RUNTIME_MODE=dev-lite
AUTH_MODE=mock
SEARCH_MODE=mock
STORAGE_MODE=local-fs
CACHE_MODE=memory
QUEUE_MODE=inline
USE_REAL_API=false
USE_REAL_DB=false
USE_REAL_AUTH=false
USE_REAL_SEARCH=false
USE_REAL_STORAGE=false
USE_REAL_QUEUE=false
ENABLE_RATE_LIMITING=false
ENABLE_AUDIT_LOGGING=false
```

### `.env.dev-integrated` contents (example)

```env
APP_RUNTIME_MODE=dev-integrated
ENABLED_MODULES=all
AUTH_MODE=real
SEARCH_MODE=atlas
STORAGE_MODE=provider
CACHE_MODE=redis
QUEUE_MODE=redis
USE_REAL_API=true
USE_REAL_DB=true
USE_REAL_AUTH=true
USE_REAL_SEARCH=true
USE_REAL_STORAGE=true
USE_REAL_QUEUE=true
ENABLE_RATE_LIMITING=true
ENABLE_AUDIT_LOGGING=true
# Secrets injected from local developer's shell or .env.local (gitignored)
```

---

## 5. Data Service Resolver — The Seed-or-API Switching Mechanism

This is the mechanism that allows components to work identically in all four modes without any code changes.

### Where it lives

Every frontend app has a `lib/services/` folder. Every data access call from any component or page goes through a service function in this folder. The component never calls an API endpoint directly. The component never imports a seed file directly.

### How it works

```typescript
// lib/services/products.service.ts (example in web-marketplace)
import { getConfig } from '@repo/config'
import type { ProductDetailDTO } from '@repo/contracts'

export async function getProductBySlug(slug: string): Promise<ProductDetailDTO> {
  const { useRealApi } = getConfig()

  if (!useRealApi) {
    // dev-lite: pull from seed file
    const { getProductSeedBySlug } = await import('@repo/database/seeds/products')
    return getProductSeedBySlug(slug)
  }

  // dev-module, dev-integrated, local-prod, production: call real API
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/${slug}`)
  if (!response.ok) throw new Error(`Product not found: ${slug}`)
  return response.json() as Promise<ProductDetailDTO>
}
```

The component using this service:

```typescript
// app/(public)/products/[slug]/page.tsx
import { getProductBySlug } from '@/lib/services/products.service'

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug)
  return <ProductDetailView product={product} />
}
```

The component `ProductDetailView` only ever sees `ProductDetailDTO`. It does not know or care whether that data came from a seed file or the real API.

### The critical rule

The DTO shape returned by the seed file and the shape returned by the real API must be identical. This is enforced by `packages/contracts`. Seed files in `packages/database/seeds/` export typed objects matching the same DTO types used by the real API controllers. If the schema changes, both the seed file and the API response are updated together.

### Mode routing in `packages/config`

```typescript
// packages/config/src/modes/resolver.ts
export function getConfig() {
  return {
    useRealApi: process.env.USE_REAL_API === 'true',
    useRealAuth: process.env.USE_REAL_AUTH === 'true',
    useRealSearch: process.env.USE_REAL_SEARCH === 'true',
    useRealStorage: process.env.USE_REAL_STORAGE === 'true',
    useRealQueue: process.env.USE_REAL_QUEUE === 'true',
    appRuntimeMode: process.env.APP_RUNTIME_MODE as RuntimeMode,
  }
}
```

---

## 6. Mode 1: `dev-lite` — View Rendering, Seed Data, Zero Dependencies

### What this mode is

The lightest possible mode. Its sole purpose is rendering pages and components with no external dependencies. No auth flow, no real API, no DB connection, no Redis, no queue, no search, no storage provider. Page data comes entirely from seed files via the data service resolver. Hot reload is active.

This is not a soft variant of another mode. It is the correct mode to use at the very beginning of every new slice, when no API exists yet and the goal is to build and validate the UI.

### What runs in this mode

- The selected frontend app process only (Next.js dev server).
- The data service resolver reads from `packages/database/seeds/`.
- No other processes are required.

### What must remain true in this mode

- Pages render without any process other than the Next.js dev server being active.
- Data comes from seed files typed with production-shaped DTO contracts.
- No domain logic is hardcoded with fake field names that do not match real contracts.
- Loading, empty, error, and success UI states are all testable with controlled seed data.
- Hot reload updates immediately on edit of any page, component, layout, or seed file.

### Per-app commands

```bash
# web-marketplace — view rendering only
pnpm --filter web-marketplace dev:lite

# web-seller — view rendering only
pnpm --filter web-seller dev:lite

# web-admin — view rendering only
pnpm --filter web-admin dev:lite
```

These scripts are defined in each app's `package.json` as:

```json
{
  "scripts": {
    "dev:lite": "dotenv -e ../../env/.env.base -e ../../env/.env.dev-lite -- next dev"
  }
}
```

### Root ecosystem command

```bash
# Start all three frontend apps in dev-lite simultaneously
pnpm dev:lite
```

Defined in root `package.json` via Turborepo:

```json
{
  "scripts": {
    "dev:lite": "turbo run dev:lite --filter=web-marketplace --filter=web-seller --filter=web-admin"
  }
}
```

### Good examples for this mode

- Homepage hero and featured sections
- Category listing shell
- Product detail shell
- Seller profile shell
- Cart UI shell
- Admin dashboard shell
- Seller dashboard shell
- Any new screen at the beginning of a slice

### Not appropriate for this mode

- Checkout submission
- Real order history
- Document downloads
- Auth-protected workflows
- Real search relevance validation

---

## 7. Mode 2: `dev-module` — One Module, Selective Real Dependencies

### What this mode is

Used to develop one specific app or business module with selective real dependencies. Redis, Atlas DB, Atlas Search, real auth, real storage, and worker can each be enabled individually based on what the specific feature under work actually requires. Not all must be on simultaneously. The `ENABLED_MODULES` flag tells the API which module's routes are under active focus, which aids in faster boot and cleaner test boundaries.

This mode is distinct from `dev-lite` because it connects to real data sources for the module being built. It is distinct from `dev-integrated` because not all services need to be active — only the ones the current module actually depends on.

### Config state for this mode

The key distinction is setting `USE_REAL_API=true` and `USE_REAL_DB=true` as the baseline, then selectively enabling Redis, search, storage, and queue only when the module needs them.

```env
APP_RUNTIME_MODE=dev-module
ENABLED_APPS=web-marketplace        # or web-seller, web-admin — whichever is being worked on
ENABLED_MODULES=catalog             # the specific module under active development
AUTH_MODE=real
SEARCH_MODE=mock                    # only flip to atlas if this module is search-dependent
STORAGE_MODE=local-fs               # only flip to provider if this module handles uploads
CACHE_MODE=memory                   # only flip to redis if this module uses Redis cache
QUEUE_MODE=inline                   # only flip to redis if this module emits jobs
USE_REAL_API=true
USE_REAL_DB=true
USE_REAL_AUTH=true
USE_REAL_SEARCH=false
USE_REAL_STORAGE=false
USE_REAL_QUEUE=false
ENABLE_RATE_LIMITING=true
ENABLE_AUDIT_LOGGING=true
```

### Per-app commands

```bash
# API — started first, targeted to specific module
pnpm --filter api dev:module

# web-marketplace module
pnpm --filter web-marketplace dev:module

# web-seller module
pnpm --filter web-seller dev:module

# web-admin module
pnpm --filter web-admin dev:module

# worker — only when the module being developed emits or processes jobs
pnpm --filter worker dev:module
```

Each app's `package.json`:

```json
{
  "scripts": {
    "dev:module": "dotenv -e ../../env/.env.base -e ../../env/.env.dev-module -- next dev"
  }
}
```

### Root ecosystem command

```bash
pnpm dev:module
# Uses ENABLED_APPS from env/.env.dev-module to determine which apps to start
```

Root `package.json`:

```json
{
  "scripts": {
    "dev:module": "turbo run dev:module"
  }
}
```

### Starting Redis for a module that needs it

```bash
pnpm infra:up:module
# Starts only Redis container for dev-module use
```

Defined in root as:

```json
{
  "scripts": {
    "infra:up:module": "docker compose -f infra/compose/dev-module/docker-compose.yml up -d"
  }
}
```

### Variant examples

**Module without Redis or search** (e.g. account profile):
```bash
# Terminal 1
ENABLED_MODULES=account pnpm --filter api dev:module

# Terminal 2
pnpm --filter web-marketplace dev:module
```

**Module with Redis** (e.g. seller inventory with cache):
```bash
pnpm infra:up:module   # Redis only

# Terminal 1
ENABLED_MODULES=inventory CACHE_MODE=redis pnpm --filter api dev:module

# Terminal 2
pnpm --filter web-seller dev:module
```

**Module with Atlas Search** (e.g. catalog moderation with search):
```bash
# Terminal 1
ENABLED_MODULES=moderation SEARCH_MODE=atlas USE_REAL_SEARCH=true pnpm --filter api dev:module

# Terminal 2
pnpm --filter web-admin dev:module
```

**Module with queue and worker** (e.g. order sync visibility):
```bash
pnpm infra:up:module   # Redis

# Terminal 1
ENABLED_MODULES=sync-status CACHE_MODE=redis QUEUE_MODE=redis USE_REAL_QUEUE=true pnpm --filter worker dev:module

# Terminal 2
ENABLED_MODULES=sync-status CACHE_MODE=redis QUEUE_MODE=redis USE_REAL_QUEUE=true pnpm --filter api dev:module

# Terminal 3
pnpm --filter web-seller dev:module
```

### Test account requirements

Real DB-backed accounts are required for `dev-module` when `AUTH_MODE=real`. The following accounts must be seeded:

- one `customer`
- one `seller_staff`
- one `seller_admin`
- one `provider_support`
- one `provider_admin`

Seed accounts are provisioned via `pnpm db:seed`. Credentials are in the developer's secure local notes, never in Git.

---

## 8. Mode 3: `dev-integrated` — Full Real Stack, Hot Reload

### What this mode is

The standard feature-validation mode. All services run as local hot-reload processes with real Atlas DB, real Auth.js sessions, real Atlas Search, real Redis, real BullMQ worker, and real storage provider where the feature needs it. This is the mode used before declaring any feature complete.

### What runs in this mode

- `apps/web/web-marketplace` (Next.js dev process)
- `apps/web/web-seller` (Next.js dev process)
- `apps/web/web-admin` (Next.js dev process)
- `apps/api` (NestJS dev process)
- `apps/worker` (NestJS dev process)
- Redis (Docker container via `pnpm infra:up:integrated`)
- MongoDB Atlas (managed cloud — M0 dev cluster)
- Atlas Search (managed cloud — part of Atlas M0)
- Storage provider (S3 or R2 — when the feature involves files or documents)

### Config state for this mode

```env
APP_RUNTIME_MODE=dev-integrated
ENABLED_MODULES=all
AUTH_MODE=real
SEARCH_MODE=atlas
STORAGE_MODE=provider
CACHE_MODE=redis
QUEUE_MODE=redis
USE_REAL_API=true
USE_REAL_DB=true
USE_REAL_AUTH=true
USE_REAL_SEARCH=true
USE_REAL_STORAGE=true
USE_REAL_QUEUE=true
ENABLE_RATE_LIMITING=true
ENABLE_AUDIT_LOGGING=true
```

### Starting infra for this mode

```bash
pnpm infra:up:integrated
# Starts Redis container for dev-integrated use
```

Root `package.json`:

```json
{
  "scripts": {
    "infra:up:integrated": "docker compose -f infra/compose/dev-integrated/docker-compose.yml up -d"
  }
}
```

### Per-app commands

```bash
# Run all integrated individually in separate terminals
pnpm --filter api dev:integrated
pnpm --filter worker dev:integrated
pnpm --filter web-marketplace dev:integrated
pnpm --filter web-seller dev:integrated
pnpm --filter web-admin dev:integrated
```

Each app's `package.json`:

```json
{
  "scripts": {
    "dev:integrated": "dotenv -e ../../env/.env.base -e ../../env/.env.dev-integrated -- next dev"
  }
}
```

### Root ecosystem command

```bash
pnpm dev:integrated
# Starts all apps + api + worker in integrated mode via Turborepo
```

Root `package.json`:

```json
{
  "scripts": {
    "dev:integrated": "turbo run dev:integrated"
  }
}
```

### Full explicit startup sequence (using separate terminals)

```bash
# Terminal 1 — start Redis
pnpm infra:up:integrated

# Terminal 2 — start API
pnpm --filter api dev:integrated

# Terminal 3 — start worker
pnpm --filter worker dev:integrated

# Terminal 4 — start web-marketplace
pnpm --filter web-marketplace dev:integrated

# Terminal 5 — start web-seller
pnpm --filter web-seller dev:integrated

# Terminal 6 — start web-admin
pnpm --filter web-admin dev:integrated
```

### What must be real in this mode

- Auth.js sessions stored in MongoDB Atlas via `@auth/mongodb-adapter`
- Protected route checks and API-side role validation
- Real MongoDB Atlas reads and writes
- Atlas Search for all search-dependent features
- Redis for all cache and rate-limiting paths
- BullMQ job emission and processing for all async features
- Provider-backed storage when the feature involves uploads or documents
- Audit log emission for all audited mutations

### What the data service resolver does in this mode

With `USE_REAL_API=true`, the service resolver in `lib/services/` always calls the real API endpoint. The seed-file path is bypassed entirely. No component changes are needed — only the env flag changes.

### Acceptance criteria before moving on

A feature is not ready to move forward until it passes in `dev-integrated`:

- Real API calls succeed with correct data.
- DB writes and reads are correct.
- Role and scope behavior is enforced on the backend.
- Cache and worker behavior functions where applicable.
- Notifications emit where applicable.
- Logs and audit entries are emitted correctly.
- Unauthorized, forbidden, not-found, and validation error states all render correctly.

---

## 9. Mode 4: `local-prod` — Fully Dockerized, Local HTTPS, No Mocks

### What this mode is

The closest local equivalent to the real deployment. All apps, API, worker, Redis, and nginx reverse proxy run as Docker containers. Local HTTPS is served via mkcert. Atlas Search, real Auth.js, and real selected storage provider are active. No mocks anywhere. This is used at each major zone completion checkpoint and before merges or releases.

### What runs in this mode

All services run as Docker containers:

- `nginx` (reverse proxy, routing by hostname to the correct app container)
- `web-marketplace` (containerized Next.js, port behind nginx)
- `web-seller` (containerized Next.js, port behind nginx)
- `web-admin` (containerized Next.js, port behind nginx)
- `api` (containerized NestJS)
- `worker` (containerized NestJS)
- `redis` (containerized)

External managed services (not containerized):

- MongoDB Atlas M0 (dev cluster)
- Atlas Search (part of Atlas M0)
- Selected storage provider (S3 or R2)

### Docker Compose service startup order

1. `redis`
2. `api` (depends on redis healthcheck)
3. `worker` (depends on api healthcheck)
4. `web-marketplace`, `web-seller`, `web-admin` (depend on api healthcheck)
5. `nginx` (depends on all web app healthchecks)

### Local hostname setup

Define local hostnames in `/etc/hosts`:

```
127.0.0.1  marketplace.local
127.0.0.1  seller.local
127.0.0.1  admin.local
127.0.0.1  api.local
```

nginx routes traffic:

- `https://marketplace.local` → `web-marketplace` container
- `https://seller.local` → `web-seller` container
- `https://admin.local` → `web-admin` container
- `https://api.local` → `api` container

### mkcert setup

```bash
# Run once on developer machine
pnpm infra:certs
```

Which executes:

```bash
mkcert -install
mkcert marketplace.local seller.local admin.local api.local
# Certificates placed in infra/certs/ (gitignored)
```

### Commands

```bash
# Build all images from local source
pnpm dev:local-prod:build

# Start the full stack (already built images)
pnpm dev:local-prod:up

# Build and start in one step
pnpm dev:local-prod:up:build

# Stop the full stack
pnpm dev:local-prod:down

# View all logs
pnpm dev:local-prod:logs

# View one service logs
docker compose --env-file env/.env.local-prod -f infra/compose/local-prod/docker-compose.yml logs -f api
```

Root `package.json` scripts:

```json
{
  "scripts": {
    "dev:local-prod:build": "docker compose --env-file env/.env.local-prod -f infra/compose/local-prod/docker-compose.yml build",
    "dev:local-prod:up": "docker compose --env-file env/.env.local-prod -f infra/compose/local-prod/docker-compose.yml up -d",
    "dev:local-prod:up:build": "docker compose --env-file env/.env.local-prod -f infra/compose/local-prod/docker-compose.yml up -d --build",
    "dev:local-prod:down": "docker compose --env-file env/.env.local-prod -f infra/compose/local-prod/docker-compose.yml down",
    "dev:local-prod:logs": "docker compose --env-file env/.env.local-prod -f infra/compose/local-prod/docker-compose.yml logs -f",
    "infra:certs": "bash infra/scripts/certs/generate.sh"
  }
}
```

### Config state for this mode

```env
APP_RUNTIME_MODE=local-prod
AUTH_MODE=real
SEARCH_MODE=atlas
STORAGE_MODE=provider
CACHE_MODE=redis
QUEUE_MODE=redis
USE_REAL_API=true
USE_REAL_DB=true
USE_REAL_AUTH=true
USE_REAL_SEARCH=true
USE_REAL_STORAGE=true
USE_REAL_QUEUE=true
ENABLE_RATE_LIMITING=true
ENABLE_AUDIT_LOGGING=true
ENABLE_CONSENT_MANAGEMENT=true
ENABLE_COOKIE_CONSENT_BANNER=true
ENABLE_DSR_WORKFLOWS=true
ENABLE_GDPR_MODE=true
ENABLE_DPDP_MODE=true
ENABLE_DATA_RETENTION_JOBS=true
ENABLE_BREACH_NOTIFICATION_WORKFLOW=true
MFA_MODE=required
```

Connection secrets are injected from the developer's local shell environment variables or a gitignored `.env.local-prod.secrets` file, never from a committed file.

### Validation sequence for local-prod

Run validation in this order after `pnpm dev:local-prod:up:build`:

1. Confirm local hostnames resolve correctly.
2. Confirm nginx serves all three apps over HTTPS.
3. Confirm API health endpoint responds.
4. Confirm Redis connectivity from API and worker.
5. Confirm worker startup and queue connectivity.
6. Validate sign-in flow under HTTPS.
7. Validate session persistence and cookie behavior under the reverse proxy.
8. Validate public marketplace routes.
9. Validate customer protected routes.
10. Validate seller protected routes.
11. Validate admin protected routes (including MFA path).
12. Validate search routes with real Atlas Search.
13. Validate document/media routes with real storage provider.
14. Validate queue-backed async behavior.
15. Inspect logs for hidden errors.
16. Validate compliance: cookie consent banner renders and gates, DSR submission works, compliance admin panel is accessible to admin role only.

### Compliance validation requirements for local-prod

These must pass before considering `local-prod` complete at any checkpoint:

- `ENABLE_CONSENT_MANAGEMENT`, `ENABLE_GDPR_MODE`, `ENABLE_DPDP_MODE`, and `ENABLE_DATA_RETENTION_JOBS` are all `true`.
- Cookie consent banner renders on marketplace and blocks non-essential tracking before consent is given.
- Consent record is written to DB when a user accepts or customises preferences.
- DSR rights request page is accessible from the customer account area.
- At least one test access request and one test erasure request can be submitted and appear in the admin DSR queue.
- Data retention job runs without error when triggered in the worker.
- Breach incident logging endpoint produces a correctly structured incident record.
- Personal data fields do not appear in application logs during a test sign-in (spot check).
- Compliance section of admin panel is blocked for non-admin roles.

---

## 10. Complete Root Package Scripts Reference

These are all root-level scripts defined in root `package.json`:

```json
{
  "scripts": {
    "dev:lite": "turbo run dev:lite --filter=web-marketplace --filter=web-seller --filter=web-admin",
    "dev:module": "turbo run dev:module",
    "dev:integrated": "turbo run dev:integrated",

    "dev:local-prod:build": "docker compose --env-file env/.env.local-prod -f infra/compose/local-prod/docker-compose.yml build",
    "dev:local-prod:up": "docker compose --env-file env/.env.local-prod -f infra/compose/local-prod/docker-compose.yml up -d",
    "dev:local-prod:up:build": "docker compose --env-file env/.env.local-prod -f infra/compose/local-prod/docker-compose.yml up -d --build",
    "dev:local-prod:down": "docker compose --env-file env/.env.local-prod -f infra/compose/local-prod/docker-compose.yml down",
    "dev:local-prod:logs": "docker compose --env-file env/.env.local-prod -f infra/compose/local-prod/docker-compose.yml logs -f",

    "infra:up:lite": "echo 'No infra required for dev-lite'",
    "infra:up:module": "docker compose -f infra/compose/dev-module/docker-compose.yml up -d",
    "infra:up:integrated": "docker compose -f infra/compose/dev-integrated/docker-compose.yml up -d",
    "infra:up:local-prod": "docker compose --env-file env/.env.local-prod -f infra/compose/local-prod/docker-compose.yml up -d",
    "infra:down": "docker compose -f infra/compose/local-prod/docker-compose.yml down 2>/dev/null; docker compose -f infra/compose/dev-integrated/docker-compose.yml down 2>/dev/null; docker compose -f infra/compose/dev-module/docker-compose.yml down 2>/dev/null",
    "infra:certs": "bash infra/scripts/certs/generate.sh",

    "test": "turbo run test",
    "test:e2e": "turbo run test:e2e",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "build": "turbo run build",
    "db:seed": "pnpm --filter database run seed",
    "db:seed:accounts": "pnpm --filter database run seed:accounts"
  }
}
```

---

## 11. Per-App Package Scripts Reference

Each app defines these scripts in its own `package.json`. The env files are loaded relative to the monorepo root.

### `apps/web/web-marketplace/package.json`

```json
{
  "name": "web-marketplace",
  "scripts": {
    "dev:lite": "dotenv -e ../../env/.env.base -e ../../env/.env.dev-lite -- next dev -p 3000",
    "dev:module": "dotenv -e ../../env/.env.base -e ../../env/.env.dev-module -- next dev -p 3000",
    "dev:integrated": "dotenv -e ../../env/.env.base -e ../../env/.env.dev-integrated -- next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:e2e": "playwright test"
  }
}
```

### `apps/web/web-seller/package.json`

```json
{
  "name": "web-seller",
  "scripts": {
    "dev:lite": "dotenv -e ../../env/.env.base -e ../../env/.env.dev-lite -- next dev -p 3001",
    "dev:module": "dotenv -e ../../env/.env.base -e ../../env/.env.dev-module -- next dev -p 3001",
    "dev:integrated": "dotenv -e ../../env/.env.base -e ../../env/.env.dev-integrated -- next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:e2e": "playwright test"
  }
}
```

### `apps/web/web-admin/package.json`

```json
{
  "name": "web-admin",
  "scripts": {
    "dev:lite": "dotenv -e ../../env/.env.base -e ../../env/.env.dev-lite -- next dev -p 3002",
    "dev:module": "dotenv -e ../../env/.env.base -e ../../env/.env.dev-module -- next dev -p 3002",
    "dev:integrated": "dotenv -e ../../env/.env.base -e ../../env/.env.dev-integrated -- next dev -p 3002",
    "build": "next build",
    "start": "next start -p 3002",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:e2e": "playwright test"
  }
}
```

### `apps/api/package.json`

```json
{
  "name": "api",
  "scripts": {
    "dev:lite": "dotenv -e ../../env/.env.base -e ../../env/.env.dev-lite -- nest start --watch",
    "dev:module": "dotenv -e ../../env/.env.base -e ../../env/.env.dev-module -- nest start --watch",
    "dev:integrated": "dotenv -e ../../env/.env.base -e ../../env/.env.dev-integrated -- nest start --watch",
    "build": "nest build",
    "start": "node dist/main",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:integration": "vitest run --config vitest.integration.ts"
  }
}
```

### `apps/worker/package.json`

```json
{
  "name": "worker",
  "scripts": {
    "dev:module": "dotenv -e ../../env/.env.base -e ../../env/.env.dev-module -- nest start --watch",
    "dev:integrated": "dotenv -e ../../env/.env.base -e ../../env/.env.dev-integrated -- nest start --watch",
    "build": "nest build",
    "start": "node dist/main",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  }
}
```

---

## 12. Docker Images and Container Architecture

### One Docker image per app

Each app produces its own Docker image built from its own `Dockerfile` in `infra/docker/<app>/`:

| App | Dockerfile | Default port |
|-----|-----------|-------------|
| `web-marketplace` | `infra/docker/web-marketplace/Dockerfile` | 3000 |
| `web-seller` | `infra/docker/web-seller/Dockerfile` | 3001 |
| `web-admin` | `infra/docker/web-admin/Dockerfile` | 3002 |
| `api` | `infra/docker/api/Dockerfile` | 4000 |
| `worker` | `infra/docker/worker/Dockerfile` | — (no HTTP, queue consumer) |
| `nginx` | `infra/docker/nginx/Dockerfile` | 80, 443 |

### Dockerfile strategy

All Next.js app Dockerfiles use a multi-stage build:

```dockerfile
# Example: infra/docker/web-marketplace/Dockerfile
FROM node:24-alpine AS base
RUN npm install -g pnpm

FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/web/web-marketplace/package.json ./apps/web/web-marketplace/
# ... copy all package.json files for workspace packages
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter web-marketplace build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/web/web-marketplace/.next/standalone ./
COPY --from=builder /app/apps/web/web-marketplace/.next/static ./apps/web/web-marketplace/.next/static
COPY --from=builder /app/apps/web/web-marketplace/public ./apps/web/web-marketplace/public
EXPOSE 3000
CMD ["node", "apps/web/web-marketplace/server.js"]
```

NestJS app Dockerfiles use a similar multi-stage pattern, building with `nest build` and running the compiled `dist/main.js`.

### Image registry

All images are pushed to **GitHub Container Registry (GHCR)** which is free with any GitHub account.

Image naming pattern: `ghcr.io/<org>/<repo>/<app-name>:<tag>`

Examples:
- `ghcr.io/myorg/healthcare-marketplace/web-marketplace:abc1234`
- `ghcr.io/myorg/healthcare-marketplace/api:abc1234`
- `ghcr.io/myorg/healthcare-marketplace/worker:abc1234`

Tags:
- `<git-sha>` — every build on main
- `latest` — always the most recent main build
- `staging` — promoted staging release
- `production` — promoted production release

### Deploying images to droplets

Droplets never clone the source repository. At deploy time, GitHub Actions SSHes into the droplet and runs:

```bash
# Pull latest images
docker pull ghcr.io/myorg/healthcare-marketplace/web-marketplace:latest
docker pull ghcr.io/myorg/healthcare-marketplace/web-seller:latest
docker pull ghcr.io/myorg/healthcare-marketplace/web-admin:latest
docker pull ghcr.io/myorg/healthcare-marketplace/nginx:latest

# Restart containers with new images
docker compose --env-file /opt/app/.env -f /opt/app/docker-compose.prod.yml up -d
```

The `docker-compose.prod.yml` on the droplet references images by their GHCR URLs rather than building from source.

---

## 13. Two-Droplet Production Deployment Topology

### Frontend droplet

Runs the three frontend app containers and nginx.

Services on this droplet:

```yaml
services:
  nginx:
    image: ghcr.io/myorg/healthcare-marketplace/nginx:latest
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      web-marketplace:
        condition: service_healthy
      web-seller:
        condition: service_healthy
      web-admin:
        condition: service_healthy

  web-marketplace:
    image: ghcr.io/myorg/healthcare-marketplace/web-marketplace:latest
    environment:
      NEXT_PUBLIC_API_URL: http://<backend-droplet-private-ip>:4000
      # All other env vars injected from .env file on droplet
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  web-seller:
    image: ghcr.io/myorg/healthcare-marketplace/web-seller:latest
    # same pattern as web-marketplace
    restart: unless-stopped

  web-admin:
    image: ghcr.io/myorg/healthcare-marketplace/web-admin:latest
    # same pattern as web-marketplace
    restart: unless-stopped
```

### Backend droplet

Runs API, worker, and Redis.

Services on this droplet:

```yaml
services:
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    image: ghcr.io/myorg/healthcare-marketplace/api:latest
    ports:
      - "4000:4000"    # exposed on private IP only, not 0.0.0.0
    environment:
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      MONGODB_URI: ${MONGODB_URI}
      # All other env vars from .env file
    depends_on:
      redis:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  worker:
    image: ghcr.io/myorg/healthcare-marketplace/worker:latest
    environment:
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      MONGODB_URI: ${MONGODB_URI}
      # All other env vars from .env file
    depends_on:
      redis:
        condition: service_healthy
      api:
        condition: service_healthy
    restart: unless-stopped
```

### Droplet-to-droplet communication

The frontend droplet communicates with the backend droplet via **DigitalOcean's free private networking** (internal IP within the same region). The `NEXT_PUBLIC_API_URL` for server-side API calls from the frontend apps uses the backend droplet's private IP, never the public internet.

This private IP is injected as a non-secret environment variable via GitHub Encrypted Secrets at deploy time.

### Container scaling

Each container's replica count is controlled via Docker Compose `deploy.replicas`:

```yaml
  api:
    image: ghcr.io/myorg/healthcare-marketplace/api:latest
    deploy:
      replicas: 2
      restart_policy:
        condition: on-failure
```

Scaling up or down for any individual service is a Compose file config change followed by `docker compose up -d --scale api=3`. No architecture change is required.

If any app grows to need its own dedicated droplet, the Compose files are split and nginx routing is updated — no application code changes.

---

## 14. Secrets Management in Production

### Where secrets live

All real credentials live in **GitHub Encrypted Secrets**, scoped to GitHub Environments:

- `staging` environment — staging credentials
- `production` environment — production credentials, with manual approval gate required before any workflow can access them

### How secrets reach the droplet

1. GitHub Actions workflow runs (on merge to main or manual trigger).
2. Workflow reads secrets from GitHub Encrypted Secrets.
3. Workflow SSHes into the droplet.
4. Workflow writes the `.env` file to `/opt/app/.env` on the droplet (permission `600`, owner-readable only).
5. Workflow runs `docker compose --env-file /opt/app/.env up -d` to pull new images and restart.
6. The `.env` file on the droplet is never accessible via the web. It lives outside any web root.

### What is never committed to Git

- MongoDB Atlas connection string
- Redis password
- Auth.js secret
- Storage provider access key and secret
- Any API key or token for third-party services
- The actual `.env` files containing real values

### What is committed to Git

- `.env.base` — non-secret shared flags
- `.env.dev-lite`, `.env.dev-module`, `.env.dev-integrated`, `.env.local-prod` — non-secret mode config
- `.env.prod.example` — variable names only, no values
- Each app's `.env.example` — variable names only, no values

---

## 15. Compose File Structure in the Repo

```text
infra/compose/
├─ dev-module/
│  └─ docker-compose.yml          # Redis only for dev-module use
├─ dev-integrated/
│  └─ docker-compose.yml          # Redis only for dev-integrated use
└─ local-prod/
   └─ docker-compose.yml          # Full stack: nginx, web-marketplace, web-seller,
                                  # web-admin, api, worker, redis
```

Production compose files live on the droplets themselves, managed by CI/CD. They are not committed to Git because they contain image references that must be updated at deploy time and because they use secrets injected by CI.

---

## 16. Acceptance Checklist per Mode

### `dev-lite` is correctly set up when:

- [ ] Selected page opens without login
- [ ] Page renders from seed data only with no other process running
- [ ] No dependency on API, MongoDB, Redis, BullMQ, or S3/R2
- [ ] Hot reload works across page, component, layout, and seed file edits
- [ ] Loading, success, empty, and error UI states are all testable
- [ ] Page uses production-shaped DTO contracts
- [ ] No domain logic is hardcoded with fake field names

### `dev-module` is correctly set up when:

- [ ] Selected module's page opens with correct session
- [ ] Module fetches data from the real API
- [ ] API reads from real MongoDB Atlas
- [ ] Role and scope checks enforce correctly
- [ ] Only the dependencies required by this module are active (others remain mocked)
- [ ] Unauthenticated, wrong-role, not-found, and validation-error states work correctly
- [ ] Hot reload works across frontend and API

### `dev-integrated` is correctly set up when:

- [ ] All apps run in hot-reload mode against all real services
- [ ] Auth.js sessions are DB-backed and real
- [ ] Atlas Search returns real results for search-dependent features
- [ ] Redis cache and BullMQ jobs function correctly
- [ ] Storage provider handles uploads and signed URLs correctly
- [ ] Audit logs emit for all audited mutations
- [ ] Worker processes jobs from the queue correctly
- [ ] All role boundaries enforce correctly end to end

### `local-prod` is correctly set up when:

- [ ] All service images build successfully
- [ ] All containers start in dependency order
- [ ] nginx serves all three apps over local HTTPS
- [ ] Auth.js sessions work correctly under HTTPS and reverse proxy
- [ ] Redis, Atlas, and worker all function within containers
- [ ] Search, storage, and queue behavior are real
- [ ] All compliance flags are `true` and compliance features validate
- [ ] Cookie consent banner renders and gates correctly
- [ ] DSR submissions appear in admin queue
- [ ] Logs are inspectable and useful
- [ ] Container failures are diagnosable

---

## 17. MongoDB Atlas Dev Environment

During development and pre-launch, **MongoDB Atlas M0 (free tier)** is the target DB.

Atlas M0 supports Atlas Search with limitations on index count and data volume acceptable for development. Flip to M10 only at staging or production go-live.

Seed data is loaded to the Atlas M0 dev cluster using:

```bash
pnpm db:seed
```

Which runs the seed scripts in `packages/database/src/seeds/`. Each seed file targets a specific collection and produces documents matching the exact production DTO shape.

Test user accounts are seeded separately:

```bash
pnpm db:seed:accounts
```

This seeds the minimum required accounts (customer, seller_staff, seller_admin, provider_support, provider_admin) with documented credentials stored in the developer's secure local notes — never in Git.
