# Architecture Overview

This healthcare marketplace is a TypeScript monorepo with:

- **3 frontend apps**: web-marketplace, web-seller, web-admin (Next.js 16 / App Router)
- **1 API**: NestJS + Fastify
- **1 Worker**: NestJS + BullMQ
- **12 shared packages** in `packages/`

See [TECH_STACK.md](../../TECH_STACK.md) for full technical specification.

## Deployment Topology

- **Frontend droplet**: web-marketplace, web-seller, web-admin, nginx
- **Backend droplet**: api, worker, redis
- **External**: MongoDB Atlas, S3/R2 object storage
