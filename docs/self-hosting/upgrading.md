# Upgrading

## Routine upgrade (Docker)

1. Back up the database and uploads. See [Deployment](./deployment.md#backups).
2. Pull the new version:

   ```bash
   git pull
   ```

3. Compare your `.env` with `.env.local.example` and read the notes below for renamed or removed settings.
4. Rebuild and restart:

   ```bash
   docker compose up -d --build
   ```

The `migrate` service applies new database migrations with `prisma migrate deploy` and then runs `npm run setup` to update the reference data. The app only starts after both succeed. If `migrate` fails, check `docker compose logs migrate`, fix the cause and run `docker compose up -d` again.

## Routine upgrade (bare metal)

```bash
git pull
nvm use
npm ci
npx prisma migrate deploy
npm run setup
npm run build
```

Then restart the `npm run start` process.

## Migration baseline (`0_init`)

All earlier migrations were squashed into a single baseline, `prisma/migrations/0_init`, before the first release. A database created from the older migration history cannot be upgraded in place: `prisma migrate deploy` will try to apply `0_init` on top of the existing tables and fail.

PanelMaker had no production deployments at that point, so the supported path is to start with a fresh database:

- Docker: stop the stack, remove the Postgres volume, start again.

  ```bash
  docker compose down
  docker volume ls | grep postgres_data
  docker volume rm <project>_postgres_data
  docker compose up -d --build
  ```

  Then create the admin again with `admin:create`. The uploads volume can stay, but images of deleted reports will be orphaned.

- Local development: `npx prisma migrate reset` (drops the database and reapplies the migrations), then `npm run seed:all` for the demo data, or `npm run setup` for reference data only.

## Renamed and removed settings

| Old                                                | Now                                                                                                                                                         |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GEMINI_API_KEY`                                   | Renamed to `GOOGLE_GENERATIVE_AI_API_KEY`. The old name is ignored.                                                                                         |
| Free community or shared AI key                    | Removed. Instance keys are optional and billed to the operator, users and labs can add their own. See [AI assistant](./ai-assistant.md).                    |
| `AUTH_LINKEDIN_ID`, `AUTH_LINKEDIN_SECRET`         | Removed along with LinkedIn sign-in. Delete them. Accounts that only signed in with LinkedIn have no password and can no longer sign in.                    |
| `BASIC_AUTH_USER`, `BASIC_AUTH_PASSWORD` defaults  | The compose file used to turn the nginx basic auth gate on with `panelmaker` / `panelmaker` when these were unset. The gate is now off unless you set both. |
| nginx proxy, `NGINX_PORT`, `NGINX_BIND`            | Replaced by Caddy. Use `HTTP_PORT` and `PROXY_BIND` instead, and see `SITE_ADDRESS` for automatic HTTPS. Run `docker compose up -d --remove-orphans` once to remove the old `panelmaker-nginx` container. |
| `POSTGRES_PASSWORD` default                        | The production compose file no longer falls back to `panelmaker`. Set the password the volume was created with, or compose refuses to start.               |
| `CRON_SECRET`                                      | Not read by anything. Delete it.                                                                                                                            |
| `prisma/seed.ts`, destructive `npx prisma db seed` | Replaced. `npx prisma db seed` now runs the non-destructive `npm run setup`. The destructive demo seed is `npm run seed:demo` (`prisma/seed-demo.ts`).      |

New settings worth reviewing: the `INSTANCE_*` variables ([Legal pages and branding](./legal-and-branding.md)), `AI_DEFAULT_MODEL`, `AI_INSTANCE_DAILY_LIMIT`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` ([Configuration](./configuration.md)).

## Removed features

- **Blog.** Removed, along with its pages and API routes.
- **Team and roadmap pages.** Replaced by `/docs/about`.
- **Cookie banner.** The app only sets strictly necessary cookies, so no consent banner is shown.
- **Submission access requests.** Any signed-in, non-blocked user can now submit reports and create labs. Public reports still wait for admin approval. See [Administration](./administration.md#report-review).
