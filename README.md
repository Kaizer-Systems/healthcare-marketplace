# Grip Health — Healthcare Marketplace Platform

A TypeScript monorepo powering a healthcare marketplace with three frontend apps, a NestJS API, and a background worker.

## Quick Start

```bash
nvm use 24
pnpm install
pnpm dev:lite
```

## Architecture

See [TECH_STACK.md](./TECH_STACK.md) for the full technical specification.

## Structure

| Path                       | Description                                  |
| -------------------------- | -------------------------------------------- |
| `apps/web/web-marketplace` | Public marketplace & customer area (Next.js) |
| `apps/web/web-seller`      | Seller portal (Next.js)                      |
| `apps/web/web-admin`       | Admin control panel (Next.js)                |
| `apps/api`                 | REST API (NestJS + Fastify)                  |
| `apps/worker`              | Background jobs (NestJS + BullMQ)            |
| `packages/*`               | Shared libraries                             |
| `infra/`                   | Docker, Compose, nginx, Redis configs        |
| `env/`                     | Environment files per runtime mode           |

## Development Modes

| Mode           | Command               | Description                      |
| -------------- | --------------------- | -------------------------------- |
| dev-lite       | `pnpm dev:lite`       | No external deps, seed data only |
| dev-module     | `pnpm dev:module`     | Selective real dependencies      |
| dev-integrated | `pnpm dev:integrated` | All services running             |
| local-prod     | `pnpm dev:local-prod` | Full Dockerized stack with HTTPS |
