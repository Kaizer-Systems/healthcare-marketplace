# Healthcare Marketplace Platform — Implementation Roadmap

## Purpose

This document is the implementation execution roadmap for the entire platform lifecycle. It defines build order, phase structure, per-slice methodology, testing policy, infra checkpoint policy, and the final completion criteria. It is written to be fed directly to Cursor agent so that development proceeds in a disciplined, slice-complete, context-efficient manner.

This document is intentionally implementation-focused. Business rules live in `PROJECT_OVERVIEW.md`. Stack decisions live in `TECH_STACK.md`. Compliance detail lives in `COMPLIANCE.md`. This document tells you what to build, in what order, and how to know when each piece is done.

---

# 1. Core Implementation Philosophy

## 1.1 Primary rule

Do not build the whole frontend first, then all APIs later, then auth later, then worker later, then tests later. That pattern causes repeated file touches, repeated re-prompting of the same modules, avoidable context waste, drift between UI and backend, and delayed discovery of architectural mistakes.

Instead:

1. Perform one-time project-wide setup where unavoidable.
2. Establish shared reusable foundations.
3. Pick one app zone or module.
4. Finish that slice as far end-to-end as possible.
5. Validate it in the correct runtime mode.
6. Write its tests before moving on.
7. Rehearse in integrated and local-prod modes at the right checkpoints.
8. Then move to the next slice.

## 1.2 Vertical slice rule

For each meaningful module or screen flow, complete in this order:

1. Identify the business and data shape for the slice.
2. Define contracts, DB/index needs, and DTO shapes.
3. Create or verify seed data in `packages/database/seeds/` that mirrors the final collection shape.
4. Build the UI view first using `dev:lite` with seed data — no API, no auth, no dependencies.
5. Build the real API and DB logic.
6. Test the API directly via Postman or API integration tests.
7. Connect the frontend to the real API using the data service resolver pattern.
8. Enforce auth and authorization.
9. Add cache, worker, notification, and storage logic if the slice needs them.
10. Validate the full slice in `dev:integrated` mode.
11. Validate the slice in `dev:local-prod` mode when the module group is complete.
12. Write and pass unit, integration, and E2E tests for that slice.
13. Only then move ahead.

## 1.3 Data service resolver rule

The data service resolver pattern is the mechanism that makes `dev:lite` seed-based development compatible with `dev:integrated` real-API development without any component rewrites.

Every component calls a service function in `lib/services/`. The service function reads `APP_RUNTIME_MODE` from `packages/config` and routes accordingly:

- `dev-lite` → reads from seed file in `packages/database/seeds/`, returns data shaped identically to what the real API returns.
- `dev-module` → reads from seed file or calls real API depending on which flags are active.
- `dev-integrated` and `local-prod` → always calls the real API endpoint.

The component never changes. The DTO shape returned by the seed file and the real API are identical. No conditional imports in components. No mock removal passes. No rewrite when moving between modes.

## 1.4 Seed data rule

Seed data in `packages/database/seeds/` must mirror exactly what the final MongoDB collections will look like at project completion. The same seed files serve two purposes simultaneously:

- They are the data source for `dev:lite` and early `dev:module` work.
- They are the seed data loaded into Atlas M0 for development and integration testing.

This means seed data is designed once, at the beginning of each domain area, before UI work begins on that area. It does not need to be redesigned or reworked when real APIs arrive — the shape is already correct.

## 1.5 Reusable component rule

When building a slice, if a UI element or helper is clearly reusable across screens or apps, move it into the correct shared package first, then consume it from the slice. Do not leave copy-pasted logic inside app-local code if it belongs in `packages/ui`, `packages/contracts`, `packages/auth`, `packages/database`, `packages/search`, `packages/storage`, `packages/cache`, `packages/observability`, `packages/security`, or `packages/test-kit`.

## 1.6 Phase completion rule

A phase is complete only when:

- UI is implemented and stable.
- API is implemented and real.
- DB, index, and search changes are done.
- Auth and authorization are enforced.
- Cache, worker, and notification pieces are wired where applicable.
- Error, empty, and loading states exist.
- Real local integration works.
- Relevant tests exist and pass.

---

# 2. Cursor Agent Prompting Model

## 2.1 Prompting scope per session

Each Cursor session should target one of the following scopes only:

- One-time setup task
- One package foundation task
- One module or screen
- One API domain slice
- One worker job family
- One integration checkpoint
- One local-prod rehearsal adjustment
- One test suite for a completed slice

Do not use vague prompts like "build the whole customer app" or "add security everywhere" or "connect all screens to backend."

## 2.2 Preferred build prompt pattern

When developing a module or screen, the prompting order should be:

1. Define scope — what routes, screens, APIs, collections.
2. Define touched files and folders explicitly.
3. Define expected end state.
4. Build seed data and mock-driven UI in `dev:lite`.
5. Build real contract, API, and DB logic.
6. Wire frontend integration via the data service resolver.
7. Enforce auth and scope.
8. Add background, cache, notification, storage needs.
9. Write tests.
10. Verify in the target runtime mode.

## 2.3 Preferred code touch order inside a slice

1. `packages/contracts` — DTOs and Zod schemas first.
2. `packages/database` — schema, indexes, seeds.
3. `packages/search` — if search behavior is involved.
4. `packages/storage` — if file, document, or media is involved.
5. `packages/cache` — if read caching or rate/state storage is involved.
6. `packages/auth` — if protected behavior is involved.
7. `packages/security` — if compliance data handling is involved.
8. `packages/test-kit` — fixtures and factories.
9. `apps/api` — the real API module.
10. `apps/worker` — if async work exists.
11. `packages/ui` — reusable UI pieces discovered during building.
12. `apps/web/web-marketplace`, `apps/web/web-seller`, or `apps/web/web-admin` — the relevant frontend app.
13. `infra/` — only if the slice introduces or changes infra or runtime needs.

## 2.4 When not to touch infra

Do not rewrite infra for every page. Touch infra only when a new dependency must be containerized, an app needs a new runtime service, environment variables change materially, local-prod orchestration needs updating, CI/CD flow needs a new action, or healthcheck requirements change.

---

# 3. Runtime Mode Usage Policy

## 3.1 `dev:lite` — view-only, seed data, zero dependencies

Use this mode when building the first version of a screen or component. No auth, no API, no DB, no Redis, no queue, no search, no storage provider. Data comes from seed files in `packages/database/seeds/` via the data service resolver. This is the mode for all initial UI work at the very start of any slice.

**Per-app commands:**
```bash
pnpm --filter web-marketplace dev:lite
pnpm --filter web-seller dev:lite
pnpm --filter web-admin dev:lite
```

**Root ecosystem command:**
```bash
pnpm dev:lite
```

## 3.2 `dev:module` — one module, selective real dependencies

Use this mode when developing one specific app or business module with selective real dependencies enabled. Redis, real Atlas, and real Auth.js may be enabled individually based on what the feature under work actually needs. Not all must be active at once.

**Per-app commands:**
```bash
pnpm --filter web-marketplace dev:module
pnpm --filter web-seller dev:module
pnpm --filter web-admin dev:module
pnpm --filter api dev:module
pnpm --filter worker dev:module
```

**Root ecosystem command:**
```bash
pnpm dev:module
# ENABLED_APPS and ENABLED_MODULES in .env.dev-module control which apps and modules activate
```

## 3.3 `dev:integrated` — all services, all real dependencies

Use this mode to validate a completed feature across all services with real DB, real auth, real search, real queues, and real storage where the feature needs it. This is the default mode for declaring a feature ready.

**Per-app commands:**
```bash
pnpm --filter web-marketplace dev:integrated
pnpm --filter web-seller dev:integrated
pnpm --filter web-admin dev:integrated
pnpm --filter api dev:integrated
pnpm --filter worker dev:integrated
```

