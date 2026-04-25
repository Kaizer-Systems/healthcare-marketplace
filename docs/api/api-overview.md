# API Overview

The API runs on NestJS with Fastify adapter at `apps/api`.

## Endpoints

- `GET /health` — Health check
- `POST /auth/*` — Authentication flows
- `GET /products` — Product catalog
- `GET /categories` — Category listing
- `GET /search` — Atlas Search queries
- `GET /orders` — Order management
- `POST /compliance/*` — Compliance operations

Full endpoint documentation will be generated from NestJS Swagger module.
