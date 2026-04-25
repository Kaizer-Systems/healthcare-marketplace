# Healthcare Marketplace Platform — Technical Stack, Architecture, and Engineering Rules

## 1. Purpose of This Document

This document defines the final technical stack and all engineering rules for the healthcare marketplace platform. It is a decision document, not an exploration document. Every choice here is final unless a future update explicitly supersedes it. The coding agent must not deviate from these decisions, must not invent alternatives, and must not import forbidden tools or patterns.

---

## 2. Final Technology Stack

### 2.1 Frontend

**Use:**

- Next.js 16
- React 19.2
- TypeScript
- App Router only
- Tailwind CSS v4
- shadcn/ui
- TanStack Query
- Zustand
- PWA support (mandatory for all three frontend apps)

There are **three separate Next.js applications** inside `apps/web/`. Each is an independent application with its own package.json, its own Next.js configuration, its own theme seeding, its own PWA shell, and its own deployment Docker image. They share code only through the shared packages in `packages/`.

- `apps/web/web-marketplace` — public marketplace and customer account area. Has its own purchased theme seeded into it.
- `apps/web/web-seller` — seller portal. Shares a different purchased theme with web-admin.
- `apps/web/web-admin` — provider/operator admin control panel. Shares the same purchased theme as web-seller.

**Frontend usage rules:**

- App Router is mandatory. Pages Router is not used.
- Server Components are the default for public read-heavy pages.
- Client Components are used only where interactivity requires them.
- TanStack Query is used only for server-state that must be fetched or mutated from the client side.
- Zustand is used only for small local UI or app state.
- shadcn/ui is the foundation of the internal design system in `packages/ui`.
- Tailwind CSS v4 is used for styling throughout.
- Next.js caching and revalidation primitives are used for public read-heavy routes.
- PWA support must be implemented in all three frontend applications from the start. Service worker caching configuration must not conflict with Next.js App Router's streaming and caching behavior.
- Theme-derived UI patterns must be reconstructed inside `packages/ui` and consumed from there. No app imports runtime code directly from `vendor/theme-source/`.

---

### 2.2 Backend

**Use:**

- Node.js 24 LTS
- NestJS 11
- Fastify
- TypeScript

**Backend apps:**

- `apps/api` — main API serving all client-facing and internal request-response flows
- `apps/worker` — background jobs, inventory sync, retries, notifications, cache invalidation, analytics projections, loyalty and referral jobs, compliance lifecycle jobs

**Backend usage rules:**

- NestJS is the application framework. Fastify is the HTTP adapter.
- All backend code must be modular and domain-driven using NestJS modules.
- Keep request-response flows strictly inside `apps/api`.
- Keep scheduled, retryable, non-user-facing, and async work strictly inside `apps/worker`.
- Long-running background operations must not run inside request handlers.
- CPU-heavy or I/O-heavy background work must not block the request path.

---

### 2.3 Database and Data Layer

**Use:**

- MongoDB Atlas (primary database)
- MongoDB Atlas Search (primary search engine)
- Redis (cache, idempotency keys, rate limiting, queue backing)
- BullMQ (all background job queues)
- S3-compatible object storage via adapter (`packages/storage`)
- Local filesystem storage in fast local development only
- AWS S3 or Cloudflare R2 in all non-local environments

**MongoDB rules:**

- MongoDB Atlas is the only primary database for this project.
- Collections and indexes must be designed deliberately with access patterns in mind.
- Embedded documents are used where read locality clearly benefits.
- References are used where the relationship is large, shared, or independently evolving.
- Transactions are used only where business consistency truly requires them.
- Aggregation pipelines are used for analytics, dashboards, projections, and complex retrievals.
- Field-level encryption or queryable encryption is used for highly sensitive fields where required.
- Media blobs are never stored in MongoDB. Only metadata and storage references are stored in MongoDB.

**Data placement rules:**

- MongoDB Atlas holds all primary business records.
- Atlas Search handles product search, autocomplete, typo tolerance, facets, synonym-aware discovery, and relevance scoring.
- Redis holds cache entries, idempotency keys, short-lived state, rate-limiting counters, and queue backing.
- BullMQ queues hold: inventory sync jobs, retries, reconciliation, notification jobs, cache invalidation fanout, analytics projection jobs, loyalty and referral jobs, report jobs, active order-sync push jobs, data retention enforcement and purge jobs, DSR and data principal rights fulfilment jobs, consent lifecycle jobs, breach incident escalation jobs.
- Object storage holds product images, product videos, downloadable documents, invoices, warranty files, and backup archives.

---

### 2.4 ODM and Query Access Pattern

**Use Mongoose** for standard CRUD and business flows. **Use the native MongoDB driver** for complex aggregation pipelines, bulk operations, transactions, and performance-critical query paths. Both may be used together within the same application; they are not mutually exclusive.

Mongoose is used for ordinary entity CRUD, admin settings, typical reads and writes, standard business records, and simple relational-style references. Explicit MongoDB native operations are used for Atlas Search query pipelines, heavy aggregations, analytics support collections, projection generation, bulk updates, performance-sensitive queries, and operational data movement.

All DB access helpers, schema definitions, Mongoose models, pipeline builders, and aggregation helpers must live in `packages/database`. Complex aggregation pipelines that cannot be expressed cleanly through Mongoose must be defined as named, explicit helpers in `packages/database/pipelines/`. Pipeline fragments must not be scattered randomly across modules or controllers.

**Auth.js sessions** are stored in MongoDB Atlas using `@auth/mongodb-adapter` (latest version compatible with Auth.js v5). Prisma is not used anywhere in this project.

---

### 2.5 Search and Discovery

**Use MongoDB Atlas Search only.**

Atlas Search is the only search engine in this project. Search query composition is centralized in `packages/search`. Result shaping and ranking logic is explicit, testable, and not spread as raw pipeline fragments across the codebase.

Required search capabilities include search-as-you-type autocomplete, typo tolerance, exact and close-match retrieval, synonym-aware retrieval, brand suggestions, category suggestions, related product suggestions, similar or substitute product suggestions, advanced filters and facets, seller-aware result shaping, boosted ranking inputs, sponsored ranking inputs, and future hyperlocal relevance inputs.

In `dev-lite` and `dev-module`, search may be mocked when the feature under work does not depend on real search behavior. In `dev-integrated` and `local-prod`, real Atlas Search must be used whenever the feature depends on search relevance, ranking, or filters.

---

### 2.6 Cache and Background Processing

**Use:**

- L1 in-process cache for short-lived hot reads
- Redis as shared L2 cache
- BullMQ for all queued background work

Cache is used only where read volume or response latency justifies it. Public catalog reads, seller profile reads, homepage sections, and search suggestions are valid cache targets. Versioned or content-version-aware cache keys are used throughout. Cache is invalidated on writes or version changes. Stale product or seller data must never be served indefinitely. Cache is not the source of truth.

Background tasks must be moved off the main request lifecycle. Jobs must be idempotent where possible. Retries must be controlled and observable. Failed jobs must be inspectable and recoverable.

---

### 2.7 Authentication, Authorization, Session, and Identity

**Use:**

- Auth.js v5
- `@auth/mongodb-adapter` (latest version compatible with Auth.js v5) for database-backed session storage in MongoDB Atlas
- HttpOnly secure session cookies for browser sessions
- RBAC with optional ABAC-style policy checks where needed
- MFA for seller admin and provider admin roles before production go-live

**Auth.js adapter note:** Sessions are stored in MongoDB Atlas via `@auth/mongodb-adapter`. Prisma is not used. The adapter is configured inside `packages/auth/src/authjs/`. Session data shape follows the Auth.js v5 MongoDB adapter schema.

**Identity roles:**

- `public`
- `customer`
- `doctor`
- `seller_staff`
- `seller_admin`
- `provider_support`
- `provider_admin`
- `super_admin`

**Access rules:**

- Public routes remain open. No login required.
- Customer routes require customer authentication.
- Seller routes require seller-role authentication.
- Provider admin routes require provider-role authentication.
- `seller_admin` and `provider_admin` require MFA before production go-live.
- Support role access must be scoped and auditable.
- Session revocation and suspicious-session termination must be supported.
- Auth tokens must not be stored in localStorage or sessionStorage.
- Long-lived tokens must not be stored in browser storage.
- Secure HttpOnly cookies are the only browser session mechanism.