**Root ecosystem command:**
```bash
pnpm dev:integrated
# Starts all apps + API + worker + Redis together
```

## 3.4 `dev:local-prod` — fully Dockerized, local HTTPS, no mocks

Use this mode at each major zone completion checkpoint, before releases, and before major merges. All apps run as Docker containers with nginx, local HTTPS via mkcert, real Atlas, real search, real selected storage provider config, and real auth. No mocks anywhere.

**Root command:**
```bash
pnpm dev:local-prod
# or equivalently:
pnpm infra:up:local-prod
```

## 3.5 Mandatory mode progression pattern

Default per-slice pattern:

- Build initial UI in `dev:lite` (seed data, zero dependencies).
- Extend to real API and DB in `dev:module` or `dev:integrated` depending on what the slice needs.
- Validate complete feature in `dev:integrated`.
- Rehearse the completed zone in `dev:local-prod`.

---

# 4. One-Time Setup Tasks — Phase A Foundation

These are the only broad setup tasks done up front. Every later slice builds on this foundation.

## A0. Data model finalization (before any other work)

This is Step 0 and must happen before any UI, API, or seed work begins for any domain.

- [ ] Finalize MongoDB collection names and document field conventions (`_id`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `status`, `version`).
- [ ] Finalize standard pagination contract.
- [ ] Finalize standard filter and sort contract.
- [ ] Finalize standard API response envelope pattern.
- [ ] Finalize standard error contract.
- [ ] Define the complete collection list for the platform (users, customers, sellers, products, categories, brands, listings, orders, carts, documents, loyalty accounts, loyalty ledger, referrals, notifications, consent records, DSR requests, breach incidents, sync logs, sponsored placements, audit logs, admin settings).
- [ ] For each collection, define the field list, types, indexes, and Atlas Search index needs.
- [ ] Document all DTO shapes in `packages/contracts`.
- [ ] Create the first seed files in `packages/database/seeds/` matching the final collection shapes.
- [ ] Validate that seed data is realistic, complete, and usable for `dev:lite` before any UI work starts.

**Exit expectation:** Every future slice has realistic seed data available before its UI work begins. No UI slice starts from blank or fake data.

## A1. Repository and workspace bootstrap

- [ ] Initialize the monorepo layout exactly as defined in `TECH_STACK.md` section 3.
- [ ] Create `apps/web/web-marketplace`, `apps/web/web-seller`, `apps/web/web-admin`.
- [ ] Create `apps/api` and `apps/worker`.
- [ ] Create all shared packages: `packages/ui`, `packages/config`, `packages/auth`, `packages/database`, `packages/contracts`, `packages/search`, `packages/storage`, `packages/cache`, `packages/observability`, `packages/security`, `packages/utils`, `packages/test-kit`.
- [ ] Create `infra/` structure for local, CI/CD, and deploy assets.
- [ ] Configure pnpm workspace.
- [ ] Configure Turborepo pipeline with correct task dependencies.
- [ ] Configure root TypeScript strategy with shared `tsconfig.base.json`.
- [ ] Configure ESLint and Prettier with consistent rules across all apps and packages.
- [ ] Configure commit hooks (husky + lint-staged).
- [ ] Create stable root scripts for all official runtime modes.
- [ ] Place `vendor/theme-source/web-marketplace/` and `vendor/theme-source/web-seller-admin/` in `.gitignore`.
- [ ] Ensure a clean bootstrap works from scratch on a new machine.

**Exit expectation:** The monorepo is stable, installable, and runnable. Every future slice has a place to live. No structural rework is needed before real build begins.

## A2. Environment and config foundation

- [ ] Create env file strategy: `env/.env.base`, `env/.env.dev-lite`, `env/.env.dev-module`, `env/.env.dev-integrated`, `env/.env.local-prod`, `env/.env.prod.example`.
- [ ] Create `.env.example` at each app root.
- [ ] Build typed env parsing in `packages/config` with startup validation (startup fails loudly on bad config).
- [ ] Implement all runtime mode flags as defined in `TECH_STACK.md` section 10.5.
- [ ] Implement feature flag and compliance flag loading.
- [ ] Implement service toggle strategy (`AUTH_MODE`, `SEARCH_MODE`, `STORAGE_MODE`, `CACHE_MODE`, `QUEUE_MODE`, `USE_REAL_API`).
- [ ] Document secret naming conventions and GitHub Encrypted Secrets strategy for later deployment.

**Exit expectation:** Runtime mode switching is script and env driven. No one needs to comment or uncomment code to change modes.

## A3. Theme seeding and UI baseline

This step happens before any product UI is built. Both purchased themes are seeded and studied before reconstruction begins.

- [ ] Place `web-marketplace` purchased theme into `vendor/theme-source/web-marketplace/` (gitignored).
- [ ] Place `web-seller-admin` purchased theme into `vendor/theme-source/web-seller-admin/` (gitignored).
- [ ] Audit the marketplace theme: extract color tokens, typography, spacing, component patterns, layout rhythm, and interaction behavior.
- [ ] Audit the seller/admin theme: same audit.
- [ ] Define design tokens in `packages/ui/styles/tokens.css`:
  - [ ] colors (brand, semantic, neutral, state)
  - [ ] typography (font families, sizes, weights, line heights)
  - [ ] spacing scale
  - [ ] border radius
  - [ ] shadows
  - [ ] z-index scale
- [ ] Build first reusable primitives in `packages/ui/src/primitives/`:
  - [ ] Button (variants: primary, secondary, ghost, destructive)
  - [ ] Input, Textarea, Select
  - [ ] Modal, Drawer, Sheet
  - [ ] Table shell with header and row conventions
  - [ ] Pagination
  - [ ] Tabs
  - [ ] Card, ProductCard stub, StatCard stub
  - [ ] Skeleton loader
  - [ ] EmptyState
  - [ ] Badge
  - [ ] Breadcrumb
  - [ ] Toast/Notification bar
  - [ ] FormField wrapper (label, input, error message)
- [ ] Build marketplace-zone layout shells in `apps/web/web-marketplace`:
  - [ ] public layout (header, footer, nav)
  - [ ] authenticated customer layout
- [ ] Build seller-zone layout shell in `apps/web/web-seller`.
- [ ] Build admin-zone layout shell in `apps/web/web-admin`.
- [ ] Define loading, error, and not-found UX conventions for all three apps.
- [ ] Build cookie consent banner and preference center stubs in `packages/ui/src/consent/`.

**Exit expectation:** New screens can be composed quickly from internal UI primitives. No runtime dependency on raw theme code exists.

## A4. Core packages baseline

- [ ] `packages/observability`: logging setup, request/correlation ID strategy, job logging wrapper, audit log helper base, metrics helper base, healthcheck conventions, error serialization rules.
- [ ] `packages/security`: secure headers policy, cookie policy baseline, CSRF hardening helper base, validation hardening helper base, rate-limit helper base, encryption helper placeholder for sensitive fields, sensitive-data logging exclusion rules.
- [ ] Compliance baseline in `packages/security`:
  - [ ] consent capture helper (timestamp, IP, version, scope, lawful basis)
  - [ ] consent withdrawal helper and propagation hook
  - [ ] consent audit trail store
  - [ ] per-purpose consent category definitions (strictly necessary, analytics, marketing, etc.)
  - [ ] consent gate utility blocking non-essential scripts before consent is given
  - [ ] DSR/DPR request tracking model (request ID, type, status, deadline, resolution, affected collections)
  - [ ] right-to-access personal data export helper stub
  - [ ] right-to-erasure anonymization and deletion helper stub
  - [ ] right-to-portability structured JSON/CSV export helper stub
  - [ ] right-to-correction field-level update helper stub
  - [ ] right-to-restriction processing-pause flag helper stub
  - [ ] grievance registration helper (India DPDP Act)
  - [ ] data retention window definitions per data category
  - [ ] purge/anonymization job trigger stub (wired to `apps/worker`)
  - [ ] breach incident record model (severity, data categories, timestamp, affected count)
  - [ ] regulatory notification stubs (GDPR lead DPA, UK GDPR ICO, India DPDP Data Protection Board)
  - [ ] cross-border transfer guard helper with data residency region config binding
  - [ ] privacy notice version management (store current version, link, changelog)
