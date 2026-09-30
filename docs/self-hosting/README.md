# Self-hosting PanelMaker

PanelMaker is self-hosted. A research group or institution deploys its own copy, called an instance, with its own users, labs, panels, validation reports and antibody inventory. Instances do not talk to each other or to any central PanelMaker service.

These pages are for the people who deploy and run an instance.

| Page                                                | What it covers                                                                                  |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [Deployment](./deployment.md)                       | Docker Compose production stack, TLS, first admin, basic auth gate, backups, bare-metal install |
| [Configuration](./configuration.md)                 | Every environment variable, grouped, with defaults                                              |
| [Legal pages and branding](./legal-and-branding.md) | Instance name, operator identity, legal page overrides, search engine indexing                  |
| [AI assistant](./ai-assistant.md)                   | Provider keys, key precedence, daily limits, `ENCRYPTION_KEY`                                   |
| [Data](./data.md)                                   | Reference data, demo data, optional imports, and the external services the server contacts      |
| [Upgrading](./upgrading.md)                         | Pulling a new version, migrations, renamed and removed settings                                 |
| [Administration](./administration.md)               | Admin accounts, blocking users, the report review queue, labs, statistics                       |

## Minimum requirements

- Docker with the Compose plugin, or Node.js (version in [`.nvmrc`](../../.nvmrc)) plus PostgreSQL for a bare-metal install
- A hostname (Caddy obtains the TLS certificate) or an existing TLS proxy, since production builds expect HTTPS (see [Deployment](./deployment.md#https-and-the-caddy-proxy))
- Outbound HTTPS to a few public services for ontology and antibody lookups (see [Data](./data.md#outbound-network-access))

## Shortest path

```bash
git clone https://github.com/complextissue/panelmaker.git
cd panelmaker
cp .env.local.example .env
# edit .env: NEXT_PUBLIC_BASE_URL, AUTH_SECRET, POSTGRES_PASSWORD, INSTANCE_*
docker compose up -d --build
docker compose run --rm migrate npm run admin:create -- --email you@example.edu --name "Your Name"
```

[Deployment](./deployment.md) explains each step.

## Getting help

Open an issue or a discussion on [GitHub](https://github.com/complextissue/panelmaker). Report security problems privately, as described in [SECURITY.md](../../SECURITY.md).
