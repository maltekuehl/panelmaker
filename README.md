# PanelMaker

PanelMaker is a community-driven platform for antibody panel design in spatial proteomics. It helps researchers design, validate, and share antibody panels for multiplexed imaging experiments. Built with Next.js and Auth.js, the platform features an ontology-backed interface and AI-assisted panel design recommendations.

## Publication

PanelMaker grew out of BioContextAI. Our Nature Biotechnology correspondence is here: [https://www.nature.com/articles/s41587-025-02900-9](https://www.nature.com/articles/s41587-025-02900-9).

If our work is useful to your research, please cite it as below.

```bibtex
@article{BioContext_AI_Kuehl_Schaub_2025,
  title={BioContextAI is a community hub for agentic biomedical systems},
  url={http://dx.doi.org/10.1038/s41587-025-02900-9},
  urldate = {2025-11-06},
  doi={10.1038/s41587-025-02900-9},
  journal={Nature Biotechnology},
  publisher={Springer Science and Business Media LLC},
  author={Kuehl, Malte and Schaub, Darius P. and Carli, Francesco and Heumos, Lukas and Hellmig, Malte and Fernández-Zapata, Camila and Kaiser, Nico and Schaul, Jonathan and Kulaga, Anton and Usanov, Nikolay and Koutrouli, Mikaela and Ergen, Can and Palla, Giovanni and Krebs, Christian F. and Panzer, Ulf and Bonn, Stefan and Lobentanzer, Sebastian and Saez-Rodriguez, Julio and Puelles, Victor G.},
  year={2025},
  month=nov,
  language={en},
}
```

## Getting Started

### Prerequisites

- Node.js 24+ (run `nvm use` to activate the version in `.nvmrc`)
- npm
- PostgreSQL 14+ (or Docker, see the docker section below)

### 1. Clone and install

```bash
git clone https://github.com/complextissue/panelmaker.git
cd website
nvm use
npm install
```

### 2. Configure environment

Copy the example environment file:

```bash
cp .env.local.example .env
```

Required variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SHADOW_DATABASE_URL` | A separate, disposable database that `prisma migrate dev` may drop and recreate |
| `NEXT_PUBLIC_BASE_URL` | Public URL of this deployment |
| `AUTH_SECRET` | Auth.js secret, 32+ characters. Generate with `openssl rand -hex 32` |

Optional: `GEMINI_API_KEY` (the shared server-side key for the AI chat; without it users must add their own in settings), `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET`, `AUTH_LINKEDIN_ID` and `AUTH_LINKEDIN_SECRET` (OAuth sign-in, email and password works without them), `ENCRYPTION_KEY` (required before users can save their own provider API keys), `SCICRUNCH_API_KEY` (richer antibody search), `UPLOADS_DIR` (image storage directory, default `./data/uploads`).

### 3. Set up the database

PanelMaker uses PostgreSQL via Prisma with the `@prisma/adapter-pg` driver adapter.

```bash
# Apply all migrations
npx prisma migrate dev

# Seed the database with demo data
npx prisma db seed
```

The seed script (`prisma/seed.ts`) populates the database with demo researchers and labs, proteins, Cell Ontology cell types, UBERON tissues, antibodies with RRIDs, experimental reports across CODEX, CyCIF, IMC, MIBI and IBEX, and two complete panels with cycles and fluorophore assignments. The real PathoPlex antibody inventory is seeded separately with `npm run pathoplex:seed`.

The seed performs a full database reset before inserting. It deletes every row, so never point it at a database whose contents matter:

```bash
# Everything in order: core seed, demo login, PathoPlex, IBEX, FPbase spectra
npm run seed:all
```

`seed:all` chains five steps, each of which can also be run on its own:

| Step | What it adds |
|------|--------------|
| `npx prisma db seed` | Resets the database, then the demo users, labs, ontology terms, antibodies, reports and panels |
| `npm run seed:demo-user` | The `demo@panelmaker.local` admin login, written to `DEMO_CREDENTIALS.txt` |
| `npm run pathoplex:seed` | The real PathoPlex antibody inventory and the two kidney experiments from the Nature paper |
| `npm run ibex:import` | The IBEX Imaging Community knowledge base, about 950 validated reagent records |
| `npm run fpbase:sync` | Excitation and emission spectra from FPbase, used for panel overlap checks |

Only the first step is destructive. The others upsert and are safe to re-run.

### 4. Start the application

```bash
# Development (with hot reload)
npm run dev

# Production
npm run build
npm run start
```

### 5. Explore the data

```bash
# Open Prisma Studio (visual database browser)
npx prisma studio
```

## Features

- **Browse validated markers and antibodies** - search and filter by species, cell type, tissue, and method
- **Design antibody panels** - build custom panels with fluorophore compatibility checking and cycle management
- **Export panels** - download panel CSV, order list CSV (for procurement), or JSON
- **Submit experimental validation reports** - contribute your panel validation data with ontology-backed forms
- **AI-assisted recommendations** - get panel design suggestions via an interactive chat assistant with tool visualizations
- **Public API** - read-only JSON endpoints under `/api/` for proteins, antibodies, cell types, reports and public panels
- **Ontology-backed search** - cell types from Cell Ontology (CL), tissues from UBERON, proteins from UniProt

## Architecture

```
app/                    # Next.js App Router pages and API routes
  (auth)/               # Authentication pages
  (content)/            # Public content pages (browse, marker, antibody, cell type detail)
  api/                  # API routes (panels, proteins, antibodies, cell-types, reports, chat)
  docs/                 # Documentation pages (MDX)
  panel/                # Panel designer page
components/             # React components
  panel/                # Panel workspace, marker cards, cycle sections
  chat/                 # AI chat UI and tool result cards
  browse/               # Browse tables and columns
  ui/                   # shadcn/ui primitives
models/                 # Data access layer (one folder per entity)
  protein/              # queries.ts, transforms.ts, schema.ts, index.ts
  antibody/ cell-type/ cellular-component/ experiment/ experimental-report/
  fluorophore/ taxon/ tissue/ user/     # same structure
  chat/                 # conversations, messages, encrypted provider credentials
  evidence/             # viewer-scoped report search and aggregation for the AI tools
  lab/                  # queries.ts, access.ts, visibility.ts, transforms.ts, schema.ts, index.ts
  panel/                # queries.ts, transforms.ts, schema.ts, intelligence.ts, index.ts
lib/                    # Cross-cutting infrastructure
  integrations/         # External API clients (antibody-registry, uniprot, hpa, ensembl)
  auth.ts               # Auth.js configuration
  chat.ts               # AI chat system prompt and configuration
  chat-tools.ts         # AI tool definitions (searchMarkers, suggestPanel, etc.)
  ontology.ts           # OLS4 API client for CL, UBERON, GO CC, DOID and ROR lookups
  storage.ts            # Local image storage (sharp, WebP conversion)
  prisma.ts             # Prisma client singleton
  rate-limiting.ts      # Rate limit configuration
prisma/
  schema.prisma         # Database schema (PostgreSQL)
  data/                 # Static seed data modules
  seed.ts               # Database seeding script
  migrations/           # Prisma migration files
stores/                 # Zustand stores (client-side state)
tests/                  # Playwright E2E tests
```

## Database

### Schema overview

The Prisma schema (`prisma/schema.prisma`) models the spatial proteomics domain:

- **Protein** - UniProt proteins with gene symbol and Ensembl ID
- **CellType** - Cell Ontology terms with parent hierarchy
- **Tissue** - UBERON tissue terms, plus **CellularComponent** (GO CC) and **Taxon** (NCBI taxonomy)
- **Antibody** - commercial antibodies with RRID, vendor, clone, conjugate
- **ExperimentalReport** - validated antibody usage in specific methods/tissues
- **Panel / PanelCycle / PanelMarker** - user-designed antibody panels with cycle management
- **CellTypeMarker** - canonical marker associations between cell types and proteins
- **Lab / LabMembership / LabInvitation / LabAntibody** - teams, roles, invitations and per-lab antibody inventory
- **Fluorophore** - normalised fluorophore table anchored on FPbase

### Migrations

```bash
# Check migration status
npx prisma migrate status

# Create a new migration (review SQL before applying)
npx prisma migrate dev --create-only --name descriptive_name

# Apply pending migrations
npx prisma migrate dev

# Production deployment (never use migrate dev in production)
npx prisma migrate deploy
```

## Testing

Playwright E2E tests live in `tests/`.

```bash
# Unit assertions (no server or database needed)
npm run test:unit

# Build and start the test server
npm run build:test
npm run start:test

# Run all end-to-end tests
npm test

# Interactive UI mode
npm run test:ui

# Debug mode (step through tests)
npm run test:debug

# View test report
npm run test:report
```

## Development

```bash
# Lint (Prettier + ESLint)
npm run lint

# Type check
npx tsc --noEmit
```

Pre-commit hooks (via Husky + lint-staged) automatically run Prettier and ESLint on staged files.

## Acknowledgements

Partly based on the Auth.js Next.js example (licensed under the [ISC License](https://github.com/nextauthjs/next-auth/blob/main/LICENSE)).

## License

Apache 2.0