- [ ] `packages/database`: MongoDB client setup (Mongoose + native driver dual setup), schema definition conventions, collection helper patterns, index declaration conventions, Atlas Search index ownership conventions, seed runner structure, standard pagination helpers.
- [ ] `packages/contracts`: DTO and Zod strategy, standard API response envelope, standard error contract, standard pagination contract, standard filter and sort contract.
- [ ] `packages/test-kit`: fixture structure, factory pattern, mock service and adapter stubs, test setup helpers.

**Exit expectation:** Every protected slice has a ready security, compliance, DB, and contract base. No custom improvisation needed for any of these in later slices.

## A5. Auth baseline

- [ ] Configure Auth.js v5 in `packages/auth/src/authjs/` using `@auth/mongodb-adapter` for session storage in MongoDB Atlas.
- [ ] Configure session persistence to MongoDB Atlas.
- [ ] Configure HttpOnly secure cookie settings.
- [ ] Define role model: `public`, `customer`, `doctor`, `seller_staff`, `seller_admin`, `provider_support`, `provider_admin`, `super_admin`.
- [ ] Define membership and seller-scope model.
- [ ] Create route guards for all three frontend apps.
- [ ] Create backend auth guard and role guard base in `apps/api`.
- [ ] Create permission helper mapping in `packages/auth`.
- [ ] Define MFA hook points for `seller_admin` and `provider_admin`.
- [ ] Add unauthorized and forbidden page patterns for all three apps.
- [ ] Add audit hooks for sign-in, sign-out, and failed auth events.

**Exit expectation:** Protected slices can be built immediately after this without redesigning auth later.

## A6. Cache, storage, and queue baseline

- [ ] `packages/cache`: Redis client setup, versioned cache key naming rules, invalidation helper base, rate-limit counter helpers.
- [ ] `packages/storage`: storage adapter interface, local filesystem adapter, S3-ready adapter contract, R2-ready adapter contract, signed URL helper strategy, CDN URL helper strategy.
- [ ] `apps/worker`: BullMQ bootstrap, queue naming rules, retry and backoff conventions, dead-letter or failure-handling pattern, typed job payload contract conventions.

**Exit expectation:** Future modules needing background work, cache, media, or documents can adopt the standard setup immediately without reinventing it.

## A7. Local Docker and app container baseline

- [ ] Create initial Dockerfiles for `web-marketplace`, `web-seller`, `web-admin`, `api`, and `worker`.
- [ ] Create nginx Dockerfile and base config.
- [ ] Create base Docker Compose file for `local-prod` mode.
- [ ] Add Redis service.
- [ ] Add env-driven service wiring for all containers.
- [ ] Add container healthcheck patterns.
- [ ] Add nginx reverse proxy routing (marketplace on one domain/port, seller on another, admin on another).
- [ ] Add mkcert HTTPS setup script.
- [ ] Ensure the baseline empty app stack boots cleanly.

**Exit expectation:** `dev:local-prod` has a usable starting point. Infra does not begin from zero at a later phase.

## A8. Multi-language and multi-currency baseline

- [ ] Set up internationalisation layer in all three frontend apps from day one.
- [ ] All user-facing strings go through the i18n layer even for the initial English-only state.
- [ ] Create initial English translation files.
- [ ] Define the currency configuration layer: all price storage is currency-aware, all price display uses the currency formatter from `packages/utils/src/formatting/`.
- [ ] Initial active currency is INR. Currency config is in `packages/config`.
- [ ] Adding a new language requires only translation files and config — no component changes.
- [ ] Adding a new currency requires only currency definition and config — no code changes.

**Exit expectation:** Multi-language and multi-currency are built-in architectural facts, not future retrofit tasks.

## Phase A exit criteria

- [ ] The repo is structurally final enough for actual product work.
- [ ] All shared packages exist and have stable bootstrap code.
- [ ] Auth, security, compliance infrastructure, config, logs, cache, queue, and storage are no longer "future setup".
- [ ] Seed data shapes for all major collections are defined.
- [ ] Cursor can now work mostly slice-by-slice instead of repo-by-repo.
- [ ] `dev:local-prod` boots cleanly with the empty stack.

---

# 5. Reusable Slice Implementation Template

Use this template repeatedly for every meaningful implementation slice throughout Phases B through G.

## Step 1 — Slice definition

Before asking Cursor to build anything, define:

- [ ] which app this slice belongs to (`web-marketplace`, `web-seller`, `web-admin`, `api`, `worker`)
- [ ] whether it is public or protected
- [ ] which routes and screens are included
- [ ] which APIs are needed
- [ ] which collections and indexes are needed
- [ ] whether Atlas Search is involved
- [ ] whether cache is needed
- [ ] whether a worker job is needed
- [ ] whether notifications are emitted
- [ ] whether files, documents, or media are involved
- [ ] whether consent or personal data is collected or processed
- [ ] which reusable components belong in `packages/ui`

## Step 2 — Contracts and seed data

- [ ] Define or verify DTOs and Zod schemas in `packages/contracts`.
- [ ] Define API request and response contracts.
- [ ] Define or update DB document shape in `packages/database`.
- [ ] Define collection indexes.
- [ ] Define Atlas Search index changes if search is involved.
- [ ] Define event and job payloads if async work is involved.
- [ ] Create or verify seed data in `packages/database/seeds/` for this slice's collections.
- [ ] Define authorization requirements.

## Step 3 — Mock-first UI in `dev:lite`

- [ ] Point the data service resolver for this slice to seed files (`USE_REAL_API=false`).
- [ ] Build the route and screen shell in the relevant frontend app.
- [ ] Build the initial view with seed data flowing through.
- [ ] Finalize layout, hierarchy, responsive behavior, empty states, loading states, and error states.
- [ ] Extract clearly reusable parts into `packages/ui`.
- [ ] Verify the UI is visually correct and seed data flows correctly before touching real API.

## Step 4 — Real API and DB

- [ ] Create the NestJS API module, controller, service, and DTOs for the slice.
- [ ] Add DTO validation and error handling.
- [ ] Add DB repository helpers in `packages/database`.
- [ ] Add collection indexes and Atlas Search index hooks if needed.
- [ ] Add audit hooks for mutations.
- [ ] Test the API directly via Postman or API integration test.

## Step 5 — Frontend integration

- [ ] Update the data service resolver to call the real API (`USE_REAL_API=true` in `dev:module` or `dev:integrated`).
- [ ] No component changes needed — only the service resolver routes differently.
- [ ] Add TanStack Query hooks for server-state fetching and mutation.
- [ ] Add form handling where mutation flows exist.
- [ ] Add retry or refresh behavior.
- [ ] Add proper error surfaces.
- [ ] Add route transitions and state persistence where needed.

## Step 6 — Auth and authorization

- [ ] Apply route-level protection if required.
- [ ] Apply backend auth guard and role guard.
- [ ] Apply scope-level authorization (customer owns their data, seller sees only their scope).
- [ ] Hide or disable UI actions not allowed for the current role.
- [ ] Enforce backend scoping regardless of frontend behavior.
- [ ] Verify unauthorized and forbidden states render correctly.

## Step 7 — Async, cache, storage, notifications, and compliance

