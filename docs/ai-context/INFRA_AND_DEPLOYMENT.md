# Healthcare Marketplace Platform — Infrastructure and Deployment

## 1. Purpose of This Document

This document defines the complete infrastructure architecture, Docker image strategy, GitHub Container Registry setup, two-droplet DigitalOcean deployment topology, Cloudflare edge configuration, MongoDB Atlas production configuration, object storage setup, CI/CD pipeline with all 10 workflow files, secrets management, container scaling, backup and recovery, and the step-by-step production setup sequence.

All decisions here are final for launch. Upgrade paths are documented separately at the end.

---

## 2. Production Infrastructure Stack

The chosen production stack is:

| Component | Choice | Reason |
|-----------|--------|--------|
| Compute | DigitalOcean Droplets | Simple, cheap, Docker-native, SSH deployable |
| Container runtime | Docker + Docker Compose | No Kubernetes complexity |
| Image registry | GitHub Container Registry (GHCR) | Free with GitHub account |
| CI/CD | GitHub Actions | Only CI system in this project |
| Database | MongoDB Atlas M10 | Managed, includes Atlas Search |
| Cache and queues | Redis (self-hosted container) | On backend droplet |
| Object storage | Cloudflare R2 (preferred) or AWS S3 | R2 has no egress fees |
| Edge/CDN/WAF | Cloudflare Pro | DNS, WAF, caching, DDoS mitigation |
| Development DB | MongoDB Atlas M0 (free) | Dev and pre-launch only |

---

## 3. Two-Droplet Production Topology

### 3.1 Architecture overview

```
Internet
  ↓
Cloudflare DNS / Proxy / WAF / CDN
  ↓
DigitalOcean Frontend Droplet
  ├─ nginx (reverse proxy, SSL termination, routing by hostname)
  ├─ web-marketplace (Next.js container, port 3000)
  ├─ web-seller (Next.js container, port 3001)
  └─ web-admin (Next.js container, port 3002)
       ↓ (DigitalOcean private network — internal IP only)
DigitalOcean Backend Droplet
  ├─ api (NestJS container, port 4000)
  ├─ worker (NestJS queue consumer, no external port)
  └─ redis (Redis container, port 6379 — internal only)
       ↓
External managed services
  ├─ MongoDB Atlas M10 (+ Atlas Search)
  └─ Cloudflare R2 (or AWS S3)
```

### 3.2 Frontend droplet

**Purpose:** Serves all three customer-facing and internal web applications behind nginx.

**Recommended spec at launch:** 4 GiB / 2 vCPU (~$24/month). Upgrade to 8 GiB / 4 vCPU (~$48/month) when container memory pressure appears.

**Services running:**
- `nginx` — reverse proxy, routes by hostname to the correct app container, handles TLS termination for origin certificates
- `web-marketplace` — public marketplace and customer account application
- `web-seller` — seller portal application
- `web-admin` — provider admin control panel application

**Hostname routing via nginx:**

| Hostname | Container |
|----------|-----------|
| `marketplace.yourdomain.com` | `web-marketplace:3000` |
| `seller.yourdomain.com` | `web-seller:3001` |
| `admin.yourdomain.com` | `web-admin:3002` |

