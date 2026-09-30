# Self-hosting PanelMaker

PanelMaker is self-hosted. A research group or institution deploys its own copy, called an instance, with its own users, labs, panels, validation reports and antibody inventory. Instances do not talk to each other or to any central PanelMaker service.

These pages are for the people who deploy and run an instance.

| Page                                                | What it covers                                                                                  |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [Deployment](./deployment.md)                       | Step-by-step server setup (firewall, user, HTTPS, first admin), day-to-day operation, backups, other setups |
| [Configuration](./configuration.md)                 | Every environment variable, grouped, with defaults                                              |
| [Legal pages and branding](./legal-and-branding.md) | Instance name, operator identity, legal page overrides, search engine indexing                  |
| [AI assistant](./ai-assistant.md)                   | Provider keys, key precedence, daily limits, `ENCRYPTION_KEY`                                   |
| [Data](./data.md)                                   | Reference data, demo data, optional imports, and the external services the server contacts      |
| [Upgrading](./upgrading.md)                         | Pulling a new version, migrations, renamed and removed settings                                 |
| [Administration](./administration.md)               | Admin accounts, blocking users, the report review queue, labs, statistics                       |

## Getting started

[Deployment](./deployment.md) walks through a complete production setup on one Linux server in 13 steps, from the firewall to the first admin account. You need a server with Docker, at least 4 GB of RAM (or swap) and a domain name.

To try PanelMaker on your own machine first:

```bash
git clone https://github.com/complextissue/panelmaker.git
cd panelmaker
cp .env.local.example .env
# in .env: AUTH_SECRET and POSTGRES_PASSWORD (openssl rand -hex 32), NEXT_PUBLIC_BASE_URL="http://localhost:8080"
docker compose up -d --build
docker compose run --rm migrate npm run admin:create -- --email you@example.edu --name "Your Name"
```

Then open `http://localhost:8080`.

## Getting help

Open an issue or a discussion on [GitHub](https://github.com/complextissue/panelmaker). Report security problems privately, as described in [SECURITY.md](../../SECURITY.md).