Only if relevant for the slice:

- [ ] Add Redis cache read path.
- [ ] Add cache invalidation path.
- [ ] Add BullMQ job emission.
- [ ] Add worker processor for the job.
- [ ] Add notification event emission.
- [ ] Add email, SMS, or in-app notification routing.
- [ ] Add document or media upload or retrieval.
- [ ] Add signed URL or protected file access.
- [ ] Add active sync push hooks if this slice produces data that must reach seller ERPs.
- [ ] If this slice collects or processes personal data — add consent capture and link to `packages/security` consent helper.
- [ ] If this slice mutates personal data fields — confirm retention window tagging is applied to the relevant data model.
- [ ] If this is a customer-facing data collection point — verify cookie consent gate is active before non-essential processing fires.

## Step 8 — Integrated validation

- [ ] Run the slice in `dev:integrated` mode.
- [ ] Verify real API calls succeed.
- [ ] Verify DB writes and reads are correct.
- [ ] Verify role and scope behavior.
- [ ] Verify cache and worker behavior if present.
- [ ] Verify notifications if present.
- [ ] Verify logs and audit entries are emitted.

## Step 9 — Tests

- [ ] Write unit tests for pure logic in packages and services.
- [ ] Write API integration tests for the slice's endpoints.
- [ ] Write route and screen tests where critical.
- [ ] Add E2E coverage if it is a critical user flow.
- [ ] Ensure fixtures are reusable for future tests.

## Step 10 — Slice exit criteria

Do not move on until:

- [ ] The slice is visually stable and data-backed.
- [ ] The slice uses real data in integrated mode.
- [ ] Auth and scope are correct.
- [ ] Worker, cache, and notification behavior are complete where applicable.
- [ ] Compliance hooks are in place where personal data is collected or processed.
- [ ] Tests pass.
- [ ] No obvious TODO is being deferred into later unrelated phases.

---

# 6. Phase B — Public Zone: `web-marketplace`, Public Catalog, Public API

Build the public marketplace first. It establishes route structure, shared app shell, catalog presentation rules, SEO conventions, search and discovery direction, seller public visibility patterns, and early DB and search index structures.

## B0. Catalog data foundation

Define the data foundation before building any public screens. All later public screens depend on this.

- [ ] Define and create collections in `packages/database/schemas/`: categories, brands, canonical products, seller listings, media metadata, seller trust summary projection.
- [ ] Define Atlas Search indexes for products, categories, and sellers.
- [ ] Create realistic seed data for all above collections.
- [ ] Create public-safe projection helpers (fields visible publicly vs fields that are internal-only).
- [ ] Create API domain modules in `apps/api` for public catalog reads.
- [ ] Define worker hooks for projection rebuild and search index refresh.

**Exit expectation:** Public pages have a real catalog data model before any screen is built.

## B1. `web-marketplace` app shell and route-group foundation

- [ ] Build public shell in `dev:lite` with seed data: header, footer, navigation, breadcrumb conventions, responsive layout containers.
- [ ] Extract reusable header, footer, and nav pieces into `packages/ui`.
- [ ] Define route groups for `(public)` and `(customer)` zones with appropriate layout boundaries.
- [ ] Define metadata generation base for SSR pages.
- [ ] Define sitemap and robots.txt placeholders.
- [ ] Add healthcheck hooks for page render failures.
- [ ] Implement cookie consent banner and preference center from `packages/ui/src/consent/` — this must be present from the first public page, not added later.

**Exit expectation:** Public routes have a stable shell. Cookie consent gate is active from day one.

## B2. Homepage module

- [ ] Build homepage in `dev:lite` first: hero, category highlights, featured products, seller highlights, trust blocks, CTA blocks.
- [ ] Rebuild reusable theme-inspired homepage blocks into `packages/ui`.
- [ ] Create public homepage API in `apps/api` for dynamic sections.
- [ ] Add caching for homepage content if query-heavy.
- [ ] Add sponsored placement hooks for operator-controlled cards.
- [ ] Add SSR metadata and Open Graph tags.

**Exit expectation:** Homepage is visually stable, data-backed, and ready for real users.

## B3. Category pages and search results listing module

- [ ] Build category and search listing UI in `dev:lite` with realistic fixtures.
- [ ] Create reusable filter panel, sort controls, result card, and facet count components in `packages/ui`.
- [ ] Define search and listing contracts in `packages/contracts`.
- [ ] Build Atlas Search query builders in `packages/search` for: typo tolerance, category facets, brand facets, attribute filters, seller-aware shaping.
- [ ] Build API search endpoints in `apps/api`.
- [ ] Add caching if result responses justify it.
- [ ] Add analytics hooks for query terms and filter usage.
- [ ] Add search-as-you-type autocomplete endpoint.
- [ ] Validate performance and empty/no-results states.

**Exit expectation:** Search and listing is real Atlas Search, not a fake frontend filter.

## B4. Product detail page module

- [ ] Build PDP in `dev:lite` first: product overview, image gallery, seller offers and comparison, price blocks, stock/availability signals, trust summary, related products, specs/attributes, CTA entry points.
- [ ] Extract gallery, comparison, attribute, and seller summary components into `packages/ui`.
- [ ] Define PDP contract and SEO projection model.
- [ ] Build real API for PDP retrieval.
- [ ] Add Redis cache if the product read path is heavy.
- [ ] Add SEO metadata, structured data JSON-LD (`Product` + `AggregateOffer`), and breadcrumb markup.
- [ ] Enforce public-safe field filtering strictly — no internal seller pricing logic or sensitive data in public response.

**Exit expectation:** PDP is the real entry point into cart and wishlist flows later.

## B5. Seller public profile page module

- [ ] Build seller public page in `dev:lite`: seller overview, trust summary, business capabilities, seller product assortment preview, seller policies.
- [ ] Define seller public projection in DB and API.
- [ ] Add seller trust summary retrieval.
- [ ] Enforce public-safe fields only.
- [ ] Add SEO metadata and `Organization` or `LocalBusiness` structured data markup.

**Exit expectation:** Seller public identity exists independently of product pages.

## B6. Public informational and support pages module

- [ ] Build page templates for help, policy, trust, contact, and generic static content.
- [ ] Add metadata and indexability rules.
- [ ] Add layout consistency and breadcrumb behavior.
- [ ] Include Privacy Policy and Cookie Policy pages accessible from every public page footer.

**Exit expectation:** Public site feels complete and operationally credible.

## Phase B completion checkpoint

- [ ] Run integrated mode for all public flows.
- [ ] Verify public API reads end-to-end.
- [ ] Verify Atlas Search behavior for listing and discovery.
- [ ] Verify seed data quality.
- [ ] Verify logs and metrics are emitted.
- [ ] Verify public page metadata, structured data, and indexability.
- [ ] Verify cookie consent banner blocks non-essential scripts before consent.
- [ ] Write tests: search query builders, public API retrieval logic, listing filter logic, critical public route rendering.
- [ ] Rehearse this zone in `dev:local-prod` Docker mode.
- [ ] Fix all blocking issues before moving on.

---

# 7. Phase C — Customer Zone: Auth, Account, Wishlist, Notifications

## C1. Auth entry and session-aware app shell

- [ ] Build auth entry UI in `web-marketplace`: sign-in, sign-out, redirect behavior, forbidden/unauthorized states.
- [ ] Finalize session-aware header behavior.
- [ ] Verify Auth.js integration in web and API.
- [ ] Verify secure cookie and session behavior.
- [ ] Verify route guarding and backend auth enforcement.
- [ ] Add audit events for sign-in, sign-out.

## C2. Customer account shell and overview

