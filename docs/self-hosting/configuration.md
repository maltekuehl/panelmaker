# Configuration

PanelMaker reads its configuration from environment variables. In Docker they come from `.env` (copy [`.env.local.example`](../../.env.local.example)); `docker-compose.yml` overrides a few of them. The app validates its variables in [`src/lib/env.ts`](../../lib/env.ts). With `NODE_ENV=production` an invalid value stops the server; in development it only logs a warning.

Empty values: most variables treat `""` as unset. Two do not. `ENCRYPTION_KEY=""` and `INSTANCE_CONTACT_EMAIL=""` fail validation, and with `NODE_ENV=production` (always the case in Docker) the server then refuses to start. `.env.local.example` ships both as `""`, so either fill them in or delete the lines.

"Docker" in the tables means the value set by `docker-compose.yml`, which wins over `.env`.

## Core

| Variable                  | Required | Default       | Description                                                                                                                                                                                        |
| ------------------------- | -------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_BASE_URL`    | yes      | none          | Public URL of the instance, for example `https://panelmaker.example.edu`. Compiled into the client bundle at build time: rebuild after changing it. Docker build default: `http://localhost:8080`. |
| `DATABASE_URL`            | yes      | none          | PostgreSQL connection string. Docker: set to the bundled `postgres` service.                                                                                                                       |
| `AUTH_SECRET`             | yes      | none          | Signs sessions. At least 32 characters; generate with `openssl rand -hex 32`. Changing it signs everyone out.                                                                                      |
| `NODE_ENV`                | no       | `development` | `production` in Docker. `npm run seed:demo` and `npm run seed:demo-user` refuse to run against `production` without an override.                                                                   |
| `AUTH_URL`                | no       | none          | Read by Auth.js. Docker: `<NEXT_PUBLIC_BASE_URL>/auth`. Set it yourself on a bare-metal install behind a proxy.                                                                                    |
| `AUTH_TRUST_HOST`         | no       | none          | Read by Auth.js. Docker: `true`. Set it to `true` on a bare-metal install behind a proxy.                                                                                                          |
| `AUTH_DEBUG`              | no       | `false`       | `true` turns on Auth.js debug logging.                                                                                                                                                             |
| `NEXT_TELEMETRY_DISABLED` | no       | none          | `1` turns off Next.js telemetry. Set in the Docker image.                                                                                                                                          |
| `SHADOW_DATABASE_URL`     | no       | none          | Development only. A separate, disposable database for `prisma migrate dev`. Without it, Prisma creates a temporary one itself if the database user may create databases.                           |
| `NEXT_PUBLIC_TEST_MODE`   | no       | `false`       | Used by the Playwright configuration. Leave unset on an instance.                                                                                                                                  |

## Instance identity

See [Legal pages and branding](./legal-and-branding.md) for how these are used.

| Variable                  | Required | Default      | Description                                                                                                                                 |
| ------------------------- | -------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `INSTANCE_NAME`           | no       | `PanelMaker` | Display name, for example `PanelMaker Aarhus`.                                                                                              |
| `INSTANCE_INSTITUTION`    | no       | none         | Institution operating the instance.                                                                                                         |
| `INSTANCE_OPERATOR`       | no       | none         | Legal entity or person responsible, shown on the legal notice.                                                                              |
| `INSTANCE_ADDRESS`        | no       | none         | Postal address. Separate lines with `\n` or real newlines.                                                                                  |
| `INSTANCE_CONTACT_EMAIL`  | no       | none         | Contact email on the legal pages. Must be a valid email address.                                                                            |
| `INSTANCE_CONFIG_DIR`     | no       | `./config`   | Directory with `legal/notice.md`, `legal/privacy.md`, `legal/terms.md` overrides. Docker: `/app/config`, mounted read-only from `./config`. |
| `INSTANCE_ALLOW_INDEXING` | no       | `false`      | `true` lets search engines index the instance. Anything else keeps robots.txt closed and the sitemap empty.                                 |

## Authentication

Email and password sign-in is always on. Anyone who can reach the sign-up page can create an account.

| Variable             | Required | Default | Description                                                                                  |
| -------------------- | -------- | ------- | -------------------------------------------------------------------------------------------- |
| `AUTH_GITHUB_ID`     | no       | none    | GitHub OAuth app client ID. GitHub sign-in appears only when both GitHub variables are set.  |
| `AUTH_GITHUB_SECRET` | no       | none    | GitHub OAuth app client secret. Callback URL: `<NEXT_PUBLIC_BASE_URL>/auth/callback/github`. |

## AI assistant

All optional. With no key anywhere, the assistant shows a notice that it needs an API key. See [AI assistant](./ai-assistant.md).

