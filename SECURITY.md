# Security Policy

This policy covers the PanelMaker software in this repository. Each PanelMaker instance is run by its own operator, who is responsible for that deployment. If you found a problem with a specific instance (an exposed server, leaked data, a misconfiguration), contact that instance's operator; their details are on the instance's legal notice page (`/legal/notice`).

## Supported versions

Security fixes go into the `main` branch. Instances should track `main` and upgrade when a fix is released.

## Reporting a vulnerability

Do not report vulnerabilities in public issues, discussions or pull requests.

Use GitHub's private vulnerability reporting: open the [Security tab](https://github.com/complextissue/panelmaker/security) of the repository and choose "Report a vulnerability", or go directly to [the new advisory form](https://github.com/complextissue/panelmaker/security/advisories/new).

Please include:

- a description of the problem and what an attacker could do with it
- steps to reproduce, or a proof of concept
- the affected components and, if known, the commit or version
- any suggested fix

We aim to acknowledge reports within a few working days, keep you updated while we work on a fix, and credit you in the advisory if you want to be named. Please give us reasonable time to release a fix before disclosing the issue publicly.

Low-risk hardening suggestions that do not expose a vulnerability can go into a regular issue using the security issue template.

## For instance operators

Running an instance makes you responsible for its security and for the data your users store in it. At a minimum:

- **Secrets.** Generate `AUTH_SECRET`, `ENCRYPTION_KEY` and `POSTGRES_PASSWORD` with `openssl rand -hex 32` or similar. Never reuse the example or test values. Keep `.env` readable only by the account that runs the stack, and out of version control.
- **`AUTH_SECRET`.** Anyone who has it can forge sessions. Changing it signs every user out, so rotate it if it may have leaked.
- **`ENCRYPTION_KEY`.** Protects the AI provider keys that users and labs store. Back it up with the database; changing it makes all stored keys unreadable. See [the AI assistant guide](docs/self-hosting/ai-assistant.md#encryption_key).
- **TLS.** Serve the instance over HTTPS only. The bundled Caddy either obtains a certificate itself (`SITE_ADDRESS` set to your hostname) or serves plain HTTP behind another TLS-terminating proxy. Only Caddy publishes ports; the app and the database are never exposed. See [Deployment](docs/self-hosting/deployment.md#https-and-the-caddy-proxy).
- **Accounts.** Sign-up is open to anyone who can reach the instance. Restrict network access or use the basic auth gate if the instance should be internal. Keep the number of admin accounts small.
- **Backups.** Back up the Postgres volume, the uploads volume, `.env` and `config/` regularly, and test a restore. See [Backups](docs/self-hosting/deployment.md#backups).
- **Updates.** Watch the repository's security advisories and releases, and upgrade promptly. Keep the host, Docker and base images updated. See [Upgrading](docs/self-hosting/upgrading.md).
- **Instance AI keys.** They are billed to you. Set a spending limit with the provider and an `AI_INSTANCE_DAILY_LIMIT`.
- **Legal and privacy.** Configure the operator details and legal pages for your jurisdiction. See [Legal pages and branding](docs/self-hosting/legal-and-branding.md).

## Security measures in the software

- Auth.js v5 sessions in HTTP-only cookies; passwords hashed with bcrypt
- Role checks for admin routes and lab roles for lab resources; blocked accounts lose access on their next request
- Private, lab and public visibility enforced on every read, including uploaded images, which are only served through the app
- Input validation with Zod on API routes, and Prisma queries without string-built SQL
- Sanitized Markdown and HTML rendering
- User and lab API keys encrypted at rest with AES-256-GCM
- Rate limits on report submission, panel creation, uploads, lab actions and instance-key AI usage
- Security headers including a Content Security Policy and, in production, HSTS

## Guidelines for contributors

- Validate all input with Zod and check authentication and authorization in every route that needs it.
- Use the visibility helpers in `models/lab/visibility.ts` for any query that can return private or lab data.
- Do not expose internal error details in responses.
- Never commit secrets. Run `npm audit` when you add or update dependencies, and add dependencies only when needed.
