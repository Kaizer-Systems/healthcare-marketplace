FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/worker/package.json apps/worker/
COPY packages/ packages/
RUN pnpm install --frozen-lockfile --filter worker...

FROM base AS builder
COPY --from=deps /app .
COPY . .
RUN pnpm --filter worker build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app/apps/worker
COPY --from=builder /app/apps/worker/dist ./dist
COPY --from=builder /app/apps/worker/node_modules ./node_modules
COPY --from=builder /app/apps/worker/package.json ./
CMD ["node", "dist/main/main.js"]