**Auth architecture:**

- Auth.js configuration lives in `packages/auth`.
- Shared session validation logic is reusable by both `apps/web/*` and `apps/api`.
- Cookie configuration, role checks, and guard helpers are centralized in `packages/auth`.
- Ad-hoc auth logic must not be duplicated across individual app folders.

---

### 2.8 Storage, Media Delivery, and Edge Layer

**Use:**

- Local filesystem storage in fast local development only
- AWS S3 or Cloudflare R2 in all non-local environments (choose one per environment stack)
- A single adapter layer in `packages/storage`
- CDN-backed media delivery for all public media

**Provider options (choose one for production):**

- Option A: AWS S3 paired with CloudFront for CDN delivery
- Option B: Cloudflare R2 served through a custom domain using Cloudflare caching and protection features

Application logic must be provider-agnostic. The business layer never talks directly to provider SDK code. All storage operations go through `packages/storage`. Switching between local filesystem, S3, and R2 happens through environment config with no business logic or upload logic rewrites.

Public images and static media must be edge-cacheable through CDN. Application JSON and sensitive API responses must not be blindly edge-cached. Sensitive documents must use controlled access via signed URLs.

---

### 2.9 Security, Encryption, Privacy, and Compliance Controls

**Use:**

- HTTPS everywhere outside localhost-only fast dev modes
- TLS 1.3 preferred
- Strong secure-cookie policy
- Encrypted object storage
- Strict audit logging
- Least privilege access
- Sensitive data segregation
- OWASP-aligned secure coding posture
- HIPAA-capable design boundaries
- GDPR and UK GDPR privacy-by-design and privacy-by-default
- India DPDP Act 2023 consent and data principal rights architecture
- Consent management infrastructure (granular, revocable, auditable)
- Data subject and data principal rights processing workflows
- Data retention lifecycle management with configurable purge jobs in `apps/worker`
- Breach detection, incident logging, and regulatory notification workflow
- Rate limiting on all auth-sensitive and abuse-prone endpoints
- Edge protection for abuse and DDoS resistance

All compliance implementation detail is in `COMPLIANCE.md`. The rules enforced at code level are:

- Public browsing must remain open; protected actions must be authenticated and authorized; admin functions must be strongly protected.
- Sensitive data must be segregated from public marketplace data. Protected healthcare data must not be placed into public caches, logs, or search results.
- Queue payloads must avoid unnecessary sensitive data. Backups must be encrypted. Restore procedures must exist.
- All external input must be validated. DTO validation and schema validation are applied at all API boundaries.
- CSRF protection is applied where browser mutation flows require it. Secure headers are applied everywhere.
- File uploads must be validated with type controls and size limits. Internal job trigger endpoints must be protected from external spoofing.
- Compliance mode flags (`ENABLE_GDPR_MODE`, `ENABLE_DPDP_MODE`, etc.) must be `true` in all non-local environments where the applicable regulation applies. These flags must not be disabled in production without an explicit legal justification recorded in the admin audit log.

**Secure transport by mode:**

- `dev-lite` and `dev-module` may use localhost HTTP for speed.
- `dev-integrated` may use localhost HTTP unless the feature under test is transport-security-sensitive.
- `local-prod` must use local HTTPS via mkcert.
- All non-local environments use HTTPS only.

---

### 2.10 Monorepo, Package Management, and Task Orchestration

**Use:**

- pnpm workspaces
- Turborepo

The project is a single monorepo. pnpm is the package manager. Turborepo orchestrates tasks and caching across the monorepo. pnpm is used for all package operations. npm workspaces and yarn are not used.

---

### 2.11 Containers and Local Runtime

**Use:**

- Docker Desktop
- Docker Compose
- mkcert for local HTTPS

Docker Desktop is the local container runtime. Docker Compose is the official local orchestration tool. `local-prod` mode must be validated through Docker Compose with local HTTPS, not through any local Kubernetes or cluster tooling. k3d, Helm, and Kubernetes are not part of this project's official workflow.

---

### 2.12 Testing

**Use:**

- Vitest for unit tests and light integration tests
- Playwright for end-to-end browser flows
- API integration tests
- Search relevance and search behavior tests
- Queue retry and cache invalidation tests

Role-based access flows, security-sensitive routes, cache invalidation behavior, queue retry logic, and critical sync flows must all have test coverage.

---

### 2.13 CI/CD

**Use:**

- GitHub Actions (only CI/CD system for this project)
- Self-hosted runner on the MacBook for local pipeline rehearsal when needed

CI must run lint, typecheck, unit tests, integration checks, build checks, and E2E checks where appropriate. The MacBook may act as a self-hosted GitHub Actions runner for pipeline rehearsal. A second CI system must not be introduced.

---

## 3. Repository Structure

The following is the complete, verbose repository tree. Every folder at every level is defined here. No deviations.