All public traffic goes through Cloudflare proxy, which handles external TLS. nginx handles the origin TLS certificate (Cloudflare origin certificate or Let's Encrypt).

### 3.3 Backend droplet

**Purpose:** Runs the API, background worker, and Redis. Not exposed to the public internet directly.

**Recommended spec at launch:** 4 GiB / 2 vCPU (~$24/month). Upgrade when API load or worker throughput demands it.

**Services running:**
- `api` — NestJS API, port 4000 bound to private network IP only
- `worker` — NestJS BullMQ consumer, no HTTP port exposed
- `redis` — Redis, port 6379 bound to localhost/internal only

**API access from frontend droplet:** The frontend apps' server-side requests to the API use the backend droplet's **DigitalOcean private network IP**. This is free within the same region and does not traverse the public internet. The `NEXT_PUBLIC_API_URL` for server-side rendering uses this private IP, not the public domain. The API's public-facing domain (`api.yourdomain.com`) is for client-side browser calls only and is proxied through Cloudflare.

### 3.4 Droplet networking

- Enable **DigitalOcean Private Networking** on both droplets during creation. This provides a free internal IP range within the same datacenter region.
- Redis must **not** be accessible from the public internet. Bind Redis to `127.0.0.1` or the private network interface only.
- The API port 4000 must **not** be accessible directly from the public internet in production. Nginx or Cloudflare should be the only public-facing entry point.
- Both droplets should have a **UFW firewall** configured: allow only SSH (port 22), HTTP (port 80), and HTTPS (port 443) on the frontend droplet; allow only SSH and the private-network API port on the backend droplet.

---

## 4. Docker Images

### 4.1 One image per app

Each application produces its own Docker image:

| App | Image name | Internal port |
|-----|-----------|--------------|
| `web-marketplace` | `ghcr.io/<org>/<repo>/web-marketplace:<tag>` | 3000 |
| `web-seller` | `ghcr.io/<org>/<repo>/web-seller:<tag>` | 3001 |
| `web-admin` | `ghcr.io/<org>/<repo>/web-admin:<tag>` | 3002 |
| `api` | `ghcr.io/<org>/<repo>/api:<tag>` | 4000 |
| `worker` | `ghcr.io/<org>/<repo>/worker:<tag>` | — |
| `nginx` | `ghcr.io/<org>/<repo>/nginx:<tag>` | 80, 443 |

### 4.2 Image tagging strategy

Every successful build on the `main` branch produces images tagged with:
- `<git-sha>` — the exact commit SHA, used for rollback reference
- `latest` — always the most recent main build

Promotion tags:
- `staging` — applied when a build is deployed to staging
- `production` — applied when a release is deployed to production

Example image references:
```
ghcr.io/myorg/healthcare-marketplace/api:abc1234
ghcr.io/myorg/healthcare-marketplace/api:latest
ghcr.io/myorg/healthcare-marketplace/api:staging
ghcr.io/myorg/healthcare-marketplace/api:production
```

### 4.3 Dockerfile structure

All Next.js app Dockerfiles use a multi-stage build with output standalone mode enabled in `next.config.ts`:

```dockerfile
# infra/docker/web-marketplace/Dockerfile
FROM node:24-alpine AS base
RUN npm install -g pnpm

FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/web/web-marketplace/package.json ./apps/web/web-marketplace/
COPY packages/ui/package.json ./packages/ui/
COPY packages/config/package.json ./packages/config/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/auth/package.json ./packages/auth/
COPY packages/utils/package.json ./packages/utils/
RUN pnpm install --frozen-lockfile --prod=false

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter web-marketplace build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/web-marketplace/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/web-marketplace/.next/static ./apps/web/web-marketplace/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/web-marketplace/public ./apps/web/web-marketplace/public
USER nextjs
EXPOSE 3000
ENV PORT=3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1
CMD ["node", "apps/web/web-marketplace/server.js"]
```

NestJS app Dockerfile pattern:

```dockerfile
# infra/docker/api/Dockerfile
FROM node:24-alpine AS base
RUN npm install -g pnpm

FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/auth/package.json ./packages/auth/
COPY packages/cache/package.json ./packages/cache/
COPY packages/storage/package.json ./packages/storage/
COPY packages/search/package.json ./packages/search/
COPY packages/security/package.json ./packages/security/
COPY packages/observability/package.json ./packages/observability/
COPY packages/config/package.json ./packages/config/
COPY packages/utils/package.json ./packages/utils/
RUN pnpm install --frozen-lockfile --prod=false

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter api build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
USER nestjs
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1
CMD ["node", "dist/main"]
```

### 4.4 Deployment model: image pull, not repo clone

Droplets never clone the source repository. At deploy time, GitHub Actions SSHes into the droplet and pulls pre-built images from GHCR:

```bash
# Pull new images
echo $GHCR_TOKEN | docker login ghcr.io -u $GITHUB_ACTOR --password-stdin
docker pull ghcr.io/myorg/healthcare-marketplace/web-marketplace:latest
docker pull ghcr.io/myorg/healthcare-marketplace/web-seller:latest
docker pull ghcr.io/myorg/healthcare-marketplace/web-admin:latest
docker pull ghcr.io/myorg/healthcare-marketplace/nginx:latest

# Restart containers with new images
docker compose --env-file /opt/app/.env -f /opt/app/docker-compose.frontend.yml up -d
```

The production `docker-compose.frontend.yml` and `docker-compose.backend.yml` files live on each droplet at `/opt/app/`. They reference GHCR image URLs and are managed separately from the source repo. They are placed on the server once during initial setup and updated only when Compose configuration changes.

---

## 5. Production Docker Compose Files

### 5.1 Frontend droplet Compose (`/opt/app/docker-compose.frontend.yml`)

```yaml
version: "3.9"

services:
  nginx:
    image: ghcr.io/myorg/healthcare-marketplace/nginx:${IMAGE_TAG:-latest}
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /opt/app/nginx/conf:/etc/nginx/conf.d:ro
      - /opt/app/certs:/etc/nginx/certs:ro
    depends_on:
      web-marketplace:
        condition: service_healthy
      web-seller:
        condition: service_healthy
      web-admin:
        condition: service_healthy
    restart: unless-stopped
    deploy:
      replicas: 1

  web-marketplace:
    image: ghcr.io/myorg/healthcare-marketplace/web-marketplace:${IMAGE_TAG:-latest}
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
      AUTH_SECRET: ${AUTH_SECRET}
      AUTH_TRUST_HOST: "true"
      NEXTAUTH_URL: ${NEXTAUTH_URL_MARKETPLACE}
      ENABLE_GDPR_MODE: "true"
      ENABLE_DPDP_MODE: "true"
      ENABLE_COOKIE_CONSENT_BANNER: "true"
    restart: unless-stopped
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
        max_attempts: 3
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      start_period: 40s
      retries: 3

  web-seller:
    image: ghcr.io/myorg/healthcare-marketplace/web-seller:${IMAGE_TAG:-latest}
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
      AUTH_SECRET: ${AUTH_SECRET}
      AUTH_TRUST_HOST: "true"
      NEXTAUTH_URL: ${NEXTAUTH_URL_SELLER}
      ENABLE_GDPR_MODE: "true"
      ENABLE_DPDP_MODE: "true"
    restart: unless-stopped
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
        max_attempts: 3
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      start_period: 40s
      retries: 3

  web-admin:
    image: ghcr.io/myorg/healthcare-marketplace/web-admin:${IMAGE_TAG:-latest}
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
      AUTH_SECRET: ${AUTH_SECRET}
      AUTH_TRUST_HOST: "true"
      NEXTAUTH_URL: ${NEXTAUTH_URL_ADMIN}
      ENABLE_GDPR_MODE: "true"
      ENABLE_DPDP_MODE: "true"
      MFA_MODE: required
    restart: unless-stopped
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
        max_attempts: 3
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3002/api/health"]
      interval: 30s
      timeout: 10s
      start_period: 40s
      retries: 3
```

### 5.2 Backend droplet Compose (`/opt/app/docker-compose.backend.yml`)

```yaml
version: "3.9"

services:
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes
    volumes:
      - redis-data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    image: ghcr.io/myorg/healthcare-marketplace/api:${IMAGE_TAG:-latest}
    ports:
      - "${PRIVATE_IP}:4000:4000"   # bind to private IP only
    environment:
      NODE_ENV: production
      MONGODB_URI: ${MONGODB_URI}
      MONGODB_DB_NAME: ${MONGODB_DB_NAME}
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      AUTH_SECRET: ${AUTH_SECRET}
      STORAGE_PROVIDER: ${STORAGE_PROVIDER}
      STORAGE_BUCKET: ${STORAGE_BUCKET}
      STORAGE_ACCESS_KEY: ${STORAGE_ACCESS_KEY}
      STORAGE_SECRET_KEY: ${STORAGE_SECRET_KEY}
      STORAGE_ENDPOINT: ${STORAGE_ENDPOINT}
      CDN_BASE_URL: ${CDN_BASE_URL}
      ENABLE_GDPR_MODE: "true"
      ENABLE_DPDP_MODE: "true"
      ENABLE_CONSENT_MANAGEMENT: "true"
      ENABLE_DSR_WORKFLOWS: "true"
      ENABLE_DATA_RETENTION_JOBS: "true"
      ENABLE_BREACH_NOTIFICATION_WORKFLOW: "true"
      DATA_RESIDENCY_REGION: ${DATA_RESIDENCY_REGION}
      CHILDREN_DATA_PROTECTION_MODE: "true"
      ENABLE_RATE_LIMITING: "true"
      ENABLE_AUDIT_LOGGING: "true"
      MFA_MODE: required
    depends_on:
      redis:
        condition: service_healthy
    restart: unless-stopped
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
        max_attempts: 3
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:4000/health"]
      interval: 30s
      timeout: 10s
      start_period: 40s
      retries: 3

  worker:
    image: ghcr.io/myorg/healthcare-marketplace/worker:${IMAGE_TAG:-latest}
    environment:
      NODE_ENV: production
      MONGODB_URI: ${MONGODB_URI}
      MONGODB_DB_NAME: ${MONGODB_DB_NAME}
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      STORAGE_PROVIDER: ${STORAGE_PROVIDER}
      STORAGE_BUCKET: ${STORAGE_BUCKET}
      STORAGE_ACCESS_KEY: ${STORAGE_ACCESS_KEY}
      STORAGE_SECRET_KEY: ${STORAGE_SECRET_KEY}
      STORAGE_ENDPOINT: ${STORAGE_ENDPOINT}
      ENABLE_DATA_RETENTION_JOBS: "true"
      ENABLE_BREACH_NOTIFICATION_WORKFLOW: "true"
      DATA_RESIDENCY_REGION: ${DATA_RESIDENCY_REGION}
      ENABLE_AUDIT_LOGGING: "true"
    depends_on:
      redis:
        condition: service_healthy
      api:
        condition: service_healthy
    restart: unless-stopped
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
        max_attempts: 3

volumes:
  redis-data:
```

---

## 6. Container Scaling

Scaling any individual container is a Compose `deploy.replicas` change followed by `docker compose up -d`:

```bash
# Scale API to 2 instances
docker compose --env-file /opt/app/.env -f /opt/app/docker-compose.backend.yml up -d --scale api=2

# Scale web-marketplace to 2 instances
docker compose --env-file /opt/app/.env -f /opt/app/docker-compose.frontend.yml up -d --scale web-marketplace=2
```

No architecture change is required. nginx handles load balancing across multiple instances of the same service automatically because Docker Compose puts replicas behind the same service name on the internal network.

If an individual app outgrows its droplet, the migration path is to move that service's Compose definition to a new dedicated droplet and update nginx routing accordingly. No application code changes.

---

## 7. nginx Configuration

### 7.1 Base nginx config structure

```
infra/nginx/
├─ conf/
│  ├─ marketplace.conf
│  ├─ seller.conf
│  ├─ admin.conf
│  └─ api.conf
└─ snippets/
   ├─ ssl.conf
   ├─ security-headers.conf
   └─ proxy-params.conf
```

### 7.2 Example marketplace.conf

```nginx
server {
    listen 443 ssl;
    server_name marketplace.yourdomain.com;

    include /etc/nginx/conf.d/snippets/ssl.conf;
    include /etc/nginx/conf.d/snippets/security-headers.conf;

    location / {
        proxy_pass http://web-marketplace:3000;
        include /etc/nginx/conf.d/snippets/proxy-params.conf;
    }
}

server {
    listen 80;
    server_name marketplace.yourdomain.com;
    return 301 https://$host$request_uri;
}
```

### 7.3 Security headers snippet

```nginx
# snippets/security-headers.conf
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
```

---

## 8. Secrets Management in Production

### 8.1 GitHub Encrypted Secrets

All real credentials are stored in GitHub Encrypted Secrets, scoped to GitHub Environments:

| GitHub Environment | Contents | Approval gate |
|-------------------|----------|---------------|
| `staging` | Staging credentials | Optional |
| `production` | Production credentials | Required — manual approval |

Secrets stored:
- `MONGODB_URI` — Atlas connection string
- `MONGODB_DB_NAME` — database name
- `REDIS_PASSWORD` — Redis auth password
- `AUTH_SECRET` — Auth.js secret
- `STORAGE_ACCESS_KEY` — R2 or S3 access key
- `STORAGE_SECRET_KEY` — R2 or S3 secret key
- `STORAGE_BUCKET` — bucket name
- `STORAGE_ENDPOINT` — R2 endpoint or S3 endpoint
- `CDN_BASE_URL` — CDN base URL for media delivery
- `SSH_PRIVATE_KEY` — SSH key for deployer to access droplets
- `FRONTEND_DROPLET_IP` — frontend droplet public IP
- `BACKEND_DROPLET_IP` — backend droplet public IP
- `BACKEND_DROPLET_PRIVATE_IP` — backend droplet private network IP
- `GHCR_TOKEN` — GitHub token with `packages:read` for image pulls on droplets
- `DATA_RESIDENCY_REGION` — compliance region configuration
- Any third-party API keys (email provider, SMS provider, etc.)

### 8.2 How secrets reach the droplet

1. GitHub Actions workflow runs (triggered by merge or tag).
2. Workflow reads secrets from the scoped GitHub Environment.
3. Workflow SSHes into the droplet using the `SSH_PRIVATE_KEY` secret.
4. Workflow writes the `.env` file to `/opt/app/.env` with `chmod 600` — owner-readable only.
5. Workflow runs `docker compose up -d` using that env file.
6. The `.env` file on the droplet lives at `/opt/app/.env`, outside any web root, never accessible via HTTP.

### 8.3 What is never in Git

- Any `.env` file containing real values
- Any credential, API key, token, or connection string
- SSH private keys
- Storage access keys

### 8.4 What is in Git (committed, non-secret)

- `env/.env.base` — shared non-secret defaults
- `env/.env.dev-lite`, `.env.dev-module`, `.env.dev-integrated`, `.env.local-prod` — mode-specific non-secret flags
- `env/.env.prod.example` — all production variable names with placeholder values

---

## 9. CI/CD Pipeline — 10 GitHub Actions Workflow Files

All workflows live in `.github/workflows/`. The naming is intentional and stable.

### 9.1 Workflow file list

```
.github/workflows/
├─ ci-pr.yml                     # PR validation
├─ ci-main.yml                   # Main branch validation + image build
├─ deploy-staging.yml            # Deploy to staging droplets
├─ deploy-production.yml         # Deploy to production droplets (approval required)
├─ reusable-setup.yml            # Reusable: pnpm install + cache
├─ reusable-test.yml             # Reusable: lint + typecheck + unit + integration tests
├─ reusable-build-images.yml     # Reusable: Docker build + push to GHCR
├─ reusable-deploy.yml           # Reusable: SSH pull + compose up on droplet
├─ reusable-smoke-check.yml      # Reusable: post-deploy health validation
└─ dependency-audit.yml          # Scheduled: weekly npm audit
```

### 9.2 Branch and trigger strategy

| Trigger | Workflow | Action |
|---------|----------|--------|
| PR opened/updated → `develop` or `main` | `ci-pr.yml` | Lint, typecheck, unit tests, build check |
| Push to `develop` | `ci-main.yml` then `deploy-staging.yml` | Full CI + build images + deploy to staging |
| Push to `main` | `ci-main.yml` | Full CI + build images (no auto-production deploy) |
| Tag `v*.*.*` pushed | `deploy-production.yml` | Deploy tagged images to production (approval required) |
| Manual dispatch | `deploy-staging.yml` or `deploy-production.yml` | Controlled redeploy or rollback |
| Weekly schedule | `dependency-audit.yml` | Security audit of all dependencies |

### 9.3 Runner strategy

| Job type | Runner |
|----------|--------|
| Lint, typecheck, tests | `ubuntu-latest` (GitHub-hosted) |
| Docker image build and push | `ubuntu-latest` (GitHub-hosted) |
| Staging deploy (SSH) | `ubuntu-latest` (GitHub-hosted with SSH action) |
| Production deploy (SSH) | `ubuntu-latest` (GitHub-hosted with SSH action) |

Self-hosted runner on the MacBook is used only for local pipeline rehearsal, not for actual cloud deployments.

### 9.4 `ci-pr.yml` — PR validation

```yaml
name: CI — Pull Request

on:
  pull_request:
    branches: [develop, main]

concurrency:
  group: ci-pr-${{ github.ref }}
  cancel-in-progress: true

jobs:
  validate:
    uses: ./.github/workflows/reusable-setup.yml

  test:
    needs: validate
    uses: ./.github/workflows/reusable-test.yml
    with:
      run-e2e: false
```

### 9.5 `ci-main.yml` — Main branch CI + image build

```yaml
name: CI — Main Branch

on:
  push:
    branches: [main, develop]

concurrency:
  group: ci-main-${{ github.ref }}
  cancel-in-progress: false

jobs:
  test:
    uses: ./.github/workflows/reusable-test.yml
    with:
      run-e2e: true

  build-images:
    needs: test
    uses: ./.github/workflows/reusable-build-images.yml
    with:
      image-tag: ${{ github.sha }}
    secrets: inherit
```

### 9.6 `reusable-setup.yml` — Node + pnpm install with cache

```yaml
name: Reusable — Setup

on:
  workflow_call:

jobs:
  setup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm

      - run: pnpm install --frozen-lockfile
```

### 9.7 `reusable-test.yml` — Lint, typecheck, unit, integration, E2E

```yaml
name: Reusable — Test

on:
  workflow_call:
    inputs:
      run-e2e:
        type: boolean
        default: false

jobs:
  lint-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm test

  e2e-tests:
    if: inputs.run-e2e
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:e2e
```

### 9.8 `reusable-build-images.yml` — Docker build and push to GHCR

```yaml
name: Reusable — Build Docker Images

on:
  workflow_call:
    inputs:
      image-tag:
        type: string
        required: true

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    strategy:
      matrix:
        app: [web-marketplace, web-seller, web-admin, api, worker, nginx]

    steps:
      - uses: actions/checkout@v4

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build and push ${{ matrix.app }}
        uses: docker/build-push-action@v5
        with:
          context: .
          file: infra/docker/${{ matrix.app }}/Dockerfile
          push: true
          tags: |
            ghcr.io/${{ github.repository_owner }}/healthcare-marketplace/${{ matrix.app }}:${{ inputs.image-tag }}
            ghcr.io/${{ github.repository_owner }}/healthcare-marketplace/${{ matrix.app }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### 9.9 `reusable-deploy.yml` — SSH pull + compose up on droplet

```yaml
name: Reusable — Deploy to Droplet

on:
  workflow_call:
    inputs:
      droplet-type:
        type: string   # frontend or backend
        required: true
      image-tag:
        type: string
        required: true
      compose-file:
        type: string
        required: true
    secrets:
      SSH_PRIVATE_KEY:
        required: true
      DROPLET_IP:
        required: true
      GHCR_TOKEN:
        required: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to ${{ inputs.droplet-type }} droplet
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.DROPLET_IP }}
          username: deploy
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            echo ${{ secrets.GHCR_TOKEN }} | docker login ghcr.io -u ${{ github.actor }} --password-stdin
            docker compose --env-file /opt/app/.env -f /opt/app/${{ inputs.compose-file }} pull
            docker compose --env-file /opt/app/.env -f /opt/app/${{ inputs.compose-file }} up -d
            docker image prune -f
