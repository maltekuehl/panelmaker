# Architecture

## Stack

- Next.js 16 App Router with `cacheComponents` enabled, React 19, TypeScript in strict mode
- PostgreSQL through Prisma 7 and the `@prisma/adapter-pg` driver adapter (`lib/prisma.ts`)
- Auth.js v5 with JWT sessions, email and password plus optional GitHub OAuth (`auth.ts`, mounted at `/auth`)
- Vercel AI SDK v7 with the Google, OpenAI and Anthropic providers for the assistant
- shadcn/ui on Radix, Tailwind CSS, `lucide-react` icons
- Zustand for the little global client state there is (`stores/panels.ts`)
- Playwright for end-to-end tests, plain `tsx` scripts for unit tests

## Directory layout

```
app/                    Next.js App Router
  (auth)/               sign-in and sign-up
  (content)/            browse, marker, antibody, celltype, condition, experiment, report, profile, submit, leaderboard
  admin/                user management, report review, statistics
  api/                  route handlers (public read API, mutations, chat, admin)
  chat/                 full-page assistant
  docs/                 in-app user documentation (MDX) and the legal pages at docs/legal/[document]
  labs/, lab/           lab pages and invitation links
  panel/                panel designer
  settings/             account settings, AI keys, data export
  uploads/[...path]/    serves uploaded images after a visibility check
components/             React components, grouped by feature; components/ui/ holds shadcn primitives
models/<entity>/        data layer: queries.ts (server-only Prisma), transforms.ts, schema.ts (Zod), index.ts
lib/                    cross-cutting infrastructure: auth, env, storage, rate limiting, ontology, instance config
  ai/                   model catalog, instance key config, key verification, credential route helpers
  integrations/         external API clients: SciCrunch and the Antibody Registry, UniProt, FPbase
prisma/
  schema.prisma         database schema
  migrations/           0_init baseline and later migrations
  reference.ts          reference data loader used by scripts/setup.ts and seed-demo.ts
  seed-demo.ts          destructive demo seed
  data/                 static data: ontology terms, proteins, fluorophores, demo users and labs, IBEX tables
scripts/                operator and maintenance scripts (setup, admin:create, imports, syncs)
config/                 operator overrides for the legal pages (examples only in git)
docker/caddy/           Caddyfile and the entrypoint that writes the basic auth gate
tests/                  Playwright specs; tests/unit/ for tsx unit tests
```

## Data model

The main models in `prisma/schema.prisma`:

- **Reference terms**: `Taxon`, `Tissue`, `CellType`, `CellularComponent`, `DiseaseCondition`, `Fixative`, `DevelopmentalStage`, `ImagingMethod`, `Fluorophore`. Each stores the ontology or source id next to its label.
- **Markers and reagents**: `Protein` (UniProt), `CellTypeMarker`, `Antibody` (RRID, vendor, clone, host).
- **Validation data**: `Experiment` (species, tissue, method, specimen details, visibility) with `ExperimentalReport` rows (one per antibody, status `PENDING`, `PUBLISHED` or `REJECTED`), `ReportImage`, `ReportCellType`, `ReportImageCellType`.
- **Panels**: `Panel`, `PanelCycle`, `PanelMarker`.
- **Labs**: `Lab`, `LabMembership` (role `OWNER`, `ADMIN`, `MEMBER`, `VIEWER`), `LabInvitation`, `LabAntibody` (inventory), `ExperimentLabShare`, `PanelLabShare`.
- **Assistant**: `ChatConversation`, `ChatConversationMessage`, `ApiCredential` (encrypted user and lab keys), `ChatMessage` (usage telemetry).
- **Accounts**: `User`, plus the Auth.js tables `Account`, `Session`, `VerificationToken`, and `RateLimit`.

Primary keys are `cuid()` strings. Migrations start from the `0_init` baseline; create new ones with `npx prisma migrate dev --create-only --name <name>` and review the SQL before applying.

## Visibility and the two read lanes

Experiments and panels are `PRIVATE`, `LAB` (shared with one or more labs) or `PUBLIC`. Reports inherit the visibility of their experiment, and public reports also need admin approval.

`cacheComponents` does not allow `auth()` inside a `"use cache"` boundary, so reads run in two lanes:

- a cached public lane that never sees a viewer and only returns public, published data
- an uncached private lane (`getVisible*` functions) that takes a `ViewerContext` and adds the viewer's own and lab-shared data

The predicates live in `models/lab/access.ts` and `models/lab/visibility.ts`. Details in [lab-structure/access-control.md](./lab-structure/access-control.md).

## Uploads

`lib/storage.ts` converts uploaded PNG, JPEG, WebP and TIFF images to lossless WebP with sharp and writes them to `UPLOADS_DIR`. They are served only through `app/uploads/[...path]/route.ts`, which resolves the owning experiment and applies the visibility check.

## Instance configuration

`lib/instance.ts` reads the `INSTANCE_*` variables and builds the legal page templates. Overrides are read from `INSTANCE_CONFIG_DIR/legal/*.md`. `app/robots.ts` and `app/sitemap.ts` follow `INSTANCE_ALLOW_INDEXING`. Operator documentation is in [docs/self-hosting](../self-hosting/README.md).

## Assistant

`app/api/chat/route.ts` resolves the model and the key (user, then lab, then instance), applies the instance-key daily limit, streams the answer and persists the conversation. The tools in `lib/chat-tools.ts` are created per viewer and call the model query functions directly. Design notes: [chat-persistence.md](./chat-persistence.md).

## Tests

```bash
npm run test:unit     # tsx unit tests, no database needed
npm test              # Playwright end-to-end tests
npm run test:ui       # Playwright UI mode
```

`npm test` first runs `npm run seed:demo-user` (the `pretest` script). Playwright then builds and starts a test server with `npm run build:test && npm run start:test`, or reuses one already running on port 3000 outside CI. The tests use the database in `DATABASE_URL` from `.env` or the environment; `.env.test` does not set one, so point it at a development database seeded with `npm run seed:all`, never at a real instance.

CI (`.github/workflows/test.yaml`) runs lint, type check, unit tests, the test build and Playwright.