```text
/
├─ apps/
│  ├─ web/
│  │  ├─ web-marketplace/
│  │  │  ├─ app/
│  │  │  │  ├─ (public)/
│  │  │  │  │  ├─ home/
│  │  │  │  │  │  └─ [page.tsx / layout.tsx / loading.tsx / error.tsx / *.md]
│  │  │  │  │  ├─ categories/
│  │  │  │  │  │  └─ [page.tsx / [slug]/ / layout.tsx / *.md]
│  │  │  │  │  ├─ products/
│  │  │  │  │  │  └─ [page.tsx / [slug]/ / layout.tsx / *.md]
│  │  │  │  │  ├─ sellers/
│  │  │  │  │  │  └─ [page.tsx / [slug]/ / layout.tsx / *.md]
│  │  │  │  │  ├─ brands/
│  │  │  │  │  │  └─ [page.tsx / [slug]/ / layout.tsx / *.md]
│  │  │  │  │  ├─ search/
│  │  │  │  │  │  └─ [page.tsx / layout.tsx / *.md]
│  │  │  │  │  ├─ guides/
│  │  │  │  │  │  └─ [page.tsx / [slug]/ / layout.tsx / *.md]
│  │  │  │  │  └─ [layout.tsx / *.md] public zone layout
│  │  │  │  ├─ (customer)/
│  │  │  │  │  ├─ account/
│  │  │  │  │  │  └─ [page.tsx / layout.tsx / *.md]
│  │  │  │  │  ├─ wishlist/
│  │  │  │  │  │  └─ [page.tsx / layout.tsx / *.md]
│  │  │  │  │  ├─ orders/
│  │  │  │  │  │  └─ [page.tsx / [id]/ / layout.tsx / *.md]
│  │  │  │  │  ├─ loyalty/
│  │  │  │  │  │  └─ [page.tsx / layout.tsx / *.md]
│  │  │  │  │  ├─ referrals/
│  │  │  │  │  │  └─ [page.tsx / layout.tsx / *.md]
│  │  │  │  │  └─ [layout.tsx / middleware.ts / *.md] customer zone guard
│  │  │  │  ├─ cart/
│  │  │  │  │  └─ [page.tsx / layout.tsx / *.md]
│  │  │  │  ├─ checkout/
│  │  │  │  │  └─ [page.tsx / layout.tsx / *.md]
│  │  │  │  ├─ auth/
│  │  │  │  │  └─ [signin/ / signout/ / error/ / *.md]
│  │  │  │  ├─ api/
│  │  │  │  │  └─ [auth/ / *.ts] Next.js route handlers
│  │  │  │  └─ [layout.tsx / page.tsx / *.md] root app layout
│  │  │  ├─ components/
│  │  │  │  ├─ marketplace/
│  │  │  │  │  └─ [*.tsx / *.ts / *.md]
│  │  │  │  ├─ product/
│  │  │  │  │  └─ [*.tsx / *.ts / *.md]
│  │  │  │  ├─ seller/
│  │  │  │  │  └─ [*.tsx / *.ts / *.md]
│  │  │  │  ├─ search/
│  │  │  │  │  └─ [*.tsx / *.ts / *.md]
│  │  │  │  ├─ cart/
│  │  │  │  │  └─ [*.tsx / *.ts / *.md]
│  │  │  │  ├─ checkout/
│  │  │  │  │  └─ [*.tsx / *.ts / *.md]
│  │  │  │  ├─ loyalty/
│  │  │  │  │  └─ [*.tsx / *.ts / *.md]
│  │  │  │  ├─ consent/
│  │  │  │  │  └─ [CookieBanner.tsx / ConsentPreferenceCenter.tsx / *.md]
│  │  │  │  └─ [*.tsx / *.ts / *.md] shared marketplace UI
│  │  │  ├─ hooks/
│  │  │  │  └─ [*.ts / *.md] client hooks
│  │  │  ├─ lib/
│  │  │  │  ├─ services/
│  │  │  │  │  └─ [*.ts / *.md] data service resolvers (seed-or-api switching)
│  │  │  │  ├─ mocks/
│  │  │  │  │  └─ [*.ts / *.json / *.md] local seed data references
│  │  │  │  └─ [*.ts / *.md] local utilities
│  │  │  ├─ styles/
│  │  │  │  └─ [globals.css / *.css / *.md]
│  │  │  ├─ public/
│  │  │  │  └─ [*.svg / *.png / *.webp / manifest.json / sw.js / *.md]
│  │  │  ├─ test/
│  │  │  │  └─ [*.spec.ts / *.test.tsx / *.md]
│  │  │  └─ [next.config.ts / tsconfig.json / tailwind.config.ts / package.json / .env.example / *.md]
│  │  │
│  │  ├─ web-seller/
│  │  │  ├─ app/
│  │  │  │  ├─ (seller)/
│  │  │  │  │  ├─ dashboard/
│  │  │  │  │  │  └─ [page.tsx / layout.tsx / *.md]
│  │  │  │  │  ├─ catalog/
│  │  │  │  │  │  └─ [page.tsx / [id]/ / layout.tsx / *.md]
│  │  │  │  │  ├─ inventory/
│  │  │  │  │  │  └─ [page.tsx / layout.tsx / *.md]
│  │  │  │  │  ├─ orders/
│  │  │  │  │  │  └─ [page.tsx / [id]/ / layout.tsx / *.md]
│  │  │  │  │  ├─ documents/
│  │  │  │  │  │  └─ [page.tsx / layout.tsx / *.md]
│  │  │  │  │  ├─ settings/
│  │  │  │  │  │  └─ [page.tsx / layout.tsx / *.md]
│  │  │  │  │  ├─ billing/
│  │  │  │  │  │  └─ [page.tsx / layout.tsx / *.md]
│  │  │  │  │  └─ [layout.tsx / middleware.ts / *.md] seller zone guard
│  │  │  │  ├─ auth/
│  │  │  │  │  └─ [signin/ / signout/ / error/ / *.md]
│  │  │  │  ├─ api/
│  │  │  │  │  └─ [auth/ / *.ts] Next.js route handlers
│  │  │  │  └─ [layout.tsx / page.tsx / *.md] root app layout
│  │  │  ├─ components/
│  │  │  │  ├─ dashboard/
│  │  │  │  │  └─ [*.tsx / *.ts / *.md]
│  │  │  │  ├─ catalog/
│  │  │  │  │  └─ [*.tsx / *.ts / *.md]
│  │  │  │  ├─ inventory/
│  │  │  │  │  └─ [*.tsx / *.ts / *.md]
│  │  │  │  ├─ orders/
│  │  │  │  │  └─ [*.tsx / *.ts / *.md]
│  │  │  │  └─ [*.tsx / *.ts / *.md] shared seller UI
│  │  │  ├─ hooks/
│  │  │  │  └─ [*.ts / *.md]
│  │  │  ├─ lib/
│  │  │  │  ├─ services/
│  │  │  │  │  └─ [*.ts / *.md] data service resolvers
│  │  │  │  ├─ mocks/
│  │  │  │  │  └─ [*.ts / *.json / *.md]
│  │  │  │  └─ [*.ts / *.md] local utilities
│  │  │  ├─ styles/
│  │  │  │  └─ [globals.css / *.css / *.md]
│  │  │  ├─ public/
│  │  │  │  └─ [*.svg / *.png / *.webp / manifest.json / sw.js / *.md]
│  │  │  ├─ test/
│  │  │  │  └─ [*.spec.ts / *.test.tsx / *.md]
│  │  │  └─ [next.config.ts / tsconfig.json / tailwind.config.ts / package.json / .env.example / *.md]
│  │  │
│  │  └─ web-admin/
│  │     ├─ app/
│  │     │  ├─ (admin)/
│  │     │  │  ├─ dashboard/
│  │     │  │  │  └─ [page.tsx / layout.tsx / *.md]
│  │     │  │  ├─ sellers/
│  │     │  │  │  └─ [page.tsx / [id]/ / layout.tsx / *.md]
│  │     │  │  ├─ catalog/
│  │     │  │  │  └─ [page.tsx / layout.tsx / *.md]
│  │     │  │  ├─ billing/
│  │     │  │  │  └─ [page.tsx / layout.tsx / *.md]
│  │     │  │  ├─ moderation/
│  │     │  │  │  └─ [page.tsx / layout.tsx / *.md]
│  │     │  │  ├─ orders/
│  │     │  │  │  └─ [page.tsx / [id]/ / layout.tsx / *.md]
│  │     │  │  ├─ users/
│  │     │  │  │  └─ [page.tsx / layout.tsx / *.md]
│  │     │  │  ├─ sync-monitor/
│  │     │  │  │  └─ [page.tsx / layout.tsx / *.md]
│  │     │  │  ├─ disputes/
│  │     │  │  │  └─ [page.tsx / layout.tsx / *.md]
│  │     │  │  ├─ sponsored/
│  │     │  │  │  └─ [page.tsx / layout.tsx / *.md]
│  │     │  │  ├─ compliance/
│  │     │  │  │  ├─ consent/
│  │     │  │  │  │  └─ [page.tsx / layout.tsx / *.md]
│  │     │  │  │  ├─ dsr/
│  │     │  │  │  │  └─ [page.tsx / layout.tsx / *.md]
│  │     │  │  │  ├─ ropa/
│  │     │  │  │  │  └─ [page.tsx / layout.tsx / *.md]
│  │     │  │  │  ├─ breach/
│  │     │  │  │  │  └─ [page.tsx / layout.tsx / *.md]
│  │     │  │  │  └─ [layout.tsx / *.md] compliance area layout
│  │     │  │  ├─ reports/
│  │     │  │  │  └─ [page.tsx / layout.tsx / *.md]
│  │     │  │  ├─ settings/
│  │     │  │  │  └─ [page.tsx / layout.tsx / *.md]
│  │     │  │  └─ [layout.tsx / middleware.ts / *.md] admin zone guard
│  │     │  ├─ auth/
│  │     │  │  └─ [signin/ / signout/ / error/ / *.md]
│  │     │  ├─ api/
│  │     │  │  └─ [auth/ / *.ts] Next.js route handlers
│  │     │  └─ [layout.tsx / page.tsx / *.md] root app layout
│  │     ├─ components/
│  │     │  ├─ dashboard/
│  │     │  │  └─ [*.tsx / *.ts / *.md]
│  │     │  ├─ sellers/
│  │     │  │  └─ [*.tsx / *.ts / *.md]
│  │     │  ├─ catalog/
│  │     │  │  └─ [*.tsx / *.ts / *.md]
│  │     │  ├─ moderation/
│  │     │  │  └─ [*.tsx / *.ts / *.md]
│  │     │  ├─ compliance/
│  │     │  │  └─ [*.tsx / *.ts / *.md]
│  │     │  └─ [*.tsx / *.ts / *.md] shared admin UI
│  │     ├─ hooks/
│  │     │  └─ [*.ts / *.md]
│  │     ├─ lib/
│  │     │  ├─ services/
│  │     │  │  └─ [*.ts / *.md] data service resolvers
│  │     │  ├─ mocks/
│  │     │  │  └─ [*.ts / *.json / *.md]
│  │     │  └─ [*.ts / *.md] local utilities
│  │     ├─ styles/
│  │     │  └─ [globals.css / *.css / *.md]
│  │     ├─ public/
│  │     │  └─ [*.svg / *.png / *.webp / manifest.json / sw.js / *.md]
│  │     ├─ test/
│  │     │  └─ [*.spec.ts / *.test.tsx / *.md]
│  │     └─ [next.config.ts / tsconfig.json / tailwind.config.ts / package.json / .env.example / *.md]
│  │
│  ├─ api/
│  │  ├─ src/
│  │  │  ├─ main/
│  │  │  │  └─ [main.ts / app.module.ts / *.md]
│  │  │  ├─ config/
│  │  │  │  └─ [*.ts / *.md] runtime config loaders
│  │  │  ├─ common/
│  │  │  │  ├─ guards/
│  │  │  │  │  └─ [*.guard.ts / *.md]
│  │  │  │  ├─ interceptors/
│  │  │  │  │  └─ [*.interceptor.ts / *.md]
│  │  │  │  ├─ filters/
│  │  │  │  │  └─ [*.filter.ts / *.md]
│  │  │  │  ├─ decorators/
│  │  │  │  │  └─ [*.decorator.ts / *.md]
│  │  │  │  ├─ pipes/
│  │  │  │  │  └─ [*.pipe.ts / *.md]
│  │  │  │  └─ [*.ts / *.md] shared backend utilities
│  │  │  ├─ modules/
│  │  │  │  ├─ auth/
│  │  │  │  │  └─ [*.module.ts / *.controller.ts / *.service.ts / *.dto.ts / *.md]
│  │  │  │  ├─ users/
│  │  │  │  │  └─ [*.module.ts / *.controller.ts / *.service.ts / *.dto.ts / *.md]
│  │  │  │  ├─ customers/
│  │  │  │  │  └─ [*.module.ts / *.controller.ts / *.service.ts / *.dto.ts / *.md]
│  │  │  │  ├─ sellers/
│  │  │  │  │  └─ [*.module.ts / *.controller.ts / *.service.ts / *.dto.ts / *.md]
│  │  │  │  ├─ catalog/
│  │  │  │  │  └─ [*.module.ts / *.controller.ts / *.service.ts / *.dto.ts / *.md]
│  │  │  │  ├─ categories/
│  │  │  │  │  └─ [*.module.ts / *.controller.ts / *.service.ts / *.dto.ts / *.md]
│  │  │  │  ├─ products/
│  │  │  │  │  └─ [*.module.ts / *.controller.ts / *.service.ts / *.dto.ts / *.md]
│  │  │  │  ├─ search/
│  │  │  │  │  └─ [*.module.ts / *.controller.ts / *.service.ts / *.dto.ts / *.md]
│  │  │  │  ├─ cart/
│  │  │  │  │  └─ [*.module.ts / *.controller.ts / *.service.ts / *.dto.ts / *.md]
│  │  │  │  ├─ checkout/
│  │  │  │  │  └─ [*.module.ts / *.controller.ts / *.service.ts / *.dto.ts / *.md]
│  │  │  │  ├─ orders/
│  │  │  │  │  └─ [*.module.ts / *.controller.ts / *.service.ts / *.dto.ts / *.md]
│  │  │  │  ├─ documents/
│  │  │  │  │  └─ [*.module.ts / *.controller.ts / *.service.ts / *.dto.ts / *.md]
│  │  │  │  ├─ loyalty/
│  │  │  │  │  └─ [*.module.ts / *.controller.ts / *.service.ts / *.dto.ts / *.md]
│  │  │  │  ├─ referrals/
│  │  │  │  │  └─ [*.module.ts / *.controller.ts / *.service.ts / *.dto.ts / *.md]
│  │  │  │  ├─ admin/
│  │  │  │  │  └─ [*.module.ts / *.controller.ts / *.service.ts / *.dto.ts / *.md]
│  │  │  │  ├─ seller-portal/
│  │  │  │  │  └─ [*.module.ts / *.controller.ts / *.service.ts / *.dto.ts / *.md]
│  │  │  │  ├─ uploads/
│  │  │  │  │  └─ [*.module.ts / *.controller.ts / *.service.ts / *.dto.ts / *.md]
│  │  │  │  ├─ health/
│  │  │  │  │  └─ [*.module.ts / *.controller.ts / *.md]
│  │  │  │  └─ compliance/
│  │  │  │     ├─ consent/
│  │  │  │     │  └─ [*.module.ts / *.controller.ts / *.service.ts / *.dto.ts / *.md]
│  │  │  │     ├─ dsr/
│  │  │  │     │  └─ [*.module.ts / *.controller.ts / *.service.ts / *.dto.ts / *.md]
│  │  │  │     ├─ breach/
│  │  │  │     │  └─ [*.module.ts / *.controller.ts / *.service.ts / *.dto.ts / *.md]
│  │  │  │     └─ [*.module.ts / *.md] compliance module root
│  │  │  ├─ integrations/
│  │  │  │  ├─ storage/
│  │  │  │  │  └─ [*.ts / *.md]
│  │  │  │  ├─ search/
│  │  │  │  │  └─ [*.ts / *.md]
│  │  │  │  ├─ email/
│  │  │  │  │  └─ [*.ts / *.md]
│  │  │  │  └─ external-sync/
│  │  │  │     └─ [*.ts / *.md] seller backend integration adapters
│  │  │  ├─ jobs/
│  │  │  │  └─ [*.ts / *.md] enqueue helpers
│  │  │  └─ [*.ts / *.md] root app files
│  │  ├─ test/
│  │  │  └─ [*.spec.ts / *.e2e-spec.ts / *.md]
│  │  ├─ scripts/
│  │  │  └─ [*.ts / *.sh / *.md]
│  │  └─ [package.json / tsconfig.json / .env.example / *.md]
│  │
│  └─ worker/
│     ├─ src/
│     │  ├─ main/
│     │  │  └─ [main.ts / app.module.ts / *.md]
│     │  ├─ config/
│     │  │  └─ [*.ts / *.md]
│     │  ├─ queues/
│     │  │  ├─ order-sync/
│     │  │  │  └─ [*.ts / *.md] active push/pull to and from seller ERPs
│     │  │  ├─ inventory-sync/
│     │  │  │  └─ [*.ts / *.md]
│     │  │  ├─ notifications/
│     │  │  │  └─ [*.ts / *.md]
│     │  │  ├─ cache-invalidation/
│     │  │  │  └─ [*.ts / *.md]
│     │  │  ├─ projections/
│     │  │  │  └─ [*.ts / *.md]
│     │  │  ├─ loyalty-referrals/
│     │  │  │  └─ [*.ts / *.md]
│     │  │  ├─ reconciliation/
│     │  │  │  └─ [*.ts / *.md]
│     │  │  ├─ data-retention/
│     │  │  │  └─ [*.ts / *.md]
│     │  │  ├─ dsr-fulfilment/
│     │  │  │  └─ [*.ts / *.md]
│     │  │  ├─ consent-lifecycle/
│     │  │  │  └─ [*.ts / *.md]
│     │  │  └─ breach-notification/
│     │  │     └─ [*.ts / *.md]
│     │  ├─ processors/
│     │  │  ├─ order-sync/
│     │  │  │  └─ [*.processor.ts / *.md]
│     │  │  ├─ inventory-sync/
│     │  │  │  └─ [*.processor.ts / *.md]
│     │  │  ├─ notifications/
│     │  │  │  └─ [*.processor.ts / *.md]
│     │  │  ├─ cache-invalidation/
│     │  │  │  └─ [*.processor.ts / *.md]
│     │  │  ├─ projections/
│     │  │  │  └─ [*.processor.ts / *.md]
│     │  │  ├─ loyalty-referrals/
│     │  │  │  └─ [*.processor.ts / *.md]
│     │  │  ├─ reconciliation/
│     │  │  │  └─ [*.processor.ts / *.md]
│     │  │  ├─ data-retention/
│     │  │  │  └─ [*.processor.ts / *.md]
│     │  │  ├─ dsr-fulfilment/
│     │  │  │  └─ [*.processor.ts / *.md]
│     │  │  ├─ consent-lifecycle/
│     │  │  │  └─ [*.processor.ts / *.md]
│     │  │  └─ breach-notification/
│     │  │     └─ [*.processor.ts / *.md]
│     │  ├─ schedulers/
│     │  │  └─ [*.ts / *.md] cron and schedule definitions
│     │  ├─ retry-policies/
│     │  │  └─ [*.ts / *.md]
│     │  ├─ monitoring/
│     │  │  └─ [*.ts / *.md] job metrics and failure alerts
│     │  ├─ integrations/
│     │  │  ├─ external-sync/
│     │  │  │  └─ [*.ts / *.md] seller ERP push and pull adapters
│     │  │  ├─ email/
│     │  │  │  └─ [*.ts / *.md]
│     │  │  └─ storage/
│     │  │     └─ [*.ts / *.md]
│     │  └─ [*.ts / *.md] root worker files
│     ├─ test/
│     │  └─ [*.spec.ts / *.md]
│     ├─ scripts/
│     │  └─ [*.ts / *.sh / *.md]
│     └─ [package.json / tsconfig.json / .env.example / *.md]
│
├─ packages/
│  ├─ ui/
│  │  ├─ src/
│  │  │  ├─ primitives/
│  │  │  │  └─ [Button/ / Input/ / Card/ / Modal/ / *.tsx / *.md]
│  │  │  ├─ marketplace/
│  │  │  │  └─ [ProductCard/ / CategoryCard/ / SellerCard/ / SearchBar/ / *.tsx / *.md]
│  │  │  ├─ admin/
│  │  │  │  └─ [DataTable/ / StatCard/ / ModerationCard/ / *.tsx / *.md]
│  │  │  ├─ seller/
│  │  │  │  └─ [InventoryRow/ / OrderCard/ / SyncStatus/ / *.tsx / *.md]
│  │  │  ├─ forms/
│  │  │  │  └─ [FormField/ / FormSection/ / *.tsx / *.md]
│  │  │  ├─ overlays/
│  │  │  │  └─ [Drawer/ / Dialog/ / Toast/ / *.tsx / *.md]
│  │  │  ├─ consent/
│  │  │  │  └─ [CookieBanner/ / ConsentCenter/ / *.tsx / *.md]
│  │  │  └─ [index.ts / *.md]
│  │  ├─ styles/
│  │  │  └─ [tokens.css / *.css / *.md]
│  │  └─ [package.json / tsconfig.json / *.md]
│  │
│  ├─ config/
│  │  ├─ src/
│  │  │  ├─ env/
│  │  │  │  └─ [*.ts / *.md] env parsers and validators
│  │  │  ├─ flags/
│  │  │  │  └─ [*.ts / *.md] feature and compliance flags
│  │  │  ├─ modes/
│  │  │  │  └─ [*.ts / *.md] runtime mode resolvers
│  │  │  └─ [index.ts / *.md]
│  │  └─ [package.json / tsconfig.json / *.md]
│  │
│  ├─ auth/
│  │  ├─ src/
│  │  │  ├─ authjs/
│  │  │  │  └─ [config.ts / adapter.ts / *.md] Auth.js v5 + @auth/mongodb-adapter setup
│  │  │  ├─ guards/
│  │  │  │  └─ [*.ts / *.md]
│  │  │  ├─ roles/
│  │  │  │  └─ [*.ts / *.md]
│  │  │  ├─ sessions/
│  │  │  │  └─ [*.ts / *.md]
│  │  │  ├─ mfa/
│  │  │  │  └─ [*.ts / *.md]
│  │  │  └─ [index.ts / *.md]
│  │  └─ [package.json / tsconfig.json / *.md]
│  │
│  ├─ database/
│  │  ├─ src/
│  │  │  ├─ client/
│  │  │  │  └─ [mongoose.ts / native.ts / *.md] Mongoose and native driver setup
│  │  │  ├─ schemas/
│  │  │  │  └─ [*.schema.ts / *.md] Mongoose schema definitions
│  │  │  ├─ collections/
│  │  │  │  └─ [*.ts / *.md] collection helpers
│  │  │  ├─ indexes/
│  │  │  │  └─ [*.ts / *.md] index definitions
│  │  │  ├─ pipelines/
│  │  │  │  └─ [*.pipeline.ts / *.md] native aggregation pipeline builders
│  │  │  ├─ transactions/
│  │  │  │  └─ [*.ts / *.md]
│  │  │  ├─ seeds/
│  │  │  │  └─ [*.seed.ts / *.json / *.md] seed data matching final collection shapes
│  │  │  └─ [index.ts / *.md]
│  │  └─ [package.json / tsconfig.json / *.md]
│  │
│  ├─ contracts/
│  │  ├─ src/
│  │  │  ├─ api/
│  │  │  │  └─ [*.ts / *.md] API shape contracts
│  │  │  ├─ dto/
│  │  │  │  └─ [*.dto.ts / *.md] DTO definitions with Zod schemas
│  │  │  ├─ events/
│  │  │  │  └─ [*.ts / *.md] domain event payloads
│  │  │  ├─ jobs/
│  │  │  │  └─ [*.ts / *.md] queue job payload types
│  │  │  └─ [index.ts / *.md]
│  │  └─ [package.json / tsconfig.json / *.md]
│  │
│  ├─ search/
│  │  ├─ src/
│  │  │  ├─ atlas-search/
│  │  │  │  └─ [*.ts / *.md] Atlas Search index definitions and helpers
│  │  │  ├─ queries/
│  │  │  │  └─ [*.ts / *.md] search query builders
│  │  │  ├─ builders/
│  │  │  │  └─ [*.ts / *.md] autocomplete and suggestion builders
│  │  │  ├─ ranking/
│  │  │  │  └─ [*.ts / *.md] ranking and boosting logic
│  │  │  ├─ suggestions/
│  │  │  │  └─ [*.ts / *.md] suggestion and related-product logic
│  │  │  └─ [index.ts / *.md]
│  │  └─ [package.json / tsconfig.json / *.md]
│  │
│  ├─ storage/
│  │  ├─ src/
│  │  │  ├─ local-fs/
│  │  │  │  └─ [*.ts / *.md] local filesystem adapter
│  │  │  ├─ s3/
│  │  │  │  └─ [*.ts / *.md] AWS S3 adapter
│  │  │  ├─ r2/
│  │  │  │  └─ [*.ts / *.md] Cloudflare R2 adapter
│  │  │  ├─ signing/
│  │  │  │  └─ [*.ts / *.md] presigned URL helpers
│  │  │  ├─ urls/
│  │  │  │  └─ [*.ts / *.md] CDN URL builders
│  │  │  └─ [index.ts / *.md]
│  │  └─ [package.json / tsconfig.json / *.md]
│  │
│  ├─ cache/
│  │  ├─ src/
│  │  │  ├─ redis/
│  │  │  │  └─ [*.ts / *.md] Redis client setup
│  │  │  ├─ keys/
│  │  │  │  └─ [*.ts / *.md] versioned cache key builders
│  │  │  ├─ invalidation/
│  │  │  │  └─ [*.ts / *.md] cache invalidation helpers
│  │  │  ├─ rate-limit/
│  │  │  │  └─ [*.ts / *.md] rate limit counter helpers
│  │  │  └─ [index.ts / *.md]
│  │  └─ [package.json / tsconfig.json / *.md]
│  │
│  ├─ observability/
│  │  ├─ src/
│  │  │  ├─ logging/
│  │  │  │  └─ [*.ts / *.md]
│  │  │  ├─ tracing/
│  │  │  │  └─ [*.ts / *.md]
│  │  │  ├─ metrics/
│  │  │  │  └─ [*.ts / *.md]
│  │  │  ├─ audit/
│  │  │  │  └─ [*.ts / *.md] audit log helpers for critical actions
│  │  │  └─ [index.ts / *.md]
│  │  └─ [package.json / tsconfig.json / *.md]
│  │
│  ├─ security/
│  │  ├─ src/
│  │  │  ├─ headers/
│  │  │  │  └─ [*.ts / *.md] secure headers policy
│  │  │  ├─ csrf/
│  │  │  │  └─ [*.ts / *.md]
│  │  │  ├─ encryption/
│  │  │  │  └─ [*.ts / *.md]
│  │  │  ├─ validation/
│  │  │  │  └─ [*.ts / *.md] input validation hardening
│  │  │  ├─ consent/
│  │  │  │  └─ [*.ts / *.md] consent capture, storage, withdrawal, audit trail
│  │  │  ├─ dsr/
│  │  │  │  └─ [*.ts / *.md] data subject and data principal rights request helpers
│  │  │  ├─ retention/
│  │  │  │  └─ [*.ts / *.md] retention schedule and purge helpers
│  │  │  ├─ breach/
│  │  │  │  └─ [*.ts / *.md] breach incident logging and notification triggers
│  │  │  ├─ cross-border/
│  │  │  │  └─ [*.ts / *.md] cross-border transfer guards
│  │  │  └─ privacy-notice/
│  │  │     └─ [*.ts / *.md] privacy notice version management
│  │  └─ [package.json / tsconfig.json / *.md]
│  │
│  ├─ utils/
│  │  ├─ src/
│  │  │  ├─ strings/
│  │  │  │  └─ [*.ts / *.md]
│  │  │  ├─ dates/
│  │  │  │  └─ [*.ts / *.md]
│  │  │  ├─ ids/
│  │  │  │  └─ [*.ts / *.md]
│  │  │  ├─ formatting/
│  │  │  │  └─ [*.ts / *.md]
│  │  │  ├─ i18n/
│  │  │  │  └─ [*.ts / *.md] internationalisation helpers
│  │  │  └─ [index.ts / *.md]
│  │  └─ [package.json / tsconfig.json / *.md]
│  │
│  └─ test-kit/
│     ├─ src/
│     │  ├─ fixtures/
│     │  │  └─ [*.ts / *.json / *.md] shared test fixtures matching seed data shapes
│     │  ├─ factories/
│     │  │  └─ [*.factory.ts / *.md] mock object factories
│     │  ├─ mocks/
│     │  │  └─ [*.ts / *.md] mock service and adapter implementations
│     │  ├─ helpers/
│     │  │  └─ [*.ts / *.md] test setup and assertion helpers
│     │  └─ [index.ts / *.md]
│     └─ [package.json / tsconfig.json / *.md]
│
├─ infra/
│  ├─ docker/
│  │  ├─ web-marketplace/
│  │  │  └─ [Dockerfile / *.md]
│  │  ├─ web-seller/
│  │  │  └─ [Dockerfile / *.md]
│  │  ├─ web-admin/
│  │  │  └─ [Dockerfile / *.md]
│  │  ├─ api/
│  │  │  └─ [Dockerfile / *.md]
│  │  ├─ worker/
│  │  │  └─ [Dockerfile / *.md]
│  │  └─ nginx/
│  │     └─ [Dockerfile / *.md]
│  │
│  ├─ compose/
│  │  ├─ base/
│  │  │  └─ [docker-compose.base.yml / *.md]
│  │  ├─ dev-lite/
│  │  │  └─ [docker-compose.dev-lite.yml / *.md]
│  │  ├─ dev-module/
│  │  │  └─ [docker-compose.dev-module.yml / *.md]
│  │  ├─ dev-integrated/
│  │  │  └─ [docker-compose.dev-integrated.yml / *.md]
│  │  └─ local-prod/
│  │     └─ [docker-compose.local-prod.yml / *.md]
│  │
│  ├─ nginx/
│  │  ├─ conf/
│  │  │  └─ [*.conf / *.md]
│  │  └─ snippets/
│  │     └─ [*.conf / *.md]
│  │
│  ├─ redis/
│  │  └─ conf/
│  │     └─ [redis.conf / *.md]
│  │
│  ├─ scripts/
│  │  ├─ setup/
│  │  │  └─ [*.sh / *.ts / *.md]
│  │  ├─ seed/
│  │  │  └─ [*.sh / *.ts / *.md]
│  │  ├─ certs/
│  │  │  └─ [*.sh / *.md] mkcert certificate generation
│  │  └─ health/
│  │     └─ [*.sh / *.md]
│  │
│  └─ certs/
│     └─ [*.pem / *.key / *.crt / *.md] local mkcert assets — gitignored
│
├─ vendor/
│  └─ theme-source/
│     ├─ web-marketplace/
│     │  └─ [vendor-owned theme files — read-only — gitignored]
│     └─ web-seller-admin/
│        └─ [vendor-owned theme files — read-only — gitignored]
│
├─ docs/
│  ├─ architecture/
│  │  └─ [*.md]
│  ├─ decisions/
│  │  └─ [*.md] architecture decision records
│  ├─ api/
│  │  └─ [*.md]
│  ├─ database/
│  │  └─ [*.md]
│  └─ flows/
│     └─ [*.md] system flow walkthroughs
│
├─ .github/
│  └─ workflows/
│     └─ [*.yml / *.yaml] CI/CD workflow files
│
├─ scripts/
│  ├─ setup/
│  │  └─ [*.sh / *.ts / *.md]
│  ├─ dev/
│  │  └─ [*.sh / *.ts / *.md]
│  ├─ build/
│  │  └─ [*.sh / *.ts / *.md]
│  └─ release/
│     └─ [*.sh / *.ts / *.md]
│
├─ env/
│  ├─ .env.base
│  ├─ .env.dev-lite
│  ├─ .env.dev-module
│  ├─ .env.dev-integrated
│  ├─ .env.local-prod
│  └─ .env.prod.example
│
├─ pnpm-workspace.yaml
├─ pnpm-lock.yaml
├─ turbo.json
├─ package.json
└─ README.md
```