- [ ] Build account shell in `dev:lite`: dashboard landing, account navigation, overview widgets.
- [ ] Create reusable account layout pieces in `packages/ui`.
- [ ] Create account summary API.
- [ ] Enforce customer-only scope.
- [ ] Add skeleton and empty states.

## C3. Profile and address management module

- [ ] Define profile and address contracts and collections.
- [ ] Build UI in `dev:lite` first.
- [ ] Build real API with validation.
- [ ] Enforce account ownership and audit logging.
- [ ] Tag personal data fields with retention window metadata.
- [ ] Add consent capture for marketing preferences if collected here.
- [ ] Write tests including ownership enforcement.

## C4. Wishlist module

- [ ] Define wishlist data model and contracts.
- [ ] Build mock-first wishlist screens and button states.
- [ ] Build API for wishlist mutations and reads.
- [ ] Add optimistic UI behavior where safe.
- [ ] Enforce customer ownership.
- [ ] Write tests including unauthorized attempts.

## C5. Notification center and preferences module

- [ ] Define notification record model.
- [ ] Build notification center UI.
- [ ] Build API for reads and read-state updates.
- [ ] Add worker job paths for in-app event materialization.
- [ ] Add notification preference model and API.
- [ ] Ensure notification items are role-scoped and secure.
- [ ] Write tests.

## C6. Doctor classification and special-account hooks module

- [ ] Define doctor classification model and verified-doctor state field.
- [ ] Build minimal doctor-aware account surfaces.
- [ ] Add auth and permission hooks for doctor role.
- [ ] Ensure doctor state is configurable and not hardcoded into scattered UI.
- [ ] Do not activate doctor-specific reward logic — that requires compliance approval. Build the plumbing only.
- [ ] Write tests for role-sensitive behavior.

## Phase C completion checkpoint

- [ ] Run all customer foundation modules in `dev:integrated` mode.
- [ ] Verify protected routing and session handling.
- [ ] Verify ownership enforcement on all customer APIs.
- [ ] Verify audit logs on account mutations.
- [ ] Verify consent capture is in place for personal data collection points.
- [ ] Write and pass tests.
- [ ] Rehearse in `dev:local-prod` mode.

---

# 8. Phase D — Customer Transaction Flow: Cart, Checkout, Orders, Documents, Loyalty, Referrals

## D1. Cart module

- [ ] Define cart model and contracts.
- [ ] Build cart UI in `dev:lite` first: add to cart, update quantity, remove item, seller-aware grouping, cart summary widget, cart page.
- [ ] Add public-to-authenticated transition handling for cart persistence across sessions.
- [ ] Build real cart APIs.
- [ ] Add real stock and availability validation hooks.
- [ ] Integrate PDP and listing actions with cart.
- [ ] Write tests.

## D2. Checkout orchestration module

- [ ] Define checkout contracts and state machine.
- [ ] Build checkout screens in `dev:lite` first.
- [ ] Build real API orchestration: address selection, cart validation, seller grouping validation, price snapshot, availability recheck, checkout initiation, seller-of-record orchestration boundary, order creation idempotency via Redis.
- [ ] Add active sync job hooks for notifying seller ERP of new order immediately.
- [ ] Add auth and ownership enforcement.
- [ ] Add audit logging for checkout events.
- [ ] Test directly at API level before frontend integration.
- [ ] Write tests.

## D3. Orders list and order detail module

- [ ] Define order projection contracts.
- [ ] Build mock-first order list and detail screens.
- [ ] Build real order retrieval APIs.
- [ ] Enforce strict customer ownership.
- [ ] Add notification hooks for order state changes.
- [ ] Add worker job for pushing order status updates back to seller ERP.
- [ ] Write tests for visibility, state rendering, and ownership.

## D4. Order documents module

- [ ] Define document metadata model and contracts.
- [ ] Build document center UI inside order detail.
- [ ] Build secure document API using storage adapter for protected file access.
- [ ] Implement signed URL or gated download strategy.
- [ ] Enforce customer ownership and role access strictly.
- [ ] Add audit logging for document access.
- [ ] Write tests for access control and download flow.

## D5. Loyalty module

- [ ] Define loyalty account and ledger models.
- [ ] Build mock-first loyalty screens: points balance, ledger history, earn/redeem event visibility.
- [ ] Build real read APIs.
- [ ] Add worker job logic for point accrual and redeem events.
- [ ] Add notification hooks for point events.
- [ ] Enforce customer ownership.
- [ ] Write tests for ledger logic and visibility.

## D6. Referral module

- [ ] Define referral model and contracts.
- [ ] Build mock-first referral UI: link generation, dashboard, event visibility, reward status.
- [ ] Build real APIs.
- [ ] Add worker processing for referral attribution.
- [ ] Add notification hooks.
- [ ] Add abuse-prevention basics.
- [ ] Keep doctor-specific referral logic configurable and inactive until compliance approval.
- [ ] Write tests.

## Phase D completion checkpoint

- [ ] Run cart, checkout, orders, documents, loyalty, referrals in `dev:integrated` mode.
- [ ] Verify real DB writes and reads.
- [ ] Verify order ownership and document access control.
- [ ] Verify worker jobs: order sync push to seller ERP, loyalty accrual, notification dispatch.
- [ ] Verify logs and audit trails.
- [ ] Write and pass tests for all D slices.
- [ ] Rehearse the full customer transaction journey in `dev:local-prod` mode.

---

# 9. Phase E — Seller Zone: `web-seller`

## E1. `web-seller` app shell and scoped access foundation

- [ ] Build seller shell in `dev:lite` first: seller nav, seller-specific layout, seller unauthorized handling.
- [ ] Build seller-scope route guards.
- [ ] Build seller-scope backend authorization helpers.
- [ ] Ensure seller users only see their own seller scope.
- [ ] Add MFA hook paths for `seller_admin`.
- [ ] Add audit visibility for seller admin actions.

## E2. Seller dashboard module

- [ ] Build dashboard with mock seed data first: summary widgets, operational alerts, order/inventory/listing summaries, account trust summary, quick links.
- [ ] Define seller dashboard projection API.
- [ ] Add cache if metrics are aggregation-heavy.
- [ ] Add alert widgets fed by worker/sync states.
- [ ] Write tests for scoping and projection correctness.

## E3. Seller catalog and listing management module

- [ ] Define seller listing contracts and DB shape.
- [ ] Build mock-first list and edit screens.
- [ ] Build real seller listing APIs.
- [ ] Enforce seller ownership and capability restrictions.
- [ ] Add audit logs for listing changes.
- [ ] Add worker hooks for search index refresh after listing changes.
- [ ] Add admin-visible escalation hooks for unmapped products.
- [ ] Write tests.

## E4. Inventory and pricing visibility module

- [ ] Define snapshot and sync-status contracts.
- [ ] Build mock-first operational tables: inventory snapshots, pricing snapshots, sync timestamps, sync error visibility.
- [ ] Build real APIs for seller-side operational reads.
- [ ] Add worker and reconciliation integration.
- [ ] Add pathways for seller to trigger a resync request.
- [ ] Write tests.

## E5. Seller order visibility and action module

- [ ] Define seller order projection contracts (seller sees only their line items and orders).
- [ ] Build mock-first screens.
- [ ] Build real seller order APIs.
- [ ] Enforce seller scope strictly.
- [ ] Add fulfillment status update flows where in scope.
- [ ] Add audit logging for seller actions.
- [ ] Add notification hooks for seller-visible events (new order received, status change).
- [ ] Write tests.

## E6. Seller profile, settings, and documents module

- [ ] Define seller profile contracts.
- [ ] Build mock-first settings screens: public profile inputs, business details, marketplace-facing metadata, document visibility, account settings.
- [ ] Build real profile and settings APIs.
- [ ] Add document access via storage adapter.
- [ ] Enforce seller scope and audit mutations.
- [ ] Write tests.

