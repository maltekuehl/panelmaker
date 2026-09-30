# Deployment

The supported production setup is the Docker Compose stack in [`docker-compose.yml`](../../docker-compose.yml). A bare-metal install is described at the end.

## What the stack runs

| Service    | Image                                       | Role                                                                                                                             |
| ---------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `postgres` | `postgres:16-alpine`                        | Database. Data in the `postgres_data` volume. Never published, and only on the internal `database` network.                      |
| `migrate`  | built from `Dockerfile` (`migrator` target) | One-shot job: `npx prisma migrate deploy && npm run setup`. Runs on every `up`, then exits. Also used for operator commands.     |
| `app`      | built from `Dockerfile` (`runner` target)   | The Next.js server on port 3000 inside the network. Uploads in the `uploads_data` volume. Starts only after `migrate` succeeded. |
| `caddy`    | `caddy:2-alpine`                            | Reverse proxy, the only service with published ports. Automatic HTTPS for a hostname, otherwise plain HTTP on `HTTP_PORT` (8080). |

Every request, including `/uploads/...`, goes through the app. Report images can belong to private or lab experiments, and only the app can check who may see them, so the proxy never serves upload files from disk.

`npm run setup` loads the reference data (ontology terms, marker proteins, imaging methods, fluorophores) with upserts only. It never deletes anything and creates no users, so it is safe on every deploy. See [Data](./data.md).

## Requirements

