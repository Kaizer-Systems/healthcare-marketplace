# ADR-001: Technology Stack Selection

## Status

Accepted

## Context

Building a healthcare marketplace platform requiring multi-tenant seller support, compliance with GDPR/DPDP, and healthcare data protection.

## Decision

- TypeScript monorepo with pnpm + Turborepo
- Next.js (App Router) for 3 frontend apps
- NestJS + Fastify for API and worker
- MongoDB Atlas as primary database
- Redis + BullMQ for cache and queues
- Auth.js v5 with MongoDB adapter

## Consequences

- Single language (TypeScript) across full stack
- Shared contracts between frontend and backend
- MongoDB Atlas Search eliminates need for separate search infrastructure