---

## 4. Repository Rules

All reusable UI belongs in `packages/ui`. All shared config belongs in `packages/config`. All auth utilities belong in `packages/auth`. All MongoDB schemas, collection definitions, index definitions, pipeline builders, and DB helpers belong in `packages/database`. All storage adapters belong in `packages/storage`. All search query builders and ranking helpers belong in `packages/search`. All shared cache helpers and invalidation logic belong in `packages/cache`.

The `vendor/theme-source/` folder is entirely in `.gitignore`. No application may import runtime code directly from it. It is a read-only design donor, studied by the coding agent to reconstruct visual patterns into `packages/ui`. The theme source is split by target app: `vendor/theme-source/web-marketplace/` holds the marketplace theme, and `vendor/theme-source/web-seller-admin/` holds the shared theme for the seller portal and admin panel.

---

## 5. App Responsibilities

### 5.1 `apps/web/web-marketplace`

This application is the public marketplace and customer account application. It includes all public marketplace pages (homepage, categories, products, sellers, brands, search, guides), the customer account area (wishlist, orders, loyalty, referrals), cart, checkout initiation, order history, downloadable customer documents, the PWA shell, and all auth entry routes for customers.

Public pages must remain indexable where intended. Account pages must be protected. Customer-only features must be behind login. Route groups separate the public zone from the customer zone.