```

### 9.10 `reusable-smoke-check.yml` — Post-deploy health validation

```yaml
name: Reusable — Smoke Check

on:
  workflow_call:
    inputs:
      marketplace-url:
        type: string
        required: true
      api-url:
        type: string
        required: true

jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - name: Check marketplace health
        run: |
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" ${{ inputs.marketplace-url }}/api/health)
          if [ "$STATUS" != "200" ]; then echo "Marketplace health check failed: $STATUS" && exit 1; fi

      - name: Check API health
        run: |
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" ${{ inputs.api-url }}/health)
          if [ "$STATUS" != "200" ]; then echo "API health check failed: $STATUS" && exit 1; fi
```

### 9.11 `deploy-staging.yml` — Deploy to staging

```yaml
name: Deploy — Staging

on:
  push:
    branches: [develop]
  workflow_dispatch:

environment: staging

concurrency:
  group: deploy-staging
  cancel-in-progress: false

jobs:
  deploy-backend:
    uses: ./.github/workflows/reusable-deploy.yml
    with:
      droplet-type: backend
      image-tag: ${{ github.sha }}
      compose-file: docker-compose.backend.yml
    secrets:
      SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
      DROPLET_IP: ${{ secrets.BACKEND_DROPLET_IP }}
      GHCR_TOKEN: ${{ secrets.GHCR_TOKEN }}

  deploy-frontend:
    needs: deploy-backend
    uses: ./.github/workflows/reusable-deploy.yml
    with:
      droplet-type: frontend
      image-tag: ${{ github.sha }}
      compose-file: docker-compose.frontend.yml
    secrets:
      SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
      DROPLET_IP: ${{ secrets.FRONTEND_DROPLET_IP }}
      GHCR_TOKEN: ${{ secrets.GHCR_TOKEN }}

  smoke-check:
    needs: deploy-frontend
    uses: ./.github/workflows/reusable-smoke-check.yml
    with:
      marketplace-url: https://staging-marketplace.yourdomain.com
      api-url: https://staging-api.yourdomain.com