## E7. Seller member and permission management module

- [ ] Define seller membership and role model details.
- [ ] Build mock-first membership UI.
- [ ] Build real APIs for team member management.
- [ ] Enforce seller-admin-only access where required.
- [ ] Add audit logging.
- [ ] Write tests.

## Phase E completion checkpoint

- [ ] Run seller flows in `dev:integrated` mode.
- [ ] Verify seller scoping across every API.
- [ ] Verify seller admin vs seller user permission boundaries.
- [ ] Verify worker and sync visibility where used.
- [ ] Verify notifications and documents behavior.
- [ ] Write and pass tests for seller critical flows.
- [ ] Rehearse the seller zone in `dev:local-prod` mode.

---

# 10. Phase F — Provider Admin Zone: `web-admin`

## F1. `web-admin` app shell and hard access controls

- [ ] Build admin shell in `dev:lite` first: elevated nav, admin shell layout, MFA-required path indicator.
- [ ] Enforce provider admin route guards — the strongest in the system.
- [ ] Enforce backend admin scope with no overlap with seller or customer APIs.
- [ ] Add MFA flow integration.
- [ ] Add audit wrappers for all elevated actions.

## F2. Provider dashboard module

- [ ] Build dashboard mock-first: seller onboarding summary, sync health, order and system alerts, catalog moderation counts, dispute and risk widgets, quick actions.
- [ ] Build real admin dashboard APIs with aggregations.
- [ ] Add cache where justified.
- [ ] Write tests.

## F3. Seller onboarding and approval module

- [ ] Define seller onboarding state model: invite, creation, capability checks, provisioning steps, membership provisioning, compliance acceptance, activation, suspension.
- [ ] Build mock-first onboarding screens.
- [ ] Build real APIs and state-machine workflows.
- [ ] Include DPDP data fiduciary obligation acceptance in seller onboarding flow.
- [ ] Add audit logs for every approval, rejection, and state change.
- [ ] Add notification hooks for internal and seller-facing events.
- [ ] Add worker jobs for async provisioning steps.
- [ ] Write tests.

## F4. Catalog moderation and product-mapping module

- [ ] Define canonical product control workflows: unresolved mapping queue, seller SKU to canonical mapping actions, listing moderation, public visibility control, catalog correction.
- [ ] Build mock-first moderation screens.
- [ ] Build real APIs.
- [ ] Add worker hooks to refresh search index and public projections after moderation changes.
- [ ] Add audit logs for all catalog interventions.
- [ ] Write tests.

## F5. Sync monitoring and reconciliation module

- [ ] Build sync health dashboard: per-seller sync status, job failure visibility, retry controls, stale-sync detection.
- [ ] Build real admin APIs for sync state reads.
- [ ] Connect to worker reconciliation job visibility.
- [ ] Add audit logs for manual retries and interventions.
- [ ] Write tests.

## F6. User, role, and access oversight module

- [ ] Build customer, seller, and admin account search and role visibility.
- [ ] Add account state controls (suspension, reactivation).
- [ ] Enforce super-admin and provider-admin distinction.
- [ ] Add audit logs.
- [ ] Write tests.

## F7. Trust, reputation, disputes, and risk control module

- [ ] Build seller trust visibility, reputation signal display, risk and fraud flag management, dispute case visibility, manual intervention controls, trust overrides.
- [ ] Connect to worker projections for trust metrics.
- [ ] Add audit logs for overrides and interventions.
- [ ] Write tests.

## F8. Compliance operations module

- [ ] Build consent audit panel: view consent records per user, consent version history, withdrawal events.
- [ ] Build DSR and DPR queue panel: view incoming rights requests, update status, trigger fulfilment jobs, track deadlines.
- [ ] Build RoPA management panel: categories, purposes, retention periods, transfer destinations.
- [ ] Build breach incident management panel: log incidents, classify severity, track notification status to supervisory authorities.
- [ ] Write tests.

## F9. Sponsored placement and marketplace operational controls module

- [ ] Build sponsored listing and promoted placement controls.
- [ ] Build operator ranking influence controls.
- [ ] Add worker and search projection hooks to materialize ranking effects.
- [ ] Add audit logs for all placement changes.
- [ ] Write tests.

## Phase F completion checkpoint

- [ ] Run all provider flows in `dev:integrated` mode.
- [ ] Verify elevated auth and MFA paths.
- [ ] Verify every admin mutation is audited.
- [ ] Verify job, sync, and admin screens reflect real data.
- [ ] Verify search and indexing respond to moderation actions.
- [ ] Verify compliance operations (consent audit, DSR queue, breach incident) function end to end.
- [ ] Write and pass tests for admin critical flows.
- [ ] Rehearse provider admin zone in `dev:local-prod` mode.

---

# 11. Phase G — Worker Deep Completion

Many worker pieces will already have been built inside earlier slices. This phase ensures the worker is finished as a complete, explicit subsystem with no partial jobs.

## G1. Order sync jobs (active push/pull)

- [ ] Active push job: when a marketplace order event occurs (new order, status change, cancellation), immediately push to seller ERP via integration adapter.
- [ ] Active pull job: receive push events from seller ERP (invoice generated, fulfillment status update) and apply to marketplace records.
- [ ] Retry and reconciliation for failed pushes.
- [ ] Stale-sync detection and escalation.

## G2. Inventory and pricing sync jobs

- [ ] Inventory snapshot update jobs triggered by seller ERP push events.
- [ ] Pricing snapshot update jobs.
- [ ] Reconciliation jobs for mismatched states.
- [ ] Stale-data detection.

## G3. Search and projection jobs

- [ ] Product and search document indexing and reindexing.
- [ ] Seller trust projection refresh.
- [ ] Sponsored ranking materialization.
- [ ] Public projection refreshes after moderation changes.

## G4. Notification jobs

- [ ] In-app notification materialization.
- [ ] Email dispatch jobs.
- [ ] SMS dispatch jobs.
- [ ] Preference-aware channel routing.
- [ ] Retry and failure handling for all notification channels.

## G5. Loyalty and referral jobs

- [ ] Point accrual jobs.
- [ ] Reward posting jobs.
- [ ] Referral attribution jobs.
- [ ] Delayed qualification jobs.
- [ ] Ledger consistency checks.

## G6. Compliance jobs

- [ ] Data retention enforcement jobs: scan personal data collections and anonymize or delete records exceeding configured retention windows (GDPR, UK GDPR, India DPDP Act requirement).
- [ ] DSR and DPR fulfilment jobs: process queued rights requests (erasure, portability export generation, restriction flag propagation, correction application).
- [ ] Consent expiry and re-consent reminder jobs: flag or re-prompt where consent has expired or privacy notice version changed materially.
- [ ] Breach incident escalation jobs: escalate unacknowledged or unresolved incidents after defined thresholds.

## G7. Cleanup and analytics jobs

- [ ] Stale cart cleanup.
- [ ] Projection cleanup.
- [ ] Failed upload retry cleanup.
- [ ] Dashboard summary materialization.
- [ ] Seller performance aggregates.
- [ ] Admin operational summaries.
- [ ] Search analytics rollups.

## Phase G exit criteria

- [ ] All job payloads use shared contracts.
- [ ] All jobs are observable and have metrics.
- [ ] Retry and backoff are explicit.
- [ ] Poison and failure handling is explicit.
- [ ] Dead-letter or manual repair path exists.
- [ ] Worker jobs never depend on implicit frontend state.
- [ ] Every job family has tests.

---

# 12. Phase H — Final Integrated System Hardening

This phase is not where security, auth, testing, or observability are first introduced. Those must already exist inside slices. This phase closes gaps only.

## H1. End-to-end authorization review