### 5.2 `apps/web/web-seller`

This application is the seller portal. Sellers log in here to manage their marketplace responsibilities: catalog management, inventory and pricing visibility, order management, document access, settings, and billing for their marketplace subscription. All routes are protected by seller-role authentication. MFA is required for `seller_admin` before production go-live.

### 5.3 `apps/web/web-admin`

This application is the provider/operator admin control panel. It is used internally by the marketplace operator team. It includes seller onboarding and management, catalog moderation, sponsored placement management, billing, sync monitoring, dispute handling, fraud review, user and role management, and all compliance operations (consent audit, DSR fulfilment queue, RoPA, breach incident management). All routes are protected by provider-role authentication. MFA is required for all admin roles before production go-live.

### 5.4 `apps/api`

The main API serving all client-facing and internal request-response flows. Contains public API, protected API, internal API, and role-aware business logic across all domains. Also contains compliance APIs: consent record creation, retrieval, and withdrawal; cookie consent preference submission; data subject and data principal rights request submission; DSR admin queue management; breach incident creation and admin workflow; personal data export generation; RoPA records management; and privacy notice version serving. All protected APIs enforce auth and authorization server-side. No protected API relies only on client-side route hiding.

### 5.5 `apps/worker`

Handles all non-request-response work: active order-sync push and pull jobs between marketplace and seller ERPs, inventory sync, retries, reconciliation, notifications, delayed and scheduled jobs, cache invalidation, projection rebuilds, loyalty and referral processing, analytics materialization, data retention purge jobs, DSR fulfilment jobs, consent lifecycle jobs, and breach notification escalation jobs. All jobs must be observable, retryable, and recoverable.