```

### 9.12 `deploy-production.yml` — Deploy to production (approval required)

```yaml
name: Deploy — Production

on:
  push:
    tags:
      - 'v*.*.*'
  workflow_dispatch:
    inputs:
      image-tag:
        description: Image tag to deploy (defaults to tag or latest)
        required: false

environment: production   # has required approval gate in GitHub settings

concurrency:
  group: deploy-production
  cancel-in-progress: false

jobs:
  deploy-backend:
    uses: ./.github/workflows/reusable-deploy.yml
    with:
      droplet-type: backend
      image-tag: ${{ github.event.inputs.image-tag || github.ref_name }}
      compose-file: docker-compose.backend.yml
    secrets:
      SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
      DROPLET_IP: ${{ secrets.BACKEND_DROPLET_IP }}
      GHCR_TOKEN: ${{ secrets.GHCR_TOKEN }}

  deploy-frontend:
    needs: deploy-backend
    uses: ./.github/workflows/reusable-deploy.yml
    with:
      droplet-type: frontend
      image-tag: ${{ github.event.inputs.image-tag || github.ref_name }}
      compose-file: docker-compose.frontend.yml
    secrets:
      SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
      DROPLET_IP: ${{ secrets.FRONTEND_DROPLET_IP }}
      GHCR_TOKEN: ${{ secrets.GHCR_TOKEN }}

  smoke-check:
    needs: deploy-frontend
    uses: ./.github/workflows/reusable-smoke-check.yml
    with:
      marketplace-url: https://marketplace.yourdomain.com
      api-url: https://api.yourdomain.com