- [ ] Verify public vs protected routes across all three apps.
- [ ] Verify customer ownership checks on all customer APIs.
- [ ] Verify seller scope checks — no seller can access another seller's data.
- [ ] Verify provider admin elevation checks.
- [ ] Verify document access gates.
- [ ] Verify admin-only actions cannot be triggered by lower roles.

## H2. Sensitive-data and compliance boundary review

- [ ] Verify no sensitive fields leak into public APIs.
- [ ] Verify no sensitive fields leak into Atlas Search indexes.
- [ ] Verify no sensitive fields leak into logs.
- [ ] Verify browser storage holds no forbidden data.
- [ ] GDPR/UK GDPR review: consent records, withdrawal propagation, DSR workflows, cookie consent gates, portability exports, retention jobs, cross-border transfer guard, breach logging, RoPA.
- [ ] India DPDP Act 2023 review: consent notices at all collection points, data principal rights workflows, grievance mechanism visibility, children's data protections, seller onboarding DPDP acceptance, breach notification to Data Protection Board.
- [ ] HIPAA-aligned review: access control, minimum-necessary data exposure, audit completeness, sensitive healthcare data segregation.

## H3. Performance and caching review

- [ ] Verify cache use is deliberate and correct.
- [ ] Verify invalidation paths are explicit.
- [ ] Verify expensive reads are optimized.
- [ ] Verify image and media delivery is edge-cached.
- [ ] Verify no worker-worthy operation remains in the request path.

## H4. Notification and external channel review

- [ ] Verify notification events are complete.
- [ ] Verify channel preferences are respected.
- [ ] Verify failures and retries are logged.

## H5. Local-prod full system rehearsal

- [ ] Boot all three web apps, API, worker, Redis, nginx, and Atlas in `dev:local-prod`.
- [ ] Validate healthchecks for all containers.
- [ ] Validate env-driven startup.
- [ ] Validate session behavior under real HTTPS.
- [ ] Validate queue behavior.
- [ ] Validate storage adapter behavior.
- [ ] Validate log and audit trail visibility.
- [ ] Fix all infra gaps immediately.

---

# 13. Phase I — Test Completion

Testing must already exist per slice. This phase ensures every app zone has complete confidence coverage.

## I1. Shared package tests

- [ ] `packages/contracts`, `packages/database`, `packages/search`, `packages/auth`, `packages/cache`, `packages/storage`, `packages/security`, `packages/observability`, `packages/test-kit`

## I2. `apps/api` integration test coverage

- [ ] Public catalog APIs, search APIs, profile and address APIs, wishlist APIs, cart APIs, checkout and order APIs, document APIs, loyalty and referral APIs, seller APIs, admin APIs, compliance APIs, auth and authorization guards, audit-producing mutations.

## I3. `apps/web` E2E coverage (Playwright)

- [ ] Public browse journey, search journey, PDP journey, login journey, profile and address journey, wishlist journey, cart journey, checkout journey, order history and document journey, loyalty and referral journey, seller listing and order journey, provider admin moderation and sync-monitor journey.

## I4. `apps/worker` tests

- [ ] Search reindex jobs, sync jobs, notification jobs, loyalty and referral jobs, compliance retention and DSR jobs, retry and failure handling, queue payload validation.

## I5. Specialized checks

- [ ] Accessibility checks, responsive checks, search relevance checks, document permission checks, role regression checks, cache invalidation checks, performance smoke checks, healthcheck tests, SEO validation for public pages.

---

# 14. Phase J — CI/CD, Deployment Flow, and Environment Promotion

## J1. CI workflow files (10 total)

1. `ci-pr.yml` — PR validation: lint, typecheck, unit tests, build check.
2. `ci-main.yml` — Main branch validation: all tests, integration checks, build.
3. `build-images.yml` — Reusable: build and push Docker images to GHCR for all apps.
4. `deploy-staging.yml` — Deploy to staging droplets by pulling images from GHCR.
5. `deploy-production.yml` — Deploy to production droplets with approval gate.
6. `smoke-check.yml` — Reusable: post-deploy healthcheck and smoke verification.
7. `rollback.yml` — Pull and redeploy previous image tag.
8. `e2e.yml` — Playwright E2E run against staging.
9. `worker-tests.yml` — Reusable: isolated worker job test suite.
10. `dependency-audit.yml` — Periodic security audit of dependencies.

## J2. Image and artifact strategy

- [ ] Build one Docker image per app per commit to main.
- [ ] Tag images with commit SHA and `latest`.
- [ ] Push all images to GHCR.
- [ ] Retain previous image tags for rollback reference.
- [ ] Droplets pull images from GHCR — no repo clone on server.

## J3. Deployment flow

- [ ] Staging deploys automatically on merge to main.
- [ ] Production deploys require a manual approval gate via GitHub Environments.
- [ ] Concurrency controls prevent overlapping deploys.
- [ ] OIDC authentication between GitHub Actions and DigitalOcean where applicable.
- [ ] GitHub Encrypted Secrets scoped to staging and production GitHub Environments.

## J4. Environment finalization

- [ ] Finalize all production env variables and confirm none are hardcoded.
- [ ] Finalize storage bucket and container config for the chosen provider.
- [ ] Finalize Redis config for production droplet.
- [ ] Flip MongoDB Atlas from M0 to M10 for staging and production.
- [ ] Finalize Auth.js callback URLs and session config for production domains.
- [ ] Finalize CDN and public media path config.
- [ ] Finalize domain registration, DNS, and TLS certificate setup.
- [ ] Confirm GitHub Encrypted Secrets are set for all required variables.

---

# 15. Phase K — Pre-Release Checklist

Before calling the implementation complete, all of the following must be true.

## Feature completeness

- [ ] Public zone complete: homepage, category/search listing, PDP, seller public page, support pages, SEO and metadata.
- [ ] Customer zone complete: auth, account overview, profile/address, wishlist, notification center, doctor hooks, cart, checkout, orders, order documents, loyalty, referrals.
- [ ] Seller zone complete: seller shell, dashboard, listing management, inventory/sync visibility, order visibility, profile/settings, member management.
- [ ] Provider admin zone complete: admin shell, dashboard, seller onboarding, catalog moderation, sync monitoring, user/role oversight, trust/disputes/risk, compliance operations, sponsored placement controls.

## System subsystems

- [ ] Auth.js v5 with `@auth/mongodb-adapter` complete.
- [ ] MongoDB Atlas models and indexes complete.
- [ ] Atlas Search implementation complete.
- [ ] Redis usage complete.
- [ ] BullMQ jobs complete — including all active push/pull sync jobs.
- [ ] Storage adapter complete.
- [ ] Notifications complete.
- [ ] Audit logs complete.
- [ ] Observability complete.
- [ ] Multi-language layer complete (English active, all strings through i18n).
- [ ] Multi-currency layer complete (INR active, currency-aware throughout).
- [ ] Local-prod orchestration complete.
- [ ] CI/CD complete.

## Quality

- [ ] Slice tests complete.
- [ ] Integrated tests complete.
- [ ] E2E tests complete.
- [ ] Security review complete.
- [ ] Sensitive-data review complete.
- [ ] Performance review complete.
- [ ] Accessibility review complete.

## Compliance

- [ ] GDPR/UK GDPR: consent management functional, cookie consent banner and preference center deployed, DSR workflows tested, data retention and purge jobs tested, breach incident logging and notification workflow tested, cross-border transfer guard tested, Privacy Notice and Cookie Policy linked, RoPA maintained.
- [ ] India DPDP Act 2023: consent notices at all collection points, data principal rights workflows tested, grievance mechanism accessible, children's data protection controls tested, seller DPDP obligation acceptance in onboarding, breach notification workflow to Data Protection Board tested.
- [ ] HIPAA-aligned: access controls, minimum-necessary data exposure, audit completeness, sensitive healthcare data segregation all verified.
- [ ] GST compliance: tax invoice requirements, HSN/SAC codes in catalog, GST configuration in seller onboarding verified.

