FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS dependencies
COPY package.json pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --no-frozen-lockfile

FROM dependencies AS builder
ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY tsconfig.base.json ./
COPY apps/web apps/web
COPY packages/shared packages/shared
RUN pnpm --filter @saferoute/shared build && pnpm --filter @saferoute/web build

FROM node:22-alpine AS runner
RUN addgroup -S saferoute && adduser -S saferoute -G saferoute
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder --chown=saferoute:saferoute /app/apps/web/.next/standalone ./
COPY --from=builder --chown=saferoute:saferoute /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=saferoute:saferoute /app/apps/web/public ./apps/web/public
USER saferoute
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
