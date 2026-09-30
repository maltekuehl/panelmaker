# Deployment

This guide sets up a production instance on one Linux server with its own domain, for example a VPS, using the Docker Compose stack in [`docker-compose.yml`](../../docker-compose.yml). Caddy obtains the TLS certificate, a basic auth gate keeps the instance private until you open it, and nothing but ports 80 and 443 is reachable from outside.

Other setups (a trial on your own machine, a server behind an institutional proxy, an install without Docker) are covered in [Other setups](#other-setups) at the end.

The examples use `panelmaker.example.edu`. Replace it, and the example names and addresses, with your own.

## Before you start

- A Linux server (the commands assume Ubuntu or Debian) with root access. 2 GB of RAM or more is comfortable. The image build needs about 2 GB at its peak, far more than running the instance, so smaller servers need swap (step 2). A 1 GB server works with swap, but the first build then takes 20 to 30 minutes.
- Docker Engine with the Compose plugin. If it is missing: `curl -fsSL https://get.docker.com | sh`.
- A domain name you can create DNS records for.
- Outbound HTTPS from the server, both for the build (npm packages, base images) and at runtime (ontology and antibody lookups, FPbase, AI providers). See [Data](./data.md#outbound-network-access).
- If your provider has a firewall in its web console, open TCP 22, 80 and 443 and UDP 443 there as well.

## Part A: as root

### 1. Firewall

Allow SSH before you turn the firewall on, or you lock yourself out.

```bash
ufw default deny incoming
ufw default allow outgoing
ufw limit OpenSSH          # SSH on port 22, with brute-force throttling
ufw allow 80/tcp           # HTTP, needed for the certificate and the redirect to HTTPS
ufw allow 443/tcp          # HTTPS
ufw allow 443/udp          # HTTP/3
ufw enable
ufw status verbose
```

Docker writes its own firewall rules for published ports, and those bypass ufw. That is harmless here, because the only published ports are Caddy's 80 and 443. The app and the database publish nothing, and Postgres sits on an internal Docker network with no route to the host or the internet.

### 2. Swap (required with less than 4 GB of RAM)

```bash
swapon --show
```

If this prints a line with at least 4G, swap is already set up and you can skip to step 3. Otherwise:

```bash
fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
free -h
```

`fallocate` fails with "Text file busy" if `/swapfile` is already in use as swap. In that case it is already set up.

### 3. A user to run PanelMaker

```bash
adduser panelmaker                 # asks for a password, the other questions can stay empty
usermod -aG docker panelmaker      # may use Docker without sudo
```

Membership in the `docker` group is effectively root access. That is fine for a dedicated service user, but do not add people to it casually.

### 4. DNS

Create an `A` record (and `AAAA` if the server has IPv6) pointing `panelmaker.example.edu` at the server, then check it:

```bash
curl -4 -s ifconfig.me; echo      # the server's public IP
getent hosts panelmaker.example.edu
```

Both must show the same IP before you continue. Caddy cannot obtain a certificate for a name that does not resolve to the server yet.

### 5. Switch to the new user

```bash
su - panelmaker
docker ps
```

If `docker ps` reports "permission denied", the group change has not taken effect: `exit` and `su - panelmaker` again. Everything from here on runs as `panelmaker`.

## Part B: as `panelmaker`

### 6. Deploy key (private repositories only)

If you deploy the public repository, skip this step and clone over HTTPS in step 7.

For a private repository or fork, give the server a deploy key: an SSH key that grants read access to exactly one repository. The private half stays on the server, the public half goes into the repository settings.

```bash
ssh-keygen -t ed25519 -C "panelmaker-server" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```

Copy the whole line starting with `ssh-ed25519`. On GitHub, open the repository, then **Settings**, **Deploy keys**, **Add deploy key**. Paste the line, give it a title, leave **Allow write access** unchecked and save. If an older deploy key exists whose private half you no longer have, delete it.

Test the connection and answer `yes` to the fingerprint question:

```bash
ssh -T git@github.com
```

`Hi <owner>/<repository>! You've successfully authenticated, but GitHub does not provide shell access.` is the success message, even though the command exits with an error code.

### 7. Get the code

```bash
git clone git@github.com:complextissue/panelmaker.git ~/panelmaker      # with a deploy key
# or: git clone https://github.com/complextissue/panelmaker.git ~/panelmaker
cd ~/panelmaker
cp .env.local.example .env
chmod 600 .env
```

### 8. Generate the secrets

```bash
for name in AUTH_SECRET ENCRYPTION_KEY POSTGRES_PASSWORD BASIC_AUTH_PASSWORD; do
  echo "$name=$(openssl rand -hex 32)"
done
```

Keep the output for the next step. Also save `BASIC_AUTH_PASSWORD` in a password manager: you type it in the browser.

### 9. Fill in `.env`

```bash
nano .env
```

The file starts with the required settings, then optional sections. Set these and leave everything else as it is:

```bash
AUTH_SECRET="<generated>"
NEXT_PUBLIC_BASE_URL="https://panelmaker.example.edu"

POSTGRES_PASSWORD="<generated>"

INSTANCE_NAME="PanelMaker Aarhus"
INSTANCE_INSTITUTION="Aarhus University"
INSTANCE_OPERATOR="Puelles Lab"
INSTANCE_ADDRESS="Street 1\n8000 Aarhus C\nDenmark"
INSTANCE_CONTACT_EMAIL="panelmaker@example.edu"

SITE_ADDRESS="panelmaker.example.edu"
ACME_EMAIL="you@example.edu"
HTTP_PORT="80"
HTTPS_PORT="443"

BASIC_AUTH_USER="panelmaker"
BASIC_AUTH_PASSWORD="<generated>"

ENCRYPTION_KEY="<generated>"
```

- `DATABASE_URL` and `SHADOW_DATABASE_URL` are not needed: compose builds the database URL from `POSTGRES_*`. Delete the two lines to avoid confusion.
- `NEXT_PUBLIC_BASE_URL` is compiled into the image. Changing it later means rebuilding.
- `POSTGRES_PASSWORD` takes effect only when the database is first created. Changing it afterwards locks the app out of the database.
- `ENCRYPTION_KEY` lets users and labs store their own AI provider keys. For instance-wide keys billed to you, set `GOOGLE_GENERATIVE_AI_API_KEY`, `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`. See [AI assistant](./ai-assistant.md).
- For GitHub sign-in, set `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET`. The callback URL is `https://panelmaker.example.edu/auth/callback/github`.

Edit the existing lines rather than adding new ones at the end. If a name appears twice, the later line wins, and an empty duplicate silently switches the setting off. This command must print nothing:

```bash
grep -vE '^\s*(#|$)' .env | cut -d= -f1 | sort | uniq -d
```

After changing `.env` later on, apply it with `docker compose up -d`. `docker compose restart` keeps the old values.

Optional values can stay empty. Values you set must be valid, or the server does not start. Every variable is described in [Configuration](./configuration.md).

### 10. Build and start

```bash
docker compose up -d --build
docker compose logs -f migrate app caddy
```

On a server with less than 2 GB of RAM, build the two images one after the other instead, so they do not compete for memory:

```bash
docker compose build migrate && docker compose build app && docker compose up -d
```

The first build takes about 5 to 15 minutes, longer on small servers. If it fails with `JavaScript heap out of memory`, add or enlarge swap (step 2). The build lets Node use up to 4 GB (`BUILD_MEMORY_MB` in `.env` changes that), which on a small server only works when swap makes up the difference. Then:

1. `postgres` starts.
2. `migrate` applies the database schema, loads the reference data (ontology terms, marker proteins, imaging methods, fluorophores and their FPbase spectra) and exits. It runs on every `up` and never deletes anything.
3. `app` starts.
4. `caddy` starts and obtains the certificate. Its log shows "certificate obtained successfully".

Leave the logs with Ctrl+C. The containers keep running and come back after a reboot.

### 11. Create your admin account

```bash
docker compose run --rm migrate npm run admin:create -- --email you@example.edu --name "Your Name"
```

The password is printed once and stored nowhere, so save it straight away. To choose it yourself, add `-e ADMIN_PASSWORD=...` after `run` (12 to 128 characters). Running the command for an existing account promotes it to admin; `--reset-password` issues it a new password. See [Administration](./administration.md).

### 12. Load data

The reference data (ontology terms, marker proteins, imaging methods, fluorophores and their spectra) is already in place: `migrate` loads it on every start. What else to load depends on what the instance is for.

**A real instance.** Optionally import the IBEX knowledge base, 104 experiments with 1,277 published antibody validation reports from the IBEX Imaging Community (CC BY 4.0). It makes no network calls, deletes nothing and is safe to run again:

```bash
docker compose run --rm migrate npm run ibex:import
```

Everything else comes from your users.

**A demo or test instance.** To fill it with the fictional sample data used in development (researchers, labs, antibodies, experiments, reports, panels), the PathoPlex inventory and IBEX:

```bash
docker compose run --rm -e SEED_ALLOW_RESET=1 migrate npm run seed:demo
docker compose run --rm migrate npm run pathoplex:seed
docker compose run --rm migrate npm run ibex:import
docker compose run --rm migrate npm run admin:create -- --email you@example.edu --name "Your Name"
```

`seed:demo` **deletes every row in the database**, including your admin account, which is why the last command creates it again with a new password. Never run it on an instance with real data. Skip `seed:demo-user` on a server: it creates an admin with a publicly known password. More in [Data](./data.md#demo-data).

### 13. Check everything

```bash
docker compose ps
```

All services should be running except `migrate`, which has exited. Only `panelmaker-caddy` lists ports: `0.0.0.0:80` and `0.0.0.0:443`.

From another machine:

```bash
curl -I https://panelmaker.example.edu                 # 401: the basic auth gate works
curl https://panelmaker.example.edu/api/health         # succeeds without a password
nc -zv -w3 panelmaker.example.edu 5432                 # must fail: the database is not reachable
nc -zv -w3 panelmaker.example.edu 3000                 # must fail: the app is only reachable through Caddy
```

In the browser, open `https://panelmaker.example.edu`, pass the basic auth prompt, and sign in at `/signin` with your admin account. The admin area is at `/admin`.

Finally, look at `/docs/legal/notice`, `/docs/legal/privacy` and `/docs/legal/terms`. They are templates filled in from the `INSTANCE_*` values. To replace them with your institution's own texts, see [Legal pages and branding](./legal-and-branding.md).

## Running the instance

All commands run as `panelmaker` in `~/panelmaker`.

| Task                            | Command                                                          |
| ------------------------------- | ---------------------------------------------------------------- |
| Update to a new version         | `git pull && docker compose up -d --build` (small servers: build one image at a time, see step 10) |
| Follow the logs                 | `docker compose logs -f app`                                     |
| Change or remove the basic auth | Edit `BASIC_AUTH_*` in `.env`, then `docker compose up -d caddy` |
| Run any maintenance script      | `docker compose run --rm migrate npm run <script> [-- <args>]`   |
| Stop everything                 | `docker compose down` (keeps all data)                           |

Read [Upgrading](./upgrading.md) before updating across versions with breaking changes. The maintenance scripts are listed in [Data](./data.md#scripts).

### The basic auth gate

The gate is on when both `BASIC_AUTH_USER` and `BASIC_AUTH_PASSWORD` are set and off when both are empty. Setting only one, or a user name with characters other than letters, digits, `.`, `_` and `-`, makes Caddy refuse to start. `/api/health` always stays open for monitoring.

- It sits in front of the normal PanelMaker sign-in and does not replace it. Anyone past the gate can still sign up for an account, so while the gate is on, only people you give the password to can.
- It also applies to the public API, so API clients need the same credentials.
- Only use it with HTTPS: basic auth sends the password with every request.

To open the instance to everyone, empty both values and run `docker compose up -d caddy`. If search engines should list it, also set `INSTANCE_ALLOW_INDEXING="true"`.

### Backups

State lives in two Docker volumes, `postgres_data` (the database) and `uploads_data` (report images). Back up both, together with `.env` and `config/`. Without the same `ENCRYPTION_KEY`, stored user and lab API keys cannot be decrypted after a restore.

```bash
docker compose exec -T postgres pg_dump -U panelmaker -d panelmaker -Fc > panelmaker-$(date +%F).dump
docker compose cp app:/app/data/uploads ./uploads-$(date +%F)
```

Restore into a running stack:

```bash
docker compose exec -T postgres pg_restore -U panelmaker -d panelmaker --clean --if-exists < panelmaker-2026-09-30.dump
docker compose cp ./uploads-2026-09-30/. app:/app/data/uploads
docker compose exec -u root app chown -R node:node /app/data/uploads
```

Use your own `POSTGRES_USER` and `POSTGRES_DB` if you changed them. `docker compose down -v` deletes both volumes, including every report image; plain `docker compose down` keeps them. Keep the `caddy_data` volume too: it holds the certificates, and without it every restart requests new ones and runs into Let's Encrypt rate limits.

## How the stack fits together

| Service    | Role                                                                                                                          |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `postgres` | Database, in the `postgres_data` volume. No published port, only on the internal `database` network.                          |
| `migrate`  | One-shot job on every `up`: `prisma migrate deploy`, then `npm run setup`. Also the container for maintenance scripts.        |
| `app`      | The Next.js server. Uploads in the `uploads_data` volume. No published port.                                                  |
| `caddy`    | Reverse proxy and the only service with published ports. Obtains certificates, applies the basic auth gate, streams the chat. |

Every request, including `/uploads/...`, goes through the app. Report images can belong to private or lab experiments, and only the app can check who may see them.

HTTPS is required for anything other than localhost. For any other host the app sends `Strict-Transport-Security` and a Content Security Policy with `upgrade-insecure-requests`, so opening an instance over plain HTTP on a server hostname or IP address does not work.

## Other setups

### Trial on your own machine

Set only `AUTH_SECRET`, `POSTGRES_PASSWORD` and `NEXT_PUBLIC_BASE_URL="http://localhost:8080"`, leave `SITE_ADDRESS` at `:80`, then run steps 10 and 11. Open `http://localhost:8080`.

### Behind an institutional proxy or load balancer

When another proxy terminates TLS, keep `SITE_ADDRESS=":80"` so Caddy serves plain HTTP on `HTTP_PORT` (default 8080), and point the proxy at it. `NEXT_PUBLIC_BASE_URL` is still the `https://` URL visitors use.

- If the proxy runs on the same host, set `PROXY_BIND="127.0.0.1"` so nothing else can reach Caddy.
- Pass the original `Host` header. Caddy keeps `X-Forwarded-*` headers from proxies on private networks.
- Allow request bodies of at least 80 MB, the largest accepted image upload.
- Do not buffer responses on `/api/chat`, which streams.

### Without Docker

You need Node.js at the version in [`.nvmrc`](../../.nvmrc), npm, and PostgreSQL.

```bash
git clone https://github.com/complextissue/panelmaker.git
cd panelmaker
nvm use
npm ci
cp .env.local.example .env
```

In `.env`, besides the required values, set:

- `DATABASE_URL` pointing at your database
- `NODE_ENV=production`, so `npm run seed:demo` refuses to wipe this database
- `UPLOADS_DIR` on persistent storage writable by the app user
- `AUTH_URL=https://<your host>/auth` and `AUTH_TRUST_HOST=true`
- `INSTANCE_CONFIG_DIR` if the legal overrides are not in `./config`

Then:

```bash
npx prisma migrate deploy
npm run setup
npm run build
npm run admin:create -- --email you@example.edu --name "Your Name"
npm run start
```

`npm run build` needs the migrated database, because Next.js prefills cached pages during the build. `npm run start` listens on port 3000 (`PORT` changes it). Run it under a process manager such as systemd, behind a TLS proxy configured as in [the previous section](#behind-an-institutional-proxy-or-load-balancer). The proxy must forward `/uploads/` to the app like any other path.
