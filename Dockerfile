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
# Install all dependencies. `postinstall` runs `prisma generate`, which never
# connects to the database; prisma.config.ts falls back to a placeholder URL.
FROM base AS deps
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
#
# Node sizes its heap from physical RAM (about 480 MB on a 1 GB server), which
# is not enough for `next build`. BUILD_MEMORY_MB raises the cap so a small
# server can use swap instead of crashing. The type check is skipped here:
# CI runs it, and it is the most memory-hungry build phase.
FROM base AS builder
ARG NEXT_PUBLIC_BASE_URL=http://localhost:8080
ARG BUILD_MEMORY_MB=4096
ENV NODE_ENV=production \
  NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL} \
  DATABASE_URL=postgresql://postgres@127.0.0.1:5432/panelmaker_build \
  AUTH_SECRET=build_time_placeholder_secret_min_32_chars \
  NEXT_OUTPUT_STANDALONE=1 \
  NEXT_SKIP_TYPECHECK=1 \
  NODE_OPTIONS=--max-old-space-size=${BUILD_MEMORY_MB}
RUN apt-get update \
  && apt-get install -y --no-install-recommends postgresql \
  && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN set -eux; \
  PGBIN="$(ls -d /usr/lib/postgresql/*/bin)"; \
  su postgres -c "$PGBIN/initdb --auth=trust -D /tmp/pgdata"; \
  su postgres -c "$PGBIN/pg_ctl -D /tmp/pgdata -o '-c listen_addresses=127.0.0.1 -p 5432 -c shared_buffers=16MB -c max_connections=20' -w start"; \
  su postgres -c "$PGBIN/createdb -h 127.0.0.1 panelmaker_build"; \
  npx prisma generate; \
  npx prisma migrate deploy; \
  npm run build; \
  su postgres -c "$PGBIN/pg_ctl -D /tmp/pgdata stop"

# ─── migrator ────────────────────────────────────────────────────────
# One-shot image that applies migrations and then loads the reference data
# (`npm run setup`: upserts only, safe on every deploy) before the app
# starts. It carries the full toolchain (tsx, scripts/, prisma/data, the
# model and lib modules the scripts import) so it also runs the operator
# commands, e.g. `docker compose run --rm migrate npm run admin:create -- --email ...`.
# Keeps all of that out of the runtime image.
FROM base AS migrator
ENV NODE_ENV=production \
  NPM_CONFIG_UPDATE_NOTIFIER=false
COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY --from=deps /app/lib/generated ./lib/generated
USER node
CMD ["sh", "-c", "npx prisma migrate deploy && npm run setup"]

# ─── dev ─────────────────────────────────────────────────────────────
# Hot-reloading dev server. Source is bind-mounted by docker-compose.dev.yml;
# node_modules and lib/generated are seeded into named volumes from this image.
FROM base AS dev
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY --from=deps /app/lib/generated ./lib/generated
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ─── runner ──────────────────────────────────────────────────────────
# Minimal production runtime: just the standalone server + static assets,
# run as the non-root `node` user shipped with the base image.
FROM base AS runner
ENV NODE_ENV=production \
  PORT=3000 \
  HOSTNAME=0.0.0.0

# Uploads are written here by the app (a named volume in docker-compose.yml).
# They are only ever served through the app route, which applies visibility.
RUN mkdir -p /app/data/uploads && chown -R node:node /app/data

COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node
EXPOSE 3000
CMD ["node", "server.js"]