---

# 16. Exact Build Order for Practical Execution

This is the step-by-step sequence for a solo developer using Cursor agent:

1. Data model finalization — all collections, fields, indexes, Atlas Search needs, DTOs (A0)
2. Repo and workspace bootstrap (A1)
3. Environment and config foundation (A2)
4. Theme seeding and UI baseline — both themes audited and reconstructed into `packages/ui` (A3)
5. Core packages baseline — observability, security, compliance stubs, database, contracts, test-kit (A4)
6. Auth baseline (A5)
7. Cache, storage, and queue baseline (A6)
8. Docker and local-prod container baseline (A7)
9. Multi-language and multi-currency baseline (A8)
10. Validate Phase A: `dev:local-prod` boots cleanly
11. Catalog data foundation — collections, indexes, seeds, public projection API (B0)
12. `web-marketplace` app shell with cookie consent banner active (B1)
13. Homepage (B2)
14. Category pages and search listing with real Atlas Search (B3)
15. Product detail page with SEO structured data (B4)
16. Seller public profile page (B5)
17. Public informational and support pages, Privacy Policy, Cookie Policy (B6)
18. Phase B integrated tests
19. Phase B `dev:local-prod` rehearsal
20. Customer auth entry and session-aware shell (C1)
21. Customer account shell and overview (C2)
22. Profile and address management (C3)
23. Wishlist (C4)
24. Notification center (C5)
25. Doctor classification hooks (C6)
26. Phase C integrated tests
27. Phase C `dev:local-prod` rehearsal
28. Cart (D1)
29. Checkout orchestration with active seller ERP push (D2)
30. Orders list and order detail (D3)
31. Order documents (D4)
32. Loyalty (D5)
33. Referrals (D6)
34. Phase D integrated tests
35. Phase D `dev:local-prod` rehearsal
36. `web-seller` app shell and scoped access foundation (E1)
37. Seller dashboard (E2)
38. Seller catalog and listing management (E3)
39. Seller inventory and pricing visibility (E4)
40. Seller order visibility and actions (E5)
41. Seller profile, settings, and documents (E6)
42. Seller member and permission management (E7)
43. Phase E integrated tests
44. Phase E `dev:local-prod` rehearsal
45. `web-admin` app shell and hard access controls (F1)
46. Provider dashboard (F2)
47. Seller onboarding and approval (F3)
48. Catalog moderation and product mapping (F4)
49. Sync monitoring and reconciliation (F5)
50. User, role, and access oversight (F6)
51. Trust, reputation, disputes, and risk (F7)
52. Compliance operations panel — consent audit, DSR queue, RoPA, breach incidents (F8)
53. Sponsored placement controls (F9)
54. Phase F integrated tests
55. Phase F `dev:local-prod` rehearsal
56. Worker deep completion — all G job families finished (G1–G7)
57. Full integrated system hardening review (Phase H)
58. Full test completion (Phase I)
59. CI/CD finalization — all 10 workflow files (Phase J)
60. Atlas M0 → M10 flip for staging
61. Staging deploy and smoke validation
62. Production environment finalization
63. Production deploy
64. Release-candidate checklist validation (Phase K)

---

# 17. When to Write Tests

Write tests at these specific points — not at the very end:

- After each shared package helper set stabilizes.
- After each API slice is integrated.
- After each completed module in any frontend app.
- After each worker job family is stable.
- Before each zone-level `dev:local-prod` rehearsal.
- Before leaving public zone.
- Before leaving customer zone.
- Before leaving seller zone.
- Before leaving provider admin zone.

**Rule:** A module is not done enough to move on until its tests are in place to the degree needed to prevent immediate regression.

---

# 18. When to Touch Docker and Local-Prod Infra

Do not wait until the end to discover whether the app works in a production-shaped container setup.

Touch and validate `dev:local-prod` infra at these checkpoints:

- After Phase A foundation (empty stack boots).
- After Phase B public zone completion.
- After Phase D customer transaction flow completion.
- After Phase E seller zone completion.
- After Phase F provider admin zone completion.
- After Phase G worker deep completion.
- Before Phase J CI/CD finalization.

At each of these checkpoints: update env files if needed, update Dockerfiles if needed, update Compose wiring if needed, validate healthchecks, and fix infra drift immediately.

---

# 19. Reusable Boilerplates to Build During Development

As development progresses, these internal boilerplates must emerge and be reused from that point forward:

**UI boilerplates:** page shell template, protected page template, search/listing page template, data table page template, form page template, dashboard page template, drawer/modal workflow template, empty/loading/error state template.

**API boilerplates:** read-only module template, CRUD module template, protected scoped read module template, protected scoped mutation module template, audited mutation template, paginated list endpoint template, file/document access endpoint template.

**Worker boilerplates:** queue registration template, typed job payload template, retriable job template, audit-aware job template, notification job template, projection refresh job template, active sync push/pull job template, reconciliation job template.

**Testing boilerplates:** package unit test template, API integration test template, auth-guard regression test template, seller-scope regression test template, customer ownership test template, admin-role test template, E2E page flow template.

**Infra boilerplates:** app Dockerfile template, worker Dockerfile template, healthcheck template, env example template, Compose service template, CI workflow template, deploy workflow template.

---

# 20. Final Implementation Completion Rule

Do not call the implementation complete until every one of these is yes:

- [ ] Can a public user browse and search the marketplace meaningfully?
- [ ] Can a customer authenticate, manage their account, wishlist, cart, checkout, and view orders?
- [ ] Can a customer access order documents securely?
- [ ] Can loyalty and referrals operate technically end to end?
- [ ] Can seller users operate their marketplace responsibilities without raw backend access?
- [ ] Can provider admins onboard sellers, moderate catalog, and monitor sync?
- [ ] Are search, queue, cache, storage, auth, and notifications all real subsystems?
- [ ] Is every protected flow actually protected on the backend?
- [ ] Does `dev:local-prod` Docker rehearsal work completely?
- [ ] Do tests cover all critical paths?
- [ ] Does CI/CD reflect the actual runtime architecture?
- [ ] Is the platform operable after launch, not just demoable?
- [ ] Is consent management functional, auditable, and revocable for all applicable regulations?
- [ ] Can customers exercise all data subject and data principal rights end to end?
- [ ] Are cookie consent gates preventing non-essential processing before consent is given?
- [ ] Are data retention schedules and automated purge jobs operational?
- [ ] Is the breach incident logging and regulatory notification workflow ready for production activation?
- [ ] Are GDPR, UK GDPR, and India DPDP Act compliance flags enabled and tested in non-local environments?
- [ ] Is the multi-language layer active with all strings going through i18n?
- [ ] Is the multi-currency layer active with all prices currency-aware?
- [ ] Are all active push/pull sync jobs between the marketplace and seller ERPs operational?

If any answer is no, implementation is not complete.

---

# 21. Short Version of the Working Method

1. Finalize data models and seed data first.
2. Do once-only setup before any feature work.
3. Create shared foundations early.
4. Choose one meaningful module or screen flow.
5. Create or verify seed data for that slice.
6. Build the view in `dev:lite` with seed data — no dependencies.
7. Define contracts, build real API and DB logic.
8. Wire frontend via the data service resolver — no component rewrites needed.
9. Enforce auth, scope, and compliance hooks.
10. Add cache, worker, notifications, and storage only if that slice needs them.
11. Run the slice in `dev:integrated` mode.
12. Write tests.
13. Rehearse in `dev:local-prod` at each major zone boundary.
14. Move to the next slice only when the previous one is genuinely done.

This is the implementation model from start to finish.
