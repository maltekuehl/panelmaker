# syntax=docker/dockerfile:1.7

# Node version is pinned to match .nvmrc / package.json engines.
ARG NODE_VERSION=24.4.0

# ─── base ────────────────────────────────────────────────────────────
# Shared foundation. Debian slim + openssl (required by Prisma engines).
FROM node:${NODE_VERSION}-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# ─── deps ────────────────────────────────────────────────────────────
# Install all dependencies. `postinstall` runs `prisma generate`, and
# prisma.config.ts resolves DATABASE_URL at load time, so a build-only
# placeholder is required even though generation never touches the DB.
FROM base AS deps
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

# ─── builder ─────────────────────────────────────────────────────────
# Produce the standalone Next.js build. This app uses `use cache` +
# cacheLife() on DB-backed pages, which Next.js prefills at build time by
# executing the queries, so `next build` needs a reachable, migrated
# database. We spin up a throwaway Postgres inside this stage (empty +
# migrated → queries return nothing → the static shell still builds) and
# discard it; it never reaches the runtime image.
#
# The non-DB env vars below are placeholders that satisfy lib/env.ts
# validation (which throws in production) and bake NEXT_PUBLIC_* into the
# client bundle. Real runtime secrets are injected by docker-compose.
FROM base AS builder
ARG NEXT_PUBLIC_BASE_URL=http://localhost:8080
ENV NODE_ENV=production \
  NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL} \
  DATABASE_URL=postgresql://postgres@127.0.0.1:5432/panelmaker_build \
  AUTH_SECRET=build_time_placeholder_secret_min_32_chars \
  GEMINI_API_KEY=build \
  CRON_SECRET=build_time_placeholder_secret
RUN apt-get update \
  && apt-get install -y --no-install-recommends postgresql \
  && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN set -eux; \
  PGBIN="$(ls -d /usr/lib/postgresql/*/bin)"; \
  su postgres -c "$PGBIN/initdb --auth=trust -D /tmp/pgdata"; \
  su postgres -c "$PGBIN/pg_ctl -D /tmp/pgdata -o '-c listen_addresses=127.0.0.1 -p 5432' -w start"; \
  su postgres -c "$PGBIN/createdb -h 127.0.0.1 panelmaker_build"; \
  npx prisma generate; \
  npx prisma migrate deploy; \
  npm run build; \
  su postgres -c "$PGBIN/pg_ctl -D /tmp/pgdata stop"

# ─── migrator ────────────────────────────────────────────────────────
# One-shot image that runs `prisma migrate deploy` against the database
# before the app starts. Keeps the full toolchain out of the runtime image.
FROM base AS migrator
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
USER node
CMD ["npx", "prisma", "migrate", "deploy"]

# ─── dev ─────────────────────────────────────────────────────────────
# Hot-reloading dev server. Source is bind-mounted by docker-compose.dev.yml;
# node_modules and lib/generated are seeded into named volumes from this image.
FROM base AS dev
ENV NODE_ENV=development \
  DATABASE_URL=postgresql://build:build@localhost:5432/build
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ─── runner ──────────────────────────────────────────────────────────
# Minimal production runtime: just the standalone server + static assets,
# run as the non-root `node` user shipped with the base image.
FROM base AS runner
ENV NODE_ENV=production \
  PORT=3000 \
  HOSTNAME=0.0.0.0

# Uploads are written here by the app and shared with nginx via a volume.
RUN mkdir -p /app/data/uploads && chown -R node:node /app/data

COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node
EXPOSE 3000
CMD ["node", "server.js"]
