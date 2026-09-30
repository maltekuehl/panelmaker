# Deployment

The supported production setup is the Docker Compose stack in [`docker-compose.yml`](../../docker-compose.yml). A bare-metal install is described at the end.

## What the stack runs

| Service    | Image                                       | Role                                                                                                                             |
| ---------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `postgres` | `postgres:16-alpine`                        | Database. Data in the `postgres_data` volume. Never published, and only on the internal `database` network.                      |
| `migrate`  | built from `Dockerfile` (`migrator` target) | One-shot job: `npx prisma migrate deploy && npm run setup`. Runs on every `up`, then exits. Also used for operator commands.     |
| `app`      | built from `Dockerfile` (`runner` target)   | The Next.js server on port 3000 inside the network. Uploads in the `uploads_data` volume. Starts only after `migrate` succeeded. |
| `nginx`    | `nginx:alpine`                              | Reverse proxy. Listens on plain HTTP, published on the host as `NGINX_BIND:NGINX_PORT` (default `0.0.0.0:8080`).                 |

Every request, including `/uploads/...`, goes through the app. Report images can belong to private or lab experiments, and only the app can check who may see them, so nginx never serves upload files from disk.

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
| `INSTANCE_*`           | Your instance name and operator details. See [Legal pages and branding](./legal-and-branding.md). |

`ENCRYPTION_KEY` and `INSTANCE_CONTACT_EMAIL` must be either set to a valid value or deleted from `.env`. Left as `""`, they fail validation and the production server does not start.

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

Compose starts Postgres, waits for it to be healthy, runs `migrate`, and then starts `app` and `nginx`. Follow progress with:

```bash
docker compose logs -f migrate app
```

The app has a health endpoint at `/api/health`, which the compose healthcheck uses. nginx lets it through without basic auth, so external monitors can use it too.

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

## TLS and the reverse proxy

The bundled nginx listens on plain HTTP only. Put a TLS-terminating proxy in front of it: an institutional load balancer, Caddy, or nginx on the host. Forward to `http://127.0.0.1:${NGINX_PORT}`.

HTTPS is not optional for a production instance. For any host other than `localhost`, `127.0.0.1` or `*.localhost`, the app sends `Strict-Transport-Security` and a Content Security Policy with `upgrade-insecure-requests`, so browsers rewrite every asset request to HTTPS. Opening the instance over plain HTTP on a server hostname or IP address will not work. A trial on your own machine at the default `http://localhost:8080` does work.

For the outer proxy:

- Set `NEXT_PUBLIC_BASE_URL` to the `https://` URL visitors use. Compose derives `AUTH_URL` (`<NEXT_PUBLIC_BASE_URL>/auth`) from it and sets `AUTH_TRUST_HOST=true`.
- Pass the original `Host` header.
- Allow request bodies of at least 80 MB, the largest accepted image upload. The bundled nginx allows 100 MB.
- Do not buffer responses on `/api/chat`, which streams. The bundled nginx already has `proxy_buffering off`.
- The `nginx` service publishes `NGINX_PORT` on all host interfaces by default. When the TLS proxy runs on the same host, set `NGINX_BIND=127.0.0.1` so only that proxy can reach it.

If you enable GitHub sign-in, the OAuth callback URL is `<NEXT_PUBLIC_BASE_URL>/auth/callback/github`.

## Optional basic auth gate

To put the whole site behind one HTTP basic auth login, for example for a staging instance, set both values in `.env`:

```bash
BASIC_AUTH_USER="staging"
BASIC_AUTH_PASSWORD="a-long-random-password"
```

Then `docker compose up -d nginx`. The gate is off when both are empty, which is the default. Setting only one of them makes the nginx container refuse to start. `/api/health` stays open. This gate sits in front of the normal PanelMaker sign-in; it does not replace it.

- Basic auth sends the credentials with every request, readable by anyone on the path unless the connection is HTTPS. Only use it behind the TLS proxy.
- The gate also applies to the public API, so API clients need the same credentials.
- The password is stored in plain text inside the nginx container. Use a dedicated random value, not a password used anywhere else.

## Example: a single VPS

A small instance on one virtual server, with Caddy handling TLS and the basic auth gate on while the instance is not public yet.

1. Point a DNS record such as `panelmaker.example.edu` at the server. Allow only ports 22, 80 and 443 in the provider firewall.
2. In `.env`, next to the required values from step 1:

   ```bash
   NEXT_PUBLIC_BASE_URL="https://panelmaker.example.edu"
   NGINX_BIND="127.0.0.1"
   BASIC_AUTH_USER="panelmaker"
   BASIC_AUTH_PASSWORD="output of openssl rand -hex 24"
   ```

3. Install Caddy on the host with this `/etc/caddy/Caddyfile`, which obtains and renews the certificate itself:

   ```
   panelmaker.example.edu {
       request_body {
           max_size 100MB
       }
       reverse_proxy 127.0.0.1:8080 {
           flush_interval -1
       }
   }
   ```

4. `docker compose up -d --build`, then create the first admin as in step 3 above.

What is reachable from the internet: Caddy on 80 and 443, and nothing else from the stack. nginx listens on the loopback interface only, the app has no published port, and Postgres sits on an internal network that has no route to the host or the internet. This matters because Docker writes its own firewall rules for published ports, which bypass host firewalls such as `ufw`. Check with `docker compose ps`: only `nginx` should list a port, bound to `127.0.0.1`.

To open the instance to everyone later, empty both `BASIC_AUTH_*` values and run `docker compose up -d nginx`.

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

`npm run build` needs the migrated database to be reachable, because Next.js prefills cached pages during the build. `npm run start` listens on port 3000 (set `PORT` to change it). Run it under a process manager such as systemd, and put a TLS-terminating reverse proxy in front of it with the settings from [TLS and the reverse proxy](#tls-and-the-reverse-proxy). Uploads are served by the app itself, so the proxy should forward `/uploads/` like any other path.
