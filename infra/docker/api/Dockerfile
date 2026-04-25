FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/ packages/
RUN pnpm install --frozen-lockfile --filter api...

FROM base AS builder
COPY --from=deps /app .
COPY . .
RUN pnpm --filter api build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app/apps/api
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./
EXPOSE 4000
CMD ["node", "dist/main/main.js"]
