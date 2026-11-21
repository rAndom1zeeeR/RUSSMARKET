# Multi-stage, Node 22, Next.js standalone.
# SQLite file is /data/app.db, mounted by docker-compose.yml.

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
ENV DATABASE_URL=file:/tmp/build.db
RUN pnpm exec prisma generate && pnpm build

FROM node:22-alpine AS runner
RUN apk add --no-cache dumb-init wget \
  && addgroup -g 1001 -S nodejs \
  && adduser -S nextjs -u 1001 -G nodejs
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL=file:/data/app.db

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=5 CMD sh -c "wget -qO- http://127.0.0.1:3000/ || exit 1"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