---

## 6. Package Responsibilities

### 6.1 `packages/ui`

The internal design system. Contains shadcn/ui-based primitives, theme-reconstructed components for each app zone (marketplace, admin, seller), form components, overlay components, and consent UI components. All reusable UI belongs here. Theme-inspired components are rebuilt here from scratch in project-native code.

### 6.2 `packages/config`

Runtime-mode config, env parsing, feature flags, service toggles, compliance flags, and shared constants. All apps read their runtime configuration through this package. No app maintains its own independent config system.

### 6.3 `packages/auth`

Auth.js v5 configuration, `@auth/mongodb-adapter` setup, session utilities, route guards, role helpers, permission mapping, MFA helpers, and cookie configuration. Shared auth validation helpers are used by both frontend apps and the API.

### 6.4 `packages/database`

Mongoose schema definitions, collection helpers, index definitions, Mongoose model exports, native MongoDB driver aggregation pipeline builders in `pipelines/`, transaction helpers, and seed data in `seeds/`. Seed data shapes must mirror exactly what the final MongoDB collections will look like at project completion.

### 6.5 `packages/contracts`

DTO contracts, Zod schemas for validation, domain event payloads, queue job payload types, and API shape contracts. These are the single source of truth for all data boundaries.

### 6.6 `packages/search`