| Variable                       | Required | Default                        | Description                                                                                                                                                     |
| ------------------------------ | -------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GOOGLE_GENERATIVE_AI_API_KEY` | no       | none                           | Instance key for Google Gemini. Replaces the old `GEMINI_API_KEY`.                                                                                              |
| `OPENAI_API_KEY`               | no       | none                           | Instance key for OpenAI.                                                                                                                                        |
| `ANTHROPIC_API_KEY`            | no       | none                           | Instance key for Anthropic.                                                                                                                                     |
| `AI_DEFAULT_MODEL`             | no       | `google:gemini-3.5-flash-lite` | Default model as `provider:model`, where provider is `google`, `openai` or `anthropic`.                                                                         |
| `AI_INSTANCE_DAILY_LIMIT`      | no       | `200`                          | Chat requests per user per 24 hours on the instance keys. `0` means unlimited. User and lab keys are not counted.                                               |
| `ENCRYPTION_KEY`               | no       | none                           | At least 32 characters; generate with `openssl rand -hex 32`. Required before users or labs can store their own keys. Changing it makes stored keys unreadable. |

## Storage

| Variable      | Required | Default          | Description                                                                                                           |
| ------------- | -------- | ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| `UPLOADS_DIR` | no       | `./data/uploads` | Where uploaded report images are written, as lossless WebP. Docker: `/app/data/uploads` on the `uploads_data` volume. |

## Integrations

| Variable            | Required | Default | Description                                                                                                                                                                                           |
| ------------------- | -------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SCICRUNCH_API_KEY` | no       | none    | SciCrunch key for free-text and catalog-number antibody search in the Antibody Registry. RRID lookups use the keyless public resolver and work without it. Also needed by `npm run pathoplex:lookup`. |

## Scripts

Read only by the command-line scripts, not by the running app.

| Variable             | Used by                  | Description                                                                          |
| -------------------- | ------------------------ | ------------------------------------------------------------------------------------ |
| `ADMIN_EMAIL`        | `npm run admin:create`   | Email to use when `--email` is not passed.                                           |
| `ADMIN_NAME`         | `npm run admin:create`   | Name to use when `--name` is not passed.                                             |
| `ADMIN_PASSWORD`     | `npm run admin:create`   | Password to set instead of generating one. 12 to 128 characters.                     |
| `SETUP_SKIP_FPBASE`  | `npm run setup`          | `1` skips the FPbase spectra download, for hosts without internet access.            |
| `SEED_ALLOW_RESET`   | `npm run seed:demo`      | `1` lets the destructive demo seed run when `NODE_ENV=production`.                   |
| `DEMO_USER_EMAIL`    | `npm run seed:demo-user` | Demo login email. Default `demo@panelmaker.local`.                                   |
| `DEMO_USER_PASSWORD` | `npm run seed:demo-user` | Demo login password. Required when `NODE_ENV=production`, otherwise a fixed default. |

## Docker Compose only

Read by `docker-compose.yml` and `docker-compose.dev.yml`, not by the app.

| Variable              | Default                                | Description                                                                                                      |
| --------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `POSTGRES_USER`       | `panelmaker`                           | Database role created on first start of the `postgres_data` volume.                                              |
| `POSTGRES_PASSWORD`   | required (production), `panelmaker` (dev) | Password for that role. Use a hex string, since it is embedded in a URL. Only applied when the volume is first created. |
| `POSTGRES_DB`         | `panelmaker`                           | Database name.                                                                                                   |
| `SITE_ADDRESS`        | `:80`                                  | Caddy site address. A hostname turns on automatic HTTPS with a Let's Encrypt certificate; `:80` serves plain HTTP. |
| `ACME_EMAIL`          | empty                                  | Contact address for the certificate authority, used for expiry warnings. Optional.                               |
| `HTTP_PORT`           | `8080`                                 | Host port for Caddy's HTTP listener. Must be `80` for automatic HTTPS.                                           |
| `HTTPS_PORT`          | `8443`                                 | Host port for Caddy's HTTPS listener (TCP and UDP). Must be `443` for automatic HTTPS.                           |
| `PROXY_BIND`          | `0.0.0.0`                              | Host address Caddy's ports are published on. Set `127.0.0.1` when another proxy on the same host forwards to it. |
| `BASIC_AUTH_USER`     | empty                                  | With `BASIC_AUTH_PASSWORD`, turns on a site-wide HTTP basic auth gate in Caddy. Set both or neither.             |
| `BASIC_AUTH_PASSWORD` | empty                                  | See `BASIC_AUTH_USER`.                                                                                           |
| `POSTGRES_PORT`       | `5433` (dev only)                      | Host port for Postgres in `docker-compose.dev.yml`, bound to `127.0.0.1`. The production stack never publishes Postgres. |
| `APP_PORT`            | `3000`                                 | Host port for the dev server in `docker-compose.dev.yml`, bound to `127.0.0.1`.                                  |
| `BUILD_MEMORY_MB`     | `4096`                                 | Node heap limit in MB for `next build` inside the image build. Needs RAM plus swap of at least this much.        |
