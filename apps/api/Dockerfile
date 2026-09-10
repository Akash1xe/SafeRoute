FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS dependencies
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --no-frozen-lockfile

FROM dependencies AS builder
COPY tsconfig.base.json ./
COPY apps/api apps/api
COPY packages/shared packages/shared
RUN pnpm --filter @saferoute/shared build && pnpm --filter @saferoute/api build

FROM node:22-alpine AS runner
RUN corepack enable && addgroup -S saferoute && adduser -S saferoute -G saferoute
WORKDIR /app
ENV NODE_ENV=production
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=dependencies /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY apps/api/package.json apps/api/package.json
COPY apps/api/migrations apps/api/migrations
COPY packages/shared/package.json packages/shared/package.json
USER saferoute
EXPOSE 4000
CMD ["sh", "-c", "node apps/api/dist/infrastructure/database/migrate.js && node apps/api/dist/server.js"]