```

### 9.13 `dependency-audit.yml` — Weekly security audit

```yaml
name: Dependency Audit

on:
  schedule:
    - cron: '0 9 * * 1'   # Every Monday at 09:00 UTC
  workflow_dispatch:

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - run: pnpm install --frozen-lockfile
      - run: pnpm audit --audit-level=high
```

---

## 10. Step-by-Step Production Setup

### Step 1 — Domain and Cloudflare

1. Register your domain and point nameservers to Cloudflare.
2. In Cloudflare DNS, create A records for:
   - `marketplace.yourdomain.com` → frontend droplet public IP
   - `seller.yourdomain.com` → frontend droplet public IP
   - `admin.yourdomain.com` → frontend droplet public IP
   - `api.yourdomain.com` → backend droplet public IP
3. Enable Cloudflare proxy (orange cloud) on all records.
4. Enable Cloudflare Pro plan.
5. In Cloudflare SSL/TLS settings, set encryption mode to **Full (strict)**.
6. Generate a Cloudflare Origin Certificate for your domain. Download the certificate and key — these will be placed on the frontend droplet for nginx.
7. Enable Cloudflare WAF rules appropriate for your traffic type.
8. Enable Cloudflare DDoS protection (automatic on Pro).

### Step 2 — Provision droplets

1. Create two DigitalOcean Droplets in the same region, both with **Private Networking enabled**.
   - Frontend droplet: **4 GiB / 2 vCPU** Ubuntu 24 LTS
   - Backend droplet: **4 GiB / 2 vCPU** Ubuntu 24 LTS
2. Add your SSH public key to both droplets during creation.
3. Note the private IP addresses of both droplets from the DigitalOcean network settings.
4. Configure UFW on the frontend droplet:
   ```bash
   ufw allow 22
   ufw allow 80
   ufw allow 443
   ufw enable
   ```
5. Configure UFW on the backend droplet:
   ```bash
   ufw allow 22
   ufw allow from <frontend-droplet-private-ip> to any port 4000
   ufw enable
   ```
6. Install Docker Engine and Docker Compose plugin on both droplets:
   ```bash
   apt update && apt install -y docker.io docker-compose-plugin
   systemctl enable docker
   ```
7. Create a `deploy` system user with Docker group membership on both droplets:
   ```bash
   useradd -m -s /bin/bash deploy
   usermod -aG docker deploy
   mkdir -p /home/deploy/.ssh
   # Add deployer SSH public key to /home/deploy/.ssh/authorized_keys
   ```

### Step 3 — MongoDB Atlas

1. Create a MongoDB Atlas account or use an existing one.
2. Create a new project for the marketplace.
3. Create a dedicated cluster starting at **M10**.
4. Enable **Atlas Search** on the cluster (no separate fee at M10).
5. In Network Access, add the public IP addresses of both droplets (or use VPC peering if preferred).
6. Create a database user with `readWrite` role on the production database.
7. Copy the connection string (SRV format) and store it as `MONGODB_URI` in GitHub Secrets.
8. Enable automated backups on the cluster with a daily backup policy.

### Step 4 — Object storage

**If using Cloudflare R2:**
1. Enable R2 in your Cloudflare account.
2. Create a bucket (e.g. `marketplace-media`).
3. Create an R2 API token with `Object Read & Write` permissions.
4. Note the bucket name, access key ID, secret access key, and R2 endpoint URL (`https://<account-id>.r2.cloudflarestorage.com`).
5. Connect a custom domain (e.g. `media.yourdomain.com`) to the R2 bucket for public CDN delivery of media files.

