FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/web-seller/package.json apps/web/web-seller/
COPY packages/ packages/
RUN pnpm install --frozen-lockfile --filter web-seller...

FROM base AS builder
COPY --from=deps /app .
COPY . .
RUN pnpm --filter web-seller build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/apps/web/web-seller/.next/standalone ./
COPY --from=builder /app/apps/web/web-seller/.next/static ./.next/static
COPY --from=builder /app/apps/web/web-seller/public ./public
EXPOSE 3001
CMD ["node", "server.js"]
