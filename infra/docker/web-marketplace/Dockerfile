FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/web-marketplace/package.json apps/web/web-marketplace/
COPY packages/ packages/
RUN pnpm install --frozen-lockfile --filter web-marketplace...

FROM base AS builder
COPY --from=deps /app .
COPY . .
RUN pnpm --filter web-marketplace build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/apps/web/web-marketplace/.next/standalone ./
COPY --from=builder /app/apps/web/web-marketplace/.next/static ./.next/static
COPY --from=builder /app/apps/web/web-marketplace/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