Atlas Search index definitions, query builders, autocomplete and suggestion builders, ranking and boosting logic, synonym-aware retrieval helpers, and result shaping utilities.

### 6.7 `packages/storage`

Local filesystem adapter, AWS S3 adapter, Cloudflare R2 adapter, presigned URL helpers, CDN URL builders, and file metadata helpers. The business layer always goes through this package; it never calls provider SDKs directly.

### 6.8 `packages/cache`

Redis client setup, versioned cache key builders, cache invalidation helpers, and rate-limit counter helpers.

### 6.9 `packages/observability`

Logging setup, tracing helpers, audit log helpers for critical actions, metrics helpers, and job monitoring helpers.

### 6.10 `packages/security`

Secure headers policy, CSRF utilities, encryption helpers, input validation hardening, consent management helpers (capture, storage, withdrawal, audit trail), data subject and data principal rights request helpers, data retention and purge schedule helpers, breach incident logging and notification trigger helpers, cross-border transfer guards, and privacy notice version management.

### 6.11 `packages/utils`

Generic shared helpers that are cross-cutting: strings, dates, ID generation, formatting, and internationalisation (`i18n`) helpers. The i18n helpers support multi-language from day one even though only English is active at launch.

### 6.12 `packages/test-kit`

Shared test fixtures, mock object factories, mock service and adapter implementations, and test setup and assertion helpers. Fixtures here mirror the seed data shapes in `packages/database/seeds/`.

---

## 7. Theme Integration Rules

### 7.1 Theme source placement

Purchased theme files are placed manually in:

- `vendor/theme-source/web-marketplace/` — the marketplace-facing theme
- `vendor/theme-source/web-seller-admin/` — the shared theme for seller portal and admin panel

Both folders are fully in `.gitignore` and treated as read-only design donors. The coding agent studies these to understand visual structure, design language, spacing, typography, animation behavior, interactive patterns, layout rhythm, and color usage.

### 7.2 Theme output policy

The coding agent reconstructs all useful visual patterns as project-native code inside `packages/ui`. No application imports runtime code from `vendor/theme-source/`. No application binds to theme routing, theme page architecture, theme static mock data, or theme state management patterns.

### 7.3 What the theme is used for

The theme is used for: look and feel, interaction patterns, visual composition, design tokens, UI inspiration, and component behavior references.

The theme is not used for: domain logic, routing logic, data fetching architecture, state architecture, storage architecture, auth architecture, or business rules.

---

## 8. Local Development Modes

The codebase supports four official local modes. Mode switching happens entirely through environment variables and package scripts. No manual commenting or uncommenting of code files is allowed to switch modes.

### 8.1 Mode definitions

**`dev-lite`** is the lightest possible mode. Its purpose is to render one or more pages or components with no external dependencies at all — no auth, no real API, no database, no Redis, no queue, no search, no storage provider. Page data comes entirely from seed files in `packages/database/seeds/` served through the data service resolver layer. This is used at the very beginning of any new UI slice when nothing else is yet available. It is not a soft variant of any other mode; it is a distinct, deliberate choice for isolated view-level work.

**`dev-module`** is used to develop one specific app or business module with selective real dependencies. Redis, real Atlas database, and real Auth.js may be enabled individually based on what the specific feature under work actually needs. Not all dependencies are required simultaneously — the config flags for each adapter are set per-feature, per-session. This mode is distinct from `dev-lite` because it may connect to real data sources for the module being developed.

**`dev-integrated`** is the full local development mode with all services running. This includes all three frontend apps (or the selected ones), the API, the worker, Redis, real Auth.js database sessions, real MongoDB Atlas, real Atlas Search, and real storage adapter when the feature needs uploads. This is the mode used to validate that a feature works end to end before declaring it complete.

**`local-prod`** is the full Dockerized local deployment. All apps, API, worker, Redis, nginx reverse proxy, and local HTTPS via mkcert run as containers. This uses real Atlas Search, real selected storage provider config, and real auth with no mocks anywhere. This is used at each major zone completion checkpoint and before merges or releases.

### 8.2 Per-app commands

Every frontend app supports all four dev modes individually:

```bash
# web-marketplace
pnpm --filter web-marketplace dev:lite
pnpm --filter web-marketplace dev:module
pnpm --filter web-marketplace dev:integrated
pnpm --filter web-marketplace dev:local-prod

# web-seller
pnpm --filter web-seller dev:lite
pnpm --filter web-seller dev:module
pnpm --filter web-seller dev:integrated
pnpm --filter web-seller dev:local-prod

# web-admin
pnpm --filter web-admin dev:lite
pnpm --filter web-admin dev:module
pnpm --filter web-admin dev:integrated
pnpm --filter web-admin dev:local-prod

# api
pnpm --filter api dev:lite
pnpm --filter api dev:module
pnpm --filter api dev:integrated

# worker
pnpm --filter worker dev:module
pnpm --filter worker dev:integrated
```

### 8.3 Root/ecosystem-level commands

The root package.json provides ecosystem commands that start configured combinations of apps together:

```bash
pnpm dev:lite                   # starts all web apps in dev-lite mode (no dependencies)
pnpm dev:module                 # starts configured subset of apps with selective dependencies
pnpm dev:integrated             # starts all apps with all real services
pnpm dev:local-prod             # starts full Dockerized stack with local HTTPS

pnpm infra:up:lite              # starts only the infra services needed for dev-lite
pnpm infra:up:integrated        # starts Redis and any local infra for dev-integrated
pnpm infra:up:local-prod        # starts full Docker Compose stack for local-prod
pnpm infra:down                 # stops all running infra

pnpm test                       # runs all unit and integration tests via Vitest
pnpm test:e2e                   # runs Playwright E2E tests
pnpm lint                       # lints all packages and apps
pnpm typecheck                  # runs TypeScript checks across the monorepo
pnpm build                      # builds all apps and packages
pnpm db:seed                    # runs seed scripts from packages/database/seeds/
```

The exact ENABLED_APPS combination for `dev:module` and `dev:integrated` is controlled through the env file for that mode, not by code changes.

---

## 9. Data Service Resolver Pattern (Seed-or-API Switching)

This is the mechanism that allows the same component and service code to work in all four dev modes without rewriting.

Each frontend app contains a `lib/services/` folder. Every data access call from a component goes through a service function in this folder — never directly to an API endpoint or to a seed file. The service function reads `APP_RUNTIME_MODE` from `packages/config` and routes the request accordingly:

- In `dev-lite`: the service function reads from the corresponding seed file in `packages/database/seeds/` and returns data shaped identically to what the real API would return.
- In `dev-module`: the service function reads from seed files or calls the real API depending on which adapters are enabled via config flags (`USE_REAL_API`, `AUTH_MODE`, etc.).
- In `dev-integrated` and `local-prod`: the service function always calls the real API endpoint.

The component itself never changes. The DTO shape returned by the seed file and the real API are identical because seed data mirrors final collection shapes. The service function is the only place the routing decision lives, and it is driven entirely by environment config.

This means a component built in `dev-lite` with seed data today will automatically call the real API tomorrow simply by changing the runtime mode — no component rewrites, no mock removal passes, no conditional imports spread through component code.

---

## 10. Environment and Secrets Strategy

### 10.1 Env file structure

The following files exist in the `env/` folder at the repo root:

- `.env.base` — non-secret shared defaults and non-secret feature flags applicable across all modes. Committed to Git.
- `.env.dev-lite` — mode-specific non-secret config for dev-lite. Committed to Git.
- `.env.dev-module` — mode-specific non-secret config for dev-module. Committed to Git.
- `.env.dev-integrated` — mode-specific non-secret config for dev-integrated. Committed to Git.
- `.env.local-prod` — mode-specific non-secret config for local-prod. Committed to Git.
- `.env.prod.example` — documents every required production environment variable name with placeholder values. Committed to Git. No real secrets.

