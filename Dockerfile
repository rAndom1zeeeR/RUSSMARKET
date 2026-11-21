# Multi-stage, Node 22, Next.js standalone.
# Production database is Postgres: DATABASE_URL (postgresql://…) is passed at runtime by docker-compose.yml / Dokploy.
# SQLite is for local development only and is not used in this image.

FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat python3 make g++ \
  && corepack enable \
  && corepack prepare pnpm@12.5.1 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
COPY prisma.config.ts ./
ENV CI=true
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
ENV COREPACK_INTEGRITY_KEYS=0
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat python3 make g++ \
  && corepack enable \
  && corepack prepare pnpm@12.5.1 --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Placeholder: the build never connects to a database, it only needs a URL of the right kind.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN pnpm db:generate && pnpm build

FROM node:22-alpine AS runner
# wget уже есть в busybox, отдельный пакет не нужен.
RUN apk add --no-cache dumb-init \
  && addgroup -g 1001 -S nodejs \
  && adduser -S nextjs -u 1001 -G nodejs
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=5 CMD sh -c "wget -qO- http://127.0.0.1:${PORT:-3000}/api/health >/dev/null || exit 1"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