**If using AWS S3:**
1. Create an S3 bucket in the desired region.
2. Create an IAM user with `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` permissions on the bucket.
3. Configure CloudFront distribution in front of the S3 bucket for CDN delivery.
4. Note the bucket name, access key, secret key, region, and CloudFront domain.

### Step 5 — Place Compose files and nginx config on droplets

On the **frontend droplet**, as the `deploy` user:
```bash
mkdir -p /opt/app/nginx/conf /opt/app/certs
# Upload docker-compose.frontend.yml to /opt/app/
# Upload nginx conf files to /opt/app/nginx/conf/
# Upload Cloudflare origin certificate to /opt/app/certs/
chmod 600 /opt/app/certs/*.key
```

On the **backend droplet**, as the `deploy` user:
```bash
mkdir -p /opt/app
# Upload docker-compose.backend.yml to /opt/app/
```

### Step 6 — Configure GitHub secrets and environments

In the GitHub repository settings:

1. Create **Environments**: `staging` and `production`. Add required reviewer approval to `production`.
2. Add all production secrets to the `production` environment (see section 8.1 for the full list).
3. Add staging variants of the same secrets to the `staging` environment.
4. Add `SSH_PRIVATE_KEY` (the private key of the deployer SSH key) to both environments.
5. Add `FRONTEND_DROPLET_IP`, `BACKEND_DROPLET_IP`, `BACKEND_DROPLET_PRIVATE_IP` to both environments.
6. Add `GHCR_TOKEN` (a GitHub token with `packages:read` scope) to both environments.