Each app also maintains its own `.env.example` at the app root documenting all variables that app reads. These are committed to Git and serve as setup guides for developers.

Actual secret values never enter Git at any point.

### 10.2 Secrets management

**GitHub Encrypted Secrets** are the secret store. All real credentials — MongoDB Atlas connection string, Redis password, object storage access keys, Auth.js secret, email provider keys, and any third-party integration tokens — are stored as encrypted secrets in GitHub, scoped to GitHub Environments (separate namespaces for staging and production with optional approval gates).

**Docker env file injection** is the delivery mechanism. When a GitHub Actions workflow runs to build or deploy, it reads from GitHub Secrets and writes the actual `.env` files just before building images or triggering deployment. Secrets are in memory only during the workflow run and never appear in logs.

On each DigitalOcean droplet, the `.env` file lives in a non-web-accessible directory with restrictive filesystem permissions (`600` or `640`, owner-readable only). The droplet runs `docker compose up` using those env files. The droplet never receives secrets through the Git clone — it only receives them through the CI/CD workflow's secure injection.

### 10.3 Container-to-container communication

Within a single Docker Compose stack, containers communicate through Docker's internal bridge network using service names as hostnames. For example, the worker container reaches the API container as `http://api:3001`. This requires no secrets — it is private Docker networking not exposed to the internet. Service names are defined in the Compose file and configured as non-secret environment variables.

### 10.4 Droplet-to-droplet communication

The two DigitalOcean droplets (frontend droplet and backend droplet) communicate through DigitalOcean's free private networking interface, which provides internal IP addresses within the same region. The frontend apps' server-side requests to the API use the private IP of the backend droplet, not the public internet. This private IP is injected as a non-secret environment variable at deploy time through GitHub Actions.

### 10.5 Runtime mode flags (non-secret, committed)

All mode-switching flags live in the committed env files. These include:

| Flag                                  | Purpose                                                                                         |
| ------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `APP_RUNTIME_MODE`                    | Selects the active mode: `dev-lite`, `dev-module`, `dev-integrated`, `local-prod`, `production` |
| `AUTH_MODE`                           | `mock` or `real`                                                                                |
| `SEARCH_MODE`                         | `mock` or `atlas`                                                                               |
| `STORAGE_MODE`                        | `local-fs` or `provider`                                                                        |
| `CACHE_MODE`                          | `memory` or `redis`                                                                             |
| `QUEUE_MODE`                          | `inline` or `redis`                                                                             |
| `USE_REAL_API`                        | `true` or `false`                                                                               |
| `USE_REAL_DB`                         | `true` or `false`                                                                               |
| `ENABLED_APPS`                        | Comma-separated list of apps to activate                                                        |
| `ENABLED_MODULES`                     | Comma-separated module filter for dev-module mode                                               |
| `MFA_MODE`                            | `disabled` or `required`                                                                        |
| `ENABLE_RATE_LIMITING`                | `true` or `false`                                                                               |
| `ENABLE_AUDIT_LOGGING`                | `true` or `false`                                                                               |
| `ENABLE_CONSENT_MANAGEMENT`           | `true` or `false`                                                                               |
| `ENABLE_COOKIE_CONSENT_BANNER`        | `true` or `false`                                                                               |
| `ENABLE_DSR_WORKFLOWS`                | `true` or `false`                                                                               |
| `ENABLE_GDPR_MODE`                    | `true` or `false` — must be `true` in production                                                |
| `ENABLE_DPDP_MODE`                    | `true` or `false` — must be `true` in production                                                |
| `ENABLE_DATA_RETENTION_JOBS`          | `true` or `false`                                                                               |
| `ENABLE_BREACH_NOTIFICATION_WORKFLOW` | `true` or `false`                                                                               |
| `DATA_RESIDENCY_REGION`               | Primary data residency region for cross-border transfer logic                                   |
| `CHILDREN_DATA_PROTECTION_MODE`       | `true` or `false`                                                                               |

All flags are loaded centrally through `packages/config`. No app invents its own config system.

---

## 11. Deployment Architecture

### 11.1 Docker images and registry

Each app produces its own Docker image. Images are built by GitHub Actions and pushed to **GitHub Container Registry (GHCR)**, which is free with any GitHub account. Image names follow the pattern `ghcr.io/<org>/<repo>/<app-name>:<tag>`.

DigitalOcean droplets pull images from GHCR at deploy time. Droplets do not clone the repository; they only pull the pre-built images. This keeps deployment fast, reproducible, and decoupled from source code access on the server.

### 11.2 Droplet topology

**Frontend droplet** runs: `web-marketplace`, `web-seller`, `web-admin`, and `nginx` (reverse proxy routing traffic to the correct app by hostname or path). This droplet serves all public and internal web traffic.

**Backend droplet** runs: `api`, `worker`, and `redis`. The API and worker communicate through Redis via BullMQ. Redis is internal to this droplet and not exposed to the internet.

MongoDB Atlas is a managed cloud service external to both droplets. The selected object storage provider (S3 or R2) is also a managed cloud service external to both droplets.

### 11.3 Container scaling

Docker Compose `deploy.replicas` is used to configure the number of container instances for each service. Each app container can be scaled independently. The default configuration for early launch is one replica per service. Scaling up is a config change in the Compose file with a re-deploy, not an architecture change.

If any individual app grows to require its own droplet, it can be migrated by updating the Compose files and DNS/nginx routing. The architecture is designed to support this migration without application code changes.

---

## 12. Atlas M0 for Development

During development and pre-launch, MongoDB Atlas M0 (free tier) is used for all development, testing, and local-prod rehearsal. Atlas M0 supports Atlas Search with limitations on index count and data volume that are acceptable for development use. The flip to M10 happens at the point of staging or production go-live. This saves approximately USD 60 per month for the entire development period. Verify current Atlas M0 Atlas Search limits before committing to a search index design that exceeds free tier constraints.

---

## 13. Required Local Tools

Install these on the development machine:

- Node.js 24 LTS (managed via nvm)
- nvm
- pnpm
- Docker Desktop
- GitHub CLI
- jq
- mkcert
- mongosh
- MongoDB Compass

Install only when needed:

- AWS CLI (if production storage is AWS S3)
- Cloudflare CLI (if later required for Cloudflare-managed workflows)

---

## 14. Required Accounts

- GitHub (source, CI/CD, GHCR, GitHub Encrypted Secrets)
- Cursor (primary IDE)
- MongoDB Atlas (M0 for development, M10 for staging/production)
- One object storage provider: AWS (for S3) or Cloudflare (for R2) — choose one
- DigitalOcean (two droplets)
- Transactional email provider (for auth flows — configure before staging)

---

## 15. Multi-Language and Multi-Currency Architecture Rule

**Multi-language** must be supported architecturally from day one. All user-facing strings in all three frontend apps must go through an internationalisation layer from the very first component. The initial active language is English. Adding a new language must require translation file additions and configuration only — no component rewrites, no conditional rendering changes, no structural modifications.

**Multi-currency** must be supported architecturally from day one. All price storage, formatting, and display must be currency-aware. The initial active currency is INR. Adding a new supported currency must require configuration and currency definition additions only — no code rewrites anywhere in the pricing or display layer.

---

## 16. Final Decision Summary

This project is a TypeScript monorepo built with:

- Three Next.js 16 / React 19.2 / App Router / Tailwind CSS v4 / shadcn/ui frontend apps, all with mandatory PWA support
- NestJS 11 / Fastify API
- NestJS / Fastify worker
- MongoDB Atlas with Mongoose for standard access and native driver for complex aggregations
- Auth.js v5 with `@auth/mongodb-adapter` storing sessions in MongoDB Atlas
- MongoDB Atlas Search as the only search engine
- Redis + BullMQ for all cache and queue needs
- AWS S3 or Cloudflare R2 for object storage in non-local environments via a shared adapter
- Local filesystem for storage in fast local development only
- pnpm workspaces + Turborepo
- Docker Desktop and Docker Compose for local orchestration and local-prod rehearsal
- GitHub Actions as the only CI/CD system
- GitHub Container Registry for Docker image storage and delivery
- Two DigitalOcean droplets: frontend and backend
- GitHub Encrypted Secrets for all secret management; no paid secret manager
- Atlas M0 for development; Atlas M10 at staging/production
- Multi-language and multi-currency baked in architecturally from day one, with English and INR as initial active settings