- Docker Engine with the Compose plugin (`docker compose`)
- A hostname for the instance and a TLS certificate for it
- Outbound HTTPS from the host, both at build time (npm packages, base images) and at runtime (ontology and antibody lookups, FPbase during `setup`, AI providers if configured). See [Data](./data.md#outbound-network-access).

The image build runs `next build` against a throwaway Postgres inside the builder stage, so building needs noticeably more memory and time than running.

## 1. Get the code and create `.env`

```bash
git clone https://github.com/complextissue/panelmaker.git
cd panelmaker
cp .env.local.example .env
```

Edit `.env`. At minimum:

| Variable               | Set it to                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_BASE_URL` | The public URL, for example `https://panelmaker.example.edu`. Baked into the build, see below.    |
| `AUTH_SECRET`          | Output of `openssl rand -hex 32`                                                                  |
| `POSTGRES_PASSWORD`    | Output of `openssl rand -hex 32`. Required: compose refuses to start without it.                  |
| `SITE_ADDRESS`         | Your hostname, if this server should get its own certificate. See [HTTPS](#https-and-the-caddy-proxy). |
| `INSTANCE_*`           | Your instance name and operator details. See [Legal pages and branding](./legal-and-branding.md). |

Optional values can stay empty (`""`). Anything you do set must be valid: `ENCRYPTION_KEY` needs at least 32 characters and `INSTANCE_CONTACT_EMAIL` a valid address, otherwise the server does not start.

Recommended:

- `ENCRYPTION_KEY` (`openssl rand -hex 32`) if users or labs should be able to store their own AI provider keys. See [AI assistant](./ai-assistant.md).
- One or more instance AI keys, if the operator pays for the assistant.

You do not need to set `DATABASE_URL`, `UPLOADS_DIR` or `INSTANCE_CONFIG_DIR`: the compose file overrides them for the `migrate` and `app` services. The full list is in [Configuration](./configuration.md).

`NEXT_PUBLIC_BASE_URL` is passed to the image build as a build argument and compiled into the client bundle. Compose reads it from `.env` for that. If you change it later, rebuild with `docker compose up -d --build`.

`POSTGRES_PASSWORD` is placed into a connection URL, so avoid characters such as `@`, `/`, `:` and `#`; a hex string is safe. `POSTGRES_USER`, `POSTGRES_PASSWORD` and `POSTGRES_DB` only take effect when the `postgres_data` volume is first created. Changing them afterwards does not change the existing database role.

## 2. Build and start

```bash
docker compose up -d --build
```

Compose starts Postgres, waits for it to be healthy, runs `migrate`, and then starts `app` and `caddy`. Follow progress with:

```bash
docker compose logs -f migrate app
```

The app has a health endpoint at `/api/health`, which the compose healthcheck uses. Caddy lets it through without basic auth, so external monitors can use it too.

On a host without internet access to FPbase, add `SETUP_SKIP_FPBASE=1` to `.env`. The spectra can be loaded later with `docker compose run --rm migrate npm run fpbase:sync`.

## 3. Create the first admin

```bash
docker compose run --rm migrate npm run admin:create -- --email you@example.edu --name "Your Name"
```

The command creates an active account with the `ADMIN` role, or promotes an existing account with that email. It prints a generated password once and does not store it anywhere. To choose the password yourself, pass `-e ADMIN_PASSWORD=...` to `docker compose run` (12 to 128 characters). `--reset-password` issues a new generated password for an existing account.

Sign in at `/signin` with "Email and Password". The admin area is at `/admin`. See [Administration](./administration.md).

## 4. Optional: import the IBEX knowledge base

```bash
docker compose run --rm migrate npm run ibex:import
```

This adds 104 experiments with 1,277 published antibody validation reports from the IBEX Imaging Community knowledge base (CC BY 4.0). It reads committed files, makes no network calls, and is safe to run again. See [Data](./data.md#ibex-knowledge-base).

## HTTPS and the Caddy proxy

HTTPS is not optional for a production instance. For any host other than `localhost`, `127.0.0.1` or `*.localhost`, the app sends `Strict-Transport-Security` and a Content Security Policy with `upgrade-insecure-requests`, so browsers rewrite every asset request to HTTPS. Opening the instance over plain HTTP on a server hostname or IP address will not work. A trial on your own machine at the default `http://localhost:8080` does work.

The bundled Caddy runs in one of two modes, chosen by `SITE_ADDRESS`:

| Mode                  | Settings                                                                              | Use it when                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Automatic HTTPS       | `SITE_ADDRESS` = the hostname, `HTTP_PORT=80`, `HTTPS_PORT=443`, optional `ACME_EMAIL` | The server has a public IP and a DNS name, for example a VPS. See [the example below](#example-a-single-vps).   |
| Plain HTTP (default)  | `SITE_ADDRESS=:80`, `HTTP_PORT` of your choice                                        | A trial on localhost, or another proxy (an institutional load balancer, a host nginx) terminates TLS in front.   |

In automatic HTTPS mode Caddy obtains a certificate from Let's Encrypt on first start and renews it by itself. Ports 80 and 443 must reach the server from the internet for that, and the DNS record must already point at it. Certificates are kept in the `caddy_data` volume; do not delete it, or every restart requests new certificates and runs into rate limits.

Behind another proxy:

- Forward to `http://<host>:${HTTP_PORT}`. If that proxy runs on the same host, set `PROXY_BIND=127.0.0.1` so nothing else can reach Caddy.
- Pass the original `Host` header. Caddy keeps `X-Forwarded-*` headers from proxies on private networks and replaces them from anywhere else.
- Allow request bodies of at least 80 MB, the largest accepted image upload. Caddy allows 100 MB.
- Do not buffer responses on `/api/chat`, which streams.

In both modes, set `NEXT_PUBLIC_BASE_URL` to the `https://` URL visitors use. Compose derives `AUTH_URL` (`<NEXT_PUBLIC_BASE_URL>/auth`) from it and sets `AUTH_TRUST_HOST=true`. If you enable GitHub sign-in, the OAuth callback URL is `<NEXT_PUBLIC_BASE_URL>/auth/callback/github`.

## What is reachable from outside

Only Caddy publishes ports, on `PROXY_BIND` (default all interfaces). The app has no published port. Postgres has none either, and it sits on an internal Docker network with no route to the host or the internet, so only the `app` and `migrate` services can reach it.

This matters because Docker writes its own firewall rules for published ports, which bypass host firewalls such as `ufw`. A port is private only if it is not published. Check with `docker compose ps`: only `panelmaker-caddy` should list ports.

## Optional basic auth gate

To put the whole site behind one HTTP basic auth login, for example while the instance is not public yet, set both values in `.env`:

```bash
BASIC_AUTH_USER="panelmaker"
BASIC_AUTH_PASSWORD="output of openssl rand -hex 24"
```

Then `docker compose up -d caddy`. The gate is off when both are empty, which is the default. Setting only one of them, or a user name with characters other than letters, digits, `.`, `_` and `-`, makes the Caddy container refuse to start. `/api/health` stays open. This gate sits in front of the normal PanelMaker sign-in; it does not replace it.

- Basic auth sends the credentials with every request, readable by anyone on the path unless the connection is HTTPS. Only use it with HTTPS.
- The gate also applies to the public API, so API clients need the same credentials.
- Caddy stores only a bcrypt hash, but the plain password is in `.env` and in the container environment. Use a dedicated random value, not a password used anywhere else.

To open the instance to everyone, empty both values and run `docker compose up -d caddy` again.

## Example: a single VPS

A small instance on one virtual server with its own domain, using Caddy's automatic HTTPS and the basic auth gate.

1. Point a DNS record such as `panelmaker.example.edu` at the server. Allow only ports 22, 80 and 443 in the provider firewall.
2. In `.env`, next to the required values from step 1:

   ```bash
   NEXT_PUBLIC_BASE_URL="https://panelmaker.example.edu"
   SITE_ADDRESS="panelmaker.example.edu"
   HTTP_PORT="80"
   HTTPS_PORT="443"
   ACME_EMAIL="you@example.edu"
   BASIC_AUTH_USER="panelmaker"
   BASIC_AUTH_PASSWORD="output of openssl rand -hex 24"
   ```

3. `docker compose up -d --build`, then create the first admin as in step 3 above.
4. `docker compose logs caddy` should show the certificate being obtained. Open `https://panelmaker.example.edu`.

## Operator commands

Anything from `package.json` can be run in the `migrate` image, which has the full toolchain and talks to the bundled database:

```bash
docker compose run --rm migrate npm run <script> [-- <arguments>]
```

The scripts are listed in [Data](./data.md#scripts).

## Backups

Two volumes hold state: `postgres_data` (the database) and `uploads_data` (report images). Back up both, together with `.env` and `config/`. Without the same `ENCRYPTION_KEY`, stored user and lab API keys cannot be decrypted after a restore.

Database dump:

```bash
docker compose exec -T postgres pg_dump -U panelmaker -d panelmaker -Fc > panelmaker-$(date +%F).dump
```

Uploaded images:

```bash
docker compose cp app:/app/data/uploads ./uploads-$(date +%F)
```

Use your own `POSTGRES_USER` and `POSTGRES_DB` if you changed them.

Restore into a running stack:

```bash
docker compose exec -T postgres pg_restore -U panelmaker -d panelmaker --clean --if-exists < panelmaker-2026-09-30.dump
docker compose cp ./uploads-2026-09-30/. app:/app/data/uploads
docker compose exec -u root app chown -R node:node /app/data/uploads
```

`docker compose down` keeps both volumes. `docker compose down -v` deletes them, including every report image.

## Bare-metal install

Without Docker you need Node.js at the version in [`.nvmrc`](../../.nvmrc), npm, and PostgreSQL.

```bash
git clone https://github.com/complextissue/panelmaker.git
cd panelmaker
nvm use
npm ci
cp .env.local.example .env
```

In `.env`, in addition to the values above:

- `DATABASE_URL` pointing at your database
- `NODE_ENV=production`, so `npm run seed:demo` refuses to wipe this database
- `UPLOADS_DIR` on persistent storage writable by the app user
- `AUTH_URL=https://<your host>/auth` and `AUTH_TRUST_HOST=true` when running behind a reverse proxy
- `INSTANCE_CONFIG_DIR` if the legal overrides are not in `./config`

Then:

```bash
npx prisma migrate deploy
npm run setup
npm run build
npm run admin:create -- --email you@example.edu --name "Your Name"
npm run start
```

`npm run build` needs the migrated database to be reachable, because Next.js prefills cached pages during the build. `npm run start` listens on port 3000 (set `PORT` to change it). Run it under a process manager such as systemd, and put a TLS-terminating reverse proxy in front of it with the settings under "Behind another proxy" in [HTTPS and the Caddy proxy](#https-and-the-caddy-proxy). Uploads are served by the app itself, so the proxy should forward `/uploads/` like any other path.
