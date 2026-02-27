# PanelMaker

PanelMaker is a community-driven platform for antibody panel design in spatial proteomics. It helps researchers design, validate, and share antibody panels for multiplexed imaging experiments. Built with Next.js and Auth.js, the platform features an ontology-backed interface and AI-assisted panel design recommendations.

## Publication

You can find our Nature Biotechnology correspondence here: [https://www.nature.com/articles/s41587-025-02900-9](https://www.nature.com/articles/s41587-025-02900-9).

If our work is useful to your research, please cite it as below.

```bibtex
@article{BioContext_AI_Kuehl_Schaub_2025,
  title={PanelMaker is a community hub for agentic biomedical systems},
  url={http://dx.doi.org/10.1038/s41587-025-02900-9},
  urldate = {2025-11-06},
  doi={10.1038/s41587-025-02900-9},
  year = {2025},
  month = nov,
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

- Node.js 20+ (use `nvm use` to activate the correct version)
- npm

### 1. Clone and install

```bash
git clone https://github.com/panelmaker-ai/website.git
cd website
nvm use
npm install
```

### 2. Configure environment

Copy the example environment file:

```bash
cp .env.local.example .env.local
```

Required variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | SQLite path, defaults to `file:./dev.db` |
| `AUTH_SECRET` | Auth.js secret (32+ characters) |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub OAuth credentials |
| `AUTH_LINKEDIN_ID` / `AUTH_LINKEDIN_SECRET` | LinkedIn OAuth credentials |
| `GEMINI_API_KEY` | Google Gemini API key (AI chat features) |
| `CRON_SECRET` | Secret for cron job authentication |

Optional variables for image uploads: `R2_BUCKET`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_URL`.

### 3. Set up the database

PanelMaker uses SQLite via Prisma. No external database server needed.

```bash
# Apply all migrations (creates prisma/dev.db automatically)
npx prisma migrate dev

# Seed the database with demo data
npx prisma db seed
```

The seed script (`prisma/seed.ts`) populates the database with:

- **11 users** &mdash; researchers from institutions like Stanford, Harvard, UCSF, and Complex Tissue Lab (RWTH Aachen)
- **21 proteins** &mdash; common immune and structural markers (CD3, CD4, CD8, FoxP3, Ki67, Pan-CK, etc.)
- **15 cell types** &mdash; from Cell Ontology (T cells, B cells, macrophages, dendritic cells, etc.)
- **5 anatomical structures** &mdash; from UBERON (spleen, lymph node, kidney, tonsil, colon)
- **25 cell type&ndash;marker associations** &mdash; canonical and non-canonical markers per cell type
- **25 antibodies** &mdash; with RRID, vendor, clone, catalog number, and conjugate data (BioLegend, Abcam, Cell Signaling, BD, Thermo Fisher)
- **46 experimental reports** &mdash; validated across CODEX, CyCIF, IMC, MIBI, IBEX, IF, and IHC methods
- **2 panels** &mdash; complete panels with cycles, markers, and fluorophore assignments

The seed performs a full database reset before inserting, so it is safe to re-run at any time:

```bash
# Re-seed from scratch (deletes all data first)
npx prisma db seed
```

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

- **Browse validated markers and antibodies** &mdash; search and filter by species, cell type, tissue, and method
- **Design antibody panels** &mdash; build custom panels with fluorophore compatibility checking and cycle management
- **Export panels** &mdash; download panel CSV, order list CSV (for procurement), or JSON
- **Submit experimental validation reports** &mdash; contribute your panel validation data with ontology-backed forms
- **AI-assisted recommendations** &mdash; get panel design suggestions via an interactive chat assistant with tool visualizations
- **Public API** &mdash; programmatic access to all validated data at `/api/v1/`
- **Ontology-backed search** &mdash; cell types from Cell Ontology (CL), tissues from UBERON, proteins from UniProt

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
  antibody/             # queries.ts, transforms.ts, schema.ts, index.ts
  cell-type/            # queries.ts, transforms.ts, schema.ts, index.ts
  experimental-report/  # queries.ts, transforms.ts, schema.ts, index.ts
  panel/                # queries.ts, transforms.ts, schema.ts, intelligence.ts, index.ts
  structure/            # queries.ts, index.ts
lib/                    # Cross-cutting infrastructure
  integrations/         # External API clients (antibody-registry, uniprot, hpa, ensembl)
  auth.ts               # Auth.js configuration
  chat.ts               # AI chat system prompt and configuration
  chat-tools.ts         # AI tool definitions (searchMarkers, suggestPanel, etc.)
  ontology.ts           # OLS4 API client for CL/UBERON/GO_CC lookups
  prisma.ts             # Prisma client singleton
  rate-limiting.ts      # Rate limit configuration
prisma/
  schema.prisma         # Database schema (SQLite)
  seed.ts               # Database seeding script
  migrations/           # Prisma migration files
stores/                 # Zustand stores (client-side state)
tests/                  # Playwright E2E tests
```

## Database

### Schema overview

The Prisma schema (`prisma/schema.prisma`) models the spatial proteomics domain:

- **Protein** &mdash; UniProt proteins with gene symbol and Ensembl ID
- **CellType** &mdash; Cell Ontology terms with parent hierarchy
- **AnatomicalStructure** &mdash; UBERON tissue terms
- **Antibody** &mdash; commercial antibodies with RRID, vendor, clone, conjugate
- **ExperimentalReport** &mdash; validated antibody usage in specific methods/tissues
- **Panel / PanelCycle / PanelMarker** &mdash; user-designed antibody panels with cycle management
- **CellTypeMarker** &mdash; canonical marker associations between cell types and proteins

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
# Build and start the test server
npm run build:test
npm run start:test

# Run all tests
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