### Step 7 — First deployment

1. Push to the `develop` branch to trigger `ci-main.yml` → image build → `deploy-staging.yml`.
2. Monitor the workflow run in GitHub Actions.
3. SSH into the frontend droplet and verify all containers are running:
   ```bash
   docker ps
   docker compose --env-file /opt/app/.env -f /opt/app/docker-compose.frontend.yml logs
   ```
4. SSH into the backend droplet and verify:
   ```bash
   docker ps
   docker compose --env-file /opt/app/.env -f /opt/app/docker-compose.backend.yml logs
   ```
5. Run through the smoke check manually for staging.
6. For production: push a version tag `v1.0.0` to `main`, approve the deployment in GitHub Actions, and monitor.

### Step 8 — Enable droplet backups

Enable DigitalOcean Droplet Backups on both droplets (weekly backups = 20% of Droplet cost, approximately $4.80/month per droplet at the 4 GiB tier).

---

## 11. Healthchecks

Every service must have a healthcheck. Healthchecks gate container startup order in Docker Compose and are checked by the smoke-check workflow after deployment.

### API healthcheck endpoint

`GET /health` returns:
```json
{
  "status": "ok",
  "db": "connected",
  "redis": "connected",
  "timestamp": "2026-04-12T00:00:00.000Z"
}
```

