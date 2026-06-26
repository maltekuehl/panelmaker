# Lab & Team Structure

Working docs for the lab/team feature: many-to-many lab membership with roles, invitations, per-resource visibility (private / lab / public), a per-lab antibody inventory, and lab-scoped AI assistant queries.

## What this adds

- **Labs** as first-class teams. Users belong to many labs; labs have many members.
- **Roles** per membership: `OWNER / ADMIN / MEMBER / VIEWER`.
- **Invitations** via shareable links (email field reserved for later).
- **Visibility** per experiment/panel: `PRIVATE` (owner), `LAB` (one or more labs), `PUBLIC`. Reports inherit from their experiment.
- **Antibody inventory** per lab (`LabAntibody`), joined to the global `Antibody` catalog.
- **AI** lab-scoped queries, e.g. "any T cell marker our lab stocks that a labmate used successfully on mouse tissue?"
- **Verified-access gate**: one unified `accessStatus` (VERIFIED) unlocks both report submission and lab creation; site admins grant it.

## Docs in this folder

- [data-model.md](./data-model.md) - Prisma schema delta, relations, cascade rules.
- [access-control.md](./access-control.md) - RBAC matrix, the two-lane visibility model, the visibility predicate.
- [decisions.md](./decisions.md) - locked decisions and the adversarial-review fixes folded in.
- [ai-queries.md](./ai-queries.md) - Phase 7 design: 20 target queries and the composable primitive toolkit.
- [TODO.md](./TODO.md) - living checkbox tracker, grouped by phase.

## Hard constraint to remember

Next 16 `cacheComponents` forbids calling `auth()` inside a `"use cache"` boundary. Visibility therefore runs in two lanes: a **cached public lane** (never sees a viewer, PUBLIC-only) and an **uncached private lane** (`getVisible*`, takes a `ViewerContext`). Never thread `auth()`/`resolveViewerContext` into a cached function.

## Status

All phases (1-8) are done and verified: schema/migrations, access control + RBAC, invitations, two-lane visibility cutover, the full lab UI, the per-lab antibody inventory, the submit-side import, the lab-overview panels tab, the AI lab-scoped query toolkit, and the Phase 8 cutover that dropped the transitional `isPublic` mirror (`visibility` is now the sole source of truth). The inventory has server-side pagination, search, sorting, and Status/Host/Clonality faceted filters; the AI assistant composes ~14 viewer-scoped primitives (see [ai-queries.md](./ai-queries.md)). The `/browse` Lab facet and the ROR institution picker are in. See [TODO.md](./TODO.md) for the full checklist.

## Local development

- Dev database is a Docker Postgres `panelmaker-postgres-dev` on port 5433. Start it with `docker compose -f docker-compose.dev.yml up -d postgres`. The named volume persists data across restarts.
- A local demo login: `npm run seed:demo-user` (script `scripts/create-demo-user.ts`) upserts `demo@panelmaker.local` (ADMIN + verified, owner of the seeded Puelles Lab at Aarhus University) and writes the password to the gitignored `DEMO_CREDENTIALS.txt`. Re-run it after a full `npx prisma db seed` (which resets the DB).
- Unit tests for the access layer: `npm run test:unit` (`tests/unit/lab-access.ts`). See [access-control.md](./access-control.md) for the build-enforced client-import rule.

## Approved plan

Full plan: `~/.claude/plans/see-this-email-i-fluffy-pearl.md`. Execution order: Phases 1-4 (foundation) -> review checkpoint -> Phases 5-8.
