FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/web-admin/package.json apps/web/web-admin/
COPY packages/ packages/
RUN pnpm install --frozen-lockfile --filter web-admin...

FROM base AS builder
COPY --from=deps /app .
COPY . .
RUN pnpm --filter web-admin build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/apps/web/web-admin/.next/standalone ./
COPY --from=builder /app/apps/web/web-admin/.next/static ./.next/static
COPY --from=builder /app/apps/web/web-admin/public ./public
EXPOSE 3002
CMD ["node", "server.js"]