### Next.js app healthcheck endpoint

Each Next.js app has a route at `app/api/health/route.ts`:
```typescript
export async function GET() {
  return Response.json({ status: 'ok' })
}
```

### Worker startup readiness

The worker does not expose an HTTP port. Its readiness is confirmed by checking that it has successfully connected to Redis and registered its BullMQ queue processors in the startup logs.

---

## 12. Rollback Procedure

1. Identify the last known good image tag (commit SHA) from GitHub Actions run history or GHCR image list.
2. In GitHub Actions, trigger `deploy-production.yml` manually via `workflow_dispatch` with the known good `image-tag` input.
3. The reusable deploy workflow pulls that specific image tag and runs `docker compose up -d`.
4. The smoke check confirms the rollback succeeded.

If a Compose-level config issue is also involved, SSH directly into the droplet, edit the Compose file, and run `docker compose up -d` manually.

---

## 13. Backup and Recovery

| Asset | Backup method | Frequency |
|-------|-------------|-----------|
| MongoDB Atlas | Atlas automated backups | Daily (configured in Atlas) |
| Object storage (R2/S3) | R2/S3 versioning enabled on bucket | Continuous versioning |
| Droplet filesystem | DigitalOcean Droplet Backup | Weekly |
| Image tags | Retained in GHCR for rollback | Per-commit SHA retained |
| `.env` files | Stored in GitHub Encrypted Secrets | Version-controlled in GitHub |
| nginx config | Committed to Git in `infra/nginx/` | Per-commit |
| Compose files | On droplet, re-placed via CI | Managed manually |

**Recovery procedure:**
- Database loss: restore from Atlas automated backup via Atlas UI.
- Droplet failure: create a new droplet from the latest Droplet Backup snapshot, re-run the setup from Step 2 forward, and deploy the latest images.
- Application regression: rollback images as described in section 12.

---

## 14. Estimated Monthly Costs at Launch

| Service | Cost |
|---------|------|
| Frontend Droplet (4 GiB / 2 vCPU) | ~$24/month |
| Backend Droplet (4 GiB / 2 vCPU) | ~$24/month |
| Droplet Backups (weekly, both) | ~$9.60/month |
| MongoDB Atlas M10 | ~$60/month |
| Cloudflare R2 (100 GB storage) | ~$1.50/month |
| Cloudflare Pro | ~$20/month (annual) |
| GitHub (GHCR included in free/Pro plan) | $0–$4/month |
| **Estimated total** | **~$139–145/month** |

Upgrade triggers:
- Move from 4 GiB to 8 GiB droplets (~$48/month each) when container memory pressure appears.
- Move Atlas from M10 to M20 when DB CPU or storage is consistently constrained.
- Split to three droplets (separate one for admin/seller apps if those grow independently) when frontend droplet CPU is consistently saturated.

---

## 15. Upgrade Path Summary

| When | Upgrade |
|------|---------|
| Container memory pressure on either droplet | Resize to 8 GiB / 4 vCPU (~$48/month each) |
| Redis ops become a burden | Move to DigitalOcean Managed Cache (~$15/month) |
| DB CPU or search pressure rises | Move Atlas to M20 or higher |
| Admin/seller apps need isolation | Move `web-seller` and `web-admin` to a third droplet |
| Public traffic grows significantly | Add DigitalOcean Load Balancer (~$12/month) in front of multiple frontend droplets |
| Search index complexity grows | Add dedicated Atlas Search Nodes (additional cost beyond M10) |

Kubernetes is not on the upgrade path for this project. The Docker Compose + multiple-droplet scaling model covers the foreseeable scale requirements without Kubernetes operational overhead.
