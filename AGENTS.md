# Agentic guidelines

## Core Principles

**Read first, code second.** Always understand the existing file structure, patterns, and conventions before implementing changes. Find 2-3 similar components/features to identify established patterns.

**Plan before executing.** For non-trivial tasks:
1. Outline a brief conceptual checklist (3-7 bullets)
2. Identify architectural implications and trade-offs
3. When multiple viable approaches exist, ask the user
4. Implement step-by-step, validating as you go

**Maintain consistency.** Use existing libraries, utilities, and patterns. Avoid introducing new dependencies without clear justification.

**No comments by default.** Write self-explanatory code with clear naming and structure. Only add comments for complex algorithms or non-obvious business logic that cannot be made clearer through code alone.

Make liberal use of plan mode and subagents, to accomplish tasks with high-quality and faster.

---

## PanelMaker Architecture Decisions

These decisions are final. Do not reconsider without explicit user approval.

### Data Layer: Model Folder Pattern

All domain logic lives in `src/models/<entity>/` (not flat `src/lib/`). Current entities:

```
src/models/
  protein/
    queries.ts      -- import "server-only"; Prisma queries (getAll, getById, search, getForCellType)
    transforms.ts   -- Prisma return types to API/UI shapes
    schema.ts       -- Zod schemas for API input validation
    index.ts        -- Re-exports: types + query functions
  antibody/         -- same structure
  cell-type/        -- same structure
  chat/             -- conversations, messages, encrypted provider credentials
  evidence/         -- viewer-scoped report search and aggregation used by the AI tools
  experiment/
  experimental-report/
  fluorophore/
  image/            -- fields of view and their channels (shared select, viewer legend transform)
  imaging-method/   -- EFO spatial proteomics terms, plus local methods filed under an EFO term
  lab/
    queries.ts
    access.ts       -- pure role/permission predicates (type-only Prisma import)
    visibility.ts   -- pure visibility where-builders (type-only Prisma import)
    transforms.ts
    schema.ts
    index.ts
  panel/
    queries.ts
    transforms.ts
    schema.ts
    intelligence.ts -- Fluorophore overlap, host species cross-reactivity checks
    index.ts
  taxon/
  tissue/
  user/
```

`src/models/lab/access.ts` and `src/models/lab/visibility.ts` must stay pure: type-only Prisma imports, no `server-only`, no I/O. `tests/unit/lab-access.ts` enforces that, plus a guard that no `"use client"` file imports the server-only barrel.

Rules:
- `queries.ts` always starts with `import "server-only"` and imports `prisma` from `@/lib/prisma`
- `index.ts` re-exports everything public (types and query functions)
- Do not add domain logic to `src/lib/` — `src/lib/` is for cross-cutting infrastructure only

### Database: PostgreSQL via Prisma

```prisma
datasource db {
  provider = "postgresql"
}
```

- Connection via the `@prisma/adapter-pg` driver adapter (`PrismaPg`) in `src/lib/prisma.ts`
- `DATABASE_URL` is required. `SHADOW_DATABASE_URL` is optional and only used by `migrate dev`
- Migrations start from the single squashed baseline `prisma/migrations/0_init`
- Primary keys are `String @id @default(cuid())` — do NOT use `Int @default(autoincrement())` on any model (autoincrement sequences drift out of sync when rows are seeded with explicit ids, causing P2002 unique-constraint errors on insert)
- Native Postgres features are available: enums, `@db.VarChar()`/`@db.Text` annotations, `String[]` array fields
- Migrations: always `npx prisma migrate dev --create-only --name <name>`, then review SQL before applying

### Search: Prisma contains queries

Use Prisma `contains` mode for text search (maps to SQL `LIKE %term%`). Add `@@index` on searchable fields. Use `mode: "insensitive"` for case-insensitive matching (supported by PostgreSQL).

```typescript
await prisma.protein.findMany({
  where: {
    OR: [
      { label: { contains: query } },
      { geneSymbol: { contains: query } },
    ],
  },
})
```

### Image Storage: local disk

- Wrapper: `src/lib/storage.ts`, which exports `saveUploadedImage()`, `deleteUploadedImage()`, `getUploadsDir()`, `resolveUploadPath()`
- Upload route: `src/app/api/uploads/route.ts` (authenticated, rate-limited). Serving route: `src/app/uploads/[...path]/route.ts`
- Images are converted to lossless WebP with sharp on upload
- Constraints: `MAX_UPLOAD_BYTES` (80MB), PNG, JPEG, WebP and TIFF in, dimensions between `MIN_DIMENSION` and `MAX_DIMENSION`
- Env var: `UPLOADS_DIR` (default `./data/uploads`). Requests for `/uploads/*` always go through the app route, never straight from disk, because report images can belong to PRIVATE or LAB experiments and only the app can apply the visibility check.

### Ontology Lookups

- Cell Ontology (CL) and UBERON: OLS4 REST API at `https://www.ebi.ac.uk/ols4/api`
- Species/taxonomy: NCBI E-utilities API
- Client-side: debounced autocomplete via `src/hooks/use-debounced-search.ts`
- Wrapper: `src/lib/ontology.ts`, which exports `searchCellOntology()`, `searchUberon()`, `searchGoCellularComponent()`, `searchDiseaseOntology()`, `searchRor()`, `searchSpecies()`, `searchEfoImagingMethods()` (EFO spatial proteomics branch), reached through `GET /api/ontology?type=...`
- Imaging methods are EFO terms keyed by CURIE. A method EFO has no term for (e.g. PathoPlex) is its own `ImagingMethod` row with a `parentId` on its closest EFO term, never a hardcoded catalog entry or a free-text column. `GET /api/ontology?type=imaging_method` returns those local rows plus the EFO search
- Store the ontology id alongside the display name in every DB field
- `docs/development/metadata-standards.md` holds the researched plan for where these are going (NCBITaxon CURIEs, OLS4 term lookup and hierarchy, MONDO for disease, EFO assay terms). Read it before changing ontology handling.

### External API Integrations

All read-only enrichment in `src/lib/integrations/`:
- `antibody-registry.ts` — RRID lookup, auto-fill vendor/host/clone
- `uniprot.ts` — protein metadata by UniProt ID or gene name
- `scicrunch.ts` — RRID resolver plus the optional Elasticsearch index behind `SCICRUNCH_API_KEY`
- `fpbase.ts` — FPbase dye records and spectra, used by `npm run setup` and `npm run fpbase:sync`
- `http.ts` — shared `fetchJson` with a timeout

### AI Chat: Vercel AI SDK (Direct Tools)

- No MCP dependency. Tools call model query functions directly.
- System prompt: spatial proteomics panel design context, in `src/app/api/chat/route.ts`
- `src/lib/chat-tools.ts` exports `createChatTools(viewer)`, a viewer-scoped toolkit: resolve helpers for markers, cell types, species, tissues and antibodies, plus `findReports`, `aggregateReports`, `listMyLabs`, `getLabInventory`, `getLabPanels`, `analyzePanel` and panel editing. Every tool closes over the viewer and intersects any model-supplied lab scope with the viewer's real memberships.
- Conversations and messages are persisted through `src/models/chat/`; provider API keys are encrypted at rest with `ENCRYPTION_KEY`.
- No free or shared fallback key. Key precedence per provider is the user's own key, then the key of the lab the conversation acts in (`ChatConversation.labId`, members only), then the operator's instance env key. The pure rules live in `src/models/chat/keys.ts`, error codes in `src/models/chat/errors.ts`.
- Model ids follow the `provider:model` convention. Any such string works at request time, so the catalog in `src/lib/ai/models.ts` is a convenience, not a whitelist.

### Public API: src/app/api/

The versioned `src/app/api/(versions)/v1/` tree described in earlier plans was never built. Public read endpoints live directly under `src/app/api/` (`proteins`, `antibodies`, `cell-types`, `reports`, `panels/public`, `fluorophores`, `imaging-methods`, `ontology`).

Conventions for these routes:
- Validate query params with a Zod schema in the matching `src/models/<entity>/schema.ts`
- `?q=` text search, `?limit=` (bounded), `?cursor=` for cursor pagination, returning `nextCursor`
- Respond with `createSuccessResponse()` / `createErrorResponse()` from `src/lib/error-handling.ts`.
- Public endpoints read the public lane only (`visibility: "PUBLIC"`), never the viewer-scoped lane

### Rate Limiting

Current entries in `RATE_LIMITS` (`src/lib/rate-limiting.ts`), all on a 24 hour window: `CHAT_INSTANCE_KEY` 200 (only chat turns running on an operator instance key; overridden by `AI_INSTANCE_DAILY_LIMIT`, 0 disables it; turns on a user or lab key are never limited), `REPORTS_SUBMIT` 50, `PANELS_CREATE` 50, `UPLOADS` 200, `UPLOAD_BYTES` 2048 MB, plus the lab limits `LABS_CREATE`, `LAB_INVITATIONS_SEND` and `INVENTORY_MUTATE`. Keep this list and the code in step when you add one.

---

## Technical Standards

### TypeScript & Code Quality
- **Strict TypeScript**: Target ES2024, strict mode enabled. Avoid `any` - use explicit types
- **Module system**: Use `"module": "nodenext"` and `"moduleResolution": "nodenext"`
- **Source layout**: all application code lives in `src/` (`app`, `components`, `models`, `lib`, `hooks`, `stores`, `types`, plus `auth.ts`, `proxy.ts`, `mdx-components.tsx`). Tooling and non-app code stay at the root: `prisma/`, `scripts/`, `tests/`, `public/`, `config/`, `docs/`, `docker/`
- **Path aliases**: Use `@/` for imports. It maps to `src/` (defined in tsconfig paths)
- **Server-only code**: Add `import "server-only"` to lib files with sensitive logic (env, auth, DB queries)
- **Type safety**: Explicitly type all function parameters and return values
- **Validation**: Use Zod schemas to validate all client data (API requests, form inputs, external data)
- **Composition over inheritance**: Favor interfaces and dependency injection for testability

### Style & Formatting
- **Prettier config**: 120 char line width, 2 spaces, no semicolons, double quotes, trailing commas
- **Import order**: Handled by `prettier-plugin-organize-imports` (auto-sorts imports)
- **Naming conventions**:
  - PascalCase: Components, types, interfaces
  - camelCase: Functions, variables, file names (except components)
  - UPPER_SNAKE_CASE: Constants and enums
- **HTML escaping**: Always escape special characters (including `'` as `&apos;` and `"` as `&quot;`)
- **NEVER use em dashes (`—`) in user-facing copy**: not in headings, body text, button labels, placeholders, toasts, descriptions, or anywhere a user reads. This is non-negotiable. Em dashes read as AI slop. Rewrite the sentence instead: use two shorter sentences, a comma, a colon, or parentheses. A short, plain label (e.g. "Next") beats a clever dashed one. This also applies to en dashes (`–`) in copy. (Numeric/date ranges and code are the only exceptions.)
- **NEVER use middle dots (`·`) in user-facing copy** either, and never `.join(" · ")` to build a metadata line. Same reasoning as the dashes. Separate facts with layout (flex and gap, separate spans, separate lines) or with a comma.
- **No manual gaps inside buttons**: shadcn `Button` already applies an internal `gap` between an icon and its label. Do NOT add `mr-2`/`ml-2`/`gap-*` to icons placed inside a `Button`; just render `<Icon className="size-4" />` followed by the label.
- **Comments**: Avoid comments. Code should be self-explanatory through clear naming and structure. Only add comments in exceptional circumstances where complex logic or non-obvious reasoning cannot be understood otherwise

### React & Next.js Patterns

#### Server vs Client Components
- **Default to server components** for data fetching and static content
- **Use `"use client"` only when needed**:
  - State management (`useState`, `useReducer`)
  - Browser APIs (`window`, `localStorage`)
  - Event handlers (`onClick`, `onChange`)
  - React hooks (`useEffect`, `useContext`, `useRouter` from next/navigation)
  - Third-party libraries requiring browser context

#### Component Structure
```typescript
// Server Component (default)
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export default async function ServerComponent() {
  const session = await auth()
  const data = await prisma.model.findMany()
  return <div>{/* render */}</div>
}

// Client Component (when needed)
"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function ClientComponent() {
  const [state, setState] = useState(false)
  return <Button onClick={() => setState(!state)}>{/* render */}</Button>
}
```

#### Data Fetching
- Fetch in server components or server actions
- Use `auth()` for session data in server components
- Use `useSession()` from `next-auth/react` in client components
- Filter sensitive data before passing to client

#### Cache Components (Next.js 16+)
**Key difference from older Next.js:** Explicit caching model replaces automatic static optimization.

- **Enable**: Set `cacheComponents: true` in `next.config.ts`
- **Default behavior**: All pages dynamic by default (unlike older Next.js)
- **`use cache` directive**: Cache component/function output to include in static shell
  ```typescript
  import { cacheLife } from "next/cache"

  async function CachedData() {
    "use cache"
    cacheLife("hours") // or "days", "weeks", or custom config
    const data = await fetch("https://api.example.com/data")
    return <div>{data}</div>
  }
  ```
- **Suspense required**: Wrap dynamic content (network requests, runtime data access) in `<Suspense>` with fallback
  ```typescript
  <Suspense fallback={<Loading />}>
    <DynamicContent />
  </Suspense>
  ```
- **Runtime data pattern**: Extract from `cookies()`, `headers()`, `searchParams` and pass as args to cached functions
  ```typescript
  async function Page() {
    const session = (await cookies()).get("session")?.value
    return <CachedContent sessionId={session} /> // sessionId becomes cache key
  }

  async function CachedContent({ sessionId }) {
    "use cache"
    // Cached per sessionId
  }
  ```
- **Revalidation**: Use `cacheTag()` with `updateTag()` (immediate) or `revalidateTag()` (eventual consistency)
- **Deprecated configs**: `dynamic = "force-static"`, `revalidate`, `fetchCache` no longer used—replace with `use cache` + `cacheLife`
- **Non-deterministic operations**: `Math.random()`, `Date.now()`, `crypto.randomUUID()` execute at request time unless inside `use cache` scope

### UI & Design System

#### shadcn/ui + Radix UI
- **All UI components** use shadcn/ui from `@/components/ui/*`
- **Available components** (`src/components/ui/`): accordion, alert, alert-dialog, avatar, badge, breadcrumb, button, card, checkbox, command, dialog, dropdown-menu, form, hover-card, input, input-group, label, pagination, popover, select, separator, sheet, sidebar, skeleton, sonner, switch, table, tabs, textarea, tooltip. Toasts are sonner only: there is no shadcn toast provider, so import `toast` from `sonner`.
- **Styling**: Tailwind CSS with CSS variables for theming
- **Icons**: Use `lucide-react` for all icons
- **No margins inside buttons**: `Button` already spaces its children via a built-in `gap` (and icon-aware padding). NEVER add `ml-*`/`mr-*`/`mx-*` to icons or any other child inside a `Button` — just place the icon before or after the label and let the gap handle spacing. (Negative margin on the `Button` element itself for outer alignment, e.g. `-ml-3`, is fine.)

#### Tailwind Patterns
- Use utility classes, avoid custom CSS unless necessary
- Use `cn()` helper from `@/lib/utils` to merge class names
- Theme colors via CSS variables (defined in `src/app/globals.css`)
- Responsive: mobile-first approach

#### Layout & Visual Design Principles

These are the house style for app pages. Follow them by default; deviate only with a clear reason.

**App shell**
- The whole app lives inside a left **sidebar shell** (`src/components/app-sidebar.tsx` + `SidebarProvider`/`SidebarInset`). Primary nav lives in the sidebar ("Platform" group); secondary/footer links live in the sidebar ("Resources" group + legal/copyright in `SidebarFooter`). There is **no page footer component** — do not reintroduce one.
- Global search, the Submit action, theme toggle, and the user button live in the **top bar** (`src/components/site-header.tsx`), not in the sidebar.
- The content wrapper in `src/app/layout.tsx` is a plain block (`flex-1`), **not** a flex column. Never make the top-level content wrapper `flex flex-col` — auto-margin children (`mx-auto`) shrink-to-fit inside a flex parent, which silently narrows every centered page ("double compression"). Pages own their own container (`container mx-auto px-4`).

**De-carding (don't wrap content in cards)**
- Do **not** wrap data tables or page content in `Card`. Tables render directly inside the centered container, optionally in a `rounded-md border` for definition. The marketing home page is the only place feature/navigation cards are appropriate (and even there, keep it toned down).
- Detail pages (`marker`, `antibody`, `celltype`, `condition`, `report`, `profile`, `panel`) follow one pattern: **breadcrumb → header (title + inline metadata + actions) → plain sections separated by `border-t pt-6`**. Section headings are `text-lg font-semibold` (sidebar sub-blocks use `font-semibold`).
- `Card` is reserved for genuinely card-like floating UI (e.g. home navigation tiles, auth/settings forms), not as a generic content container.

**Condensing & surfacing data**
- Prefer **inline metadata rows** over grids of bordered tiles: render each fact as its own `<span>` (`Label:` muted, then the value in `font-medium`/`font-mono`) inside `flex flex-wrap items-center gap-x-6 gap-y-1.5 text-sm`. The gap does the separating: never join facts with a separator character. Apply this to header key/value facts.
- For per-record detail grids, use borderless label/value pairs (`grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4`), not filled tile boxes.
- Replace lone big-number blocks with a compact **"At a glance"** stat list (`dl` of `flex justify-between` rows) that surfaces several derived metrics (counts of reports, antibodies, contributors, cell types, etc.).
- For tabular data inside another surface (e.g. an accordion), use the shadcn `Table` with transparent, border-only rows — never grey filled boxes, which clash with surrounding greys.

**Cross-linking (link every entity reference)**
- Any reference to an entity must link to its detail page: markers → `/marker/{uniprotId}`, antibodies/RRID → `/antibody/{rrid-without-RRID:}`, cell types → `/celltype/{id}`, conditions → `/condition/{id}`, users → `/profile/{userId}` (including panel owner bylines). Strip the `RRID:` prefix for antibody hrefs. Links use `text-primary hover:underline`.

**Theme-aware styling**
- Use semantic tokens: `bg-muted/40` for subtle fills, `text-muted-foreground`, `border`, `bg-popover`, etc. **Do not hardcode** `bg-zinc-50`/`text-zinc-*` for surfaces — they don't adapt to dark mode or the active theme.

**Long lists**
- For potentially large collections (e.g. a panel with 100+ cycles), use a multi-open `Accordion`. Put a summary in the collapsed trigger (name + count + a truncated preview of contents) so the list is scannable without expanding; Radix unmounts collapsed content, keeping it cheap.

**Overlays & interaction**
- When an overlay should let the user keep interacting with the page behind it (e.g. the right-side `PanelDrawer`), do **not** use a modal `Dialog`/`Sheet` — its scroll-lock adds body padding that shifts `fixed` elements, and its overlay blurs/blocks the page. Use a non-modal fixed `<aside>` that slides via `translate-x`, with no backdrop. Lazy-mount heavy contents on first open.
- Never put both `fixed … -translate-y-1/2` positioning **and** a `Button` on the same element — the button's `active:translate-y-px` overwrites the same `--tw-translate-y` variable and the element jumps on press. Put positioning transforms on a wrapper element, interactive transforms on the inner control.

### API Design

#### Route Structure
```typescript
// src/app/api/resource/route.ts
import { authErrorResponse, requireAuth } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { checkUserRateLimit, createRateLimitError, RATE_LIMITS } from "@/lib/rate-limiting"
import { createResource, createResourceSchema, toResourceResponse } from "@/models/resource"
import { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)

    const rateLimitResult = await checkUserRateLimit(user.id, RATE_LIMITS.PANELS_CREATE)
    if (!rateLimitResult.allowed) return createRateLimitError(rateLimitResult)

    const validated = createResourceSchema.parse(await request.json())
    const resource = await createResource(validated, user.id)

    return createSuccessResponse({ resource: toResourceResponse(resource) }, 201)
  } catch (error) {
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to create resource")
  }
}
```

`createErrorResponse()` maps `ZodError` to 400, Prisma known errors and `ApiException` subclasses (`NotFoundError`, `ForbiddenError`, `ConflictError`, ...) to their status codes. Throw those from the model layer instead of hand-rolling status checks.

#### Authentication Patterns
- Use `requireAuth()` for protected routes
- Use `requireAdmin()` for admin-only routes
- Use `createAuthHandler()` wrapper for consistent auth handling
- Use `getOptionalAuth()` for routes where auth is optional

#### Error Handling
- Import from `@/lib/error-handling` for consistent error responses
- Use `createErrorResponse()` utility for API errors
- Always handle Zod validation errors explicitly
- Log errors but don't expose internals to clients

#### Rate Limiting
- Import rate limit configs from `@/lib/rate-limiting`
- Use predefined limits: `RATE_LIMITS.REPORTS_SUBMIT`, `RATE_LIMITS.UPLOADS`, etc.
- Check rate limits before expensive operations
- Return 429 with reset time when exceeded

### Database (Prisma + PostgreSQL)

#### PostgreSQL Configuration

```prisma
datasource db {
  provider = "postgresql"
}
```

- Connected through the `@prisma/adapter-pg` driver adapter (`PrismaPg`) in `src/lib/prisma.ts`
- `DATABASE_URL` is required. `SHADOW_DATABASE_URL` is optional and only used by `migrate dev`
- Native `@db.VarChar()`/`@db.Text` column annotations and `String[]` array fields are supported
- Enums are database-native (`CREATE TYPE`)

#### Migration Workflow

```bash
# 1. Create migration SQL (review before applying)
npx prisma migrate dev --create-only --name descriptive_migration_name

# 2. Apply migration locally
npx prisma migrate dev

# 3. Deploy to production (never use migrate dev on prod)
npx prisma migrate deploy
```

##### Important
- ALWAYS use `--create-only` first to review the generated SQL
- NEVER use `migrate dev` on production
- NEVER run `migrate reset` without explicit user approval (destructive)
- If set, `SHADOW_DATABASE_URL` must point at a separate, disposable database that `migrate dev` can drop/recreate
- All earlier migrations were squashed into `0_init`. A database created from the pre-baseline history has to be recreated, not migrated

#### Schema Patterns
- All models have `id` (`String @id @default(cuid())`), `createdAt`, `updatedAt`
- Use `@relation` for foreign keys with `onDelete` cascade where appropriate
- Enums for fixed sets of values (`UserRole`, `UserStatus`)
- Use `@unique` for unique constraints, `@@index` for performance

#### Query Patterns
```typescript
import { prisma } from "@/lib/prisma"

// Select only needed fields
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: { id: true, name: true, email: true },
})

// Include relations
const panels = await prisma.panel.findMany({
  include: { owner: true },
})

// Transactions for multiple operations
await prisma.$transaction([
  prisma.model1.create({ data: {} }),
  prisma.model2.update({ where: {}, data: {} }),
])
```

### Environment Variables
- **Validation**: All env vars validated via `@/lib/env.ts` using Zod
- **Type-safe access**: Import `env` from `@/lib/env`
- **Required vars**:
  - `NEXT_PUBLIC_BASE_URL`: Public URL (compiled into the client bundle at build time)
  - `DATABASE_URL`: PostgreSQL connection string
  - `AUTH_SECRET`: Auth.js secret (32+ chars)
- **Optional vars**:
  - `SHADOW_DATABASE_URL` (separate disposable database for `migrate dev`)
  - `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` (GitHub OAuth; email and password always works)
  - `UPLOADS_DIR` (local image storage, default `./data/uploads`)
  - `ENCRYPTION_KEY` (encrypts stored provider API keys; the key routes return 503 without it)
  - `SCICRUNCH_API_KEY` (optional, richer antibody search; the keyless resolver is used without it)
  - `INSTANCE_NAME`, `INSTANCE_INSTITUTION`, `INSTANCE_OPERATOR`, `INSTANCE_ADDRESS`, `INSTANCE_CONTACT_EMAIL`, `INSTANCE_CONFIG_DIR` (instance identity and legal page overrides, read in `src/lib/instance.ts`; server-side only, never `NEXT_PUBLIC_`)
  - `INSTANCE_ALLOW_INDEXING` (default `false`: robots.txt disallows everything, the sitemap is empty and root metadata is `noindex, nofollow`; `true` restores normal indexing)
  - `GOOGLE_GENERATIVE_AI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` (optional instance-wide AI keys, the last fallback after a user key and a lab key), `AI_DEFAULT_MODEL` (`provider:model`), `AI_INSTANCE_DAILY_LIMIT` (per-user daily chat turns on the instance keys, default 200, 0 = unlimited). See `docs/development/chat-persistence.md`.
  - Script-only: `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD`, `SETUP_SKIP_FPBASE`, `SEED_ALLOW_RESET`, `DEMO_USER_EMAIL`, `DEMO_USER_PASSWORD`. Compose-only: `POSTGRES_*`, `BUILD_MEMORY_MB`, `SITE_ADDRESS`, `ACME_EMAIL`, `HTTP_PORT`, `HTTPS_PORT`, `PROXY_BIND`, `BASIC_AUTH_USER`, `BASIC_AUTH_PASSWORD`, `APP_PORT`
- `.env.local.example` is the authoritative list. Keep it, `src/lib/env.ts` and `docs/self-hosting/configuration.md` in step.
- **Never hardcode secrets** in code or commit to git

### Security Headers
- CSP configured in `next.config.ts`. Production sends HSTS and `upgrade-insecure-requests`, except when the request host is `localhost`, `127.0.0.1` or `*.localhost`, so `npm run build && npm start` works over plain http locally
- Security headers: X-Frame-Options, X-Content-Type-Options, HSTS, etc.
- Content sanitization using `isomorphic-dompurify` and `rehype-sanitize`
- Rate limiting on public endpoints

---

## Development Workflow

### Environment Setup
```bash
nvm use  # Always run before any commands
```

### Code Quality
```bash
# Lint (runs Prettier + ESLint)
npm run lint

# Pre-commit hooks automatically run:
# - Prettier (formatting)
# - ESLint (linting)
# via Husky + lint-staged
```

### Testing

#### Playwright E2E Tests
```bash
npm run build:test    # Build with test env
npm run start:test    # Start test server
npm test              # Run tests
npm run test:ui       # Interactive mode
npm run test:debug    # Debug mode
```

#### Test Patterns
- Tests in `tests/*.spec.ts`
- Test both authenticated and unauthenticated flows
- Use `test.describe()` to group related tests
- Use `test.skip()` to skip tests conditionally
- Never disable tests—fix or update them
- Add tests for new features before considering them complete

### Database Migrations
```bash
# Check migration status
npx prisma migrate status

# Create new migration (don't apply)
npx prisma migrate dev --create-only --name descriptive_name

# Open Prisma Studio
npx prisma studio
```

### Development Commands
```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run start        # Start production server
```

### Seeding & Scripts
- `npm run setup` (`scripts/setup.ts`, data in `prisma/reference.ts` and `prisma/data/`): idempotent reference data plus missing FPbase spectra (`--skip-fpbase` or `SETUP_SKIP_FPBASE=1` to skip). Non-destructive; the Docker `migrate` service runs it on every deploy. `npx prisma db seed` runs the same script.
- `npm run admin:create -- --email <email> [--name "<name>"] [--reset-password]` (`scripts/create-admin.ts`): creates or promotes an admin. Password from `ADMIN_PASSWORD`, otherwise generated and printed once.
- `npm run seed:demo` (`prisma/seed-demo.ts`): DESTRUCTIVE, wipes every row then loads demo data. Refuses with `NODE_ENV=production` unless `SEED_ALLOW_RESET=1`.
- `npm run seed:demo-user`: the `demo@panelmaker.local` admin, written to the gitignored `DEMO_CREDENTIALS.txt`.
- `npm run seed:all`: dev chain of `seed:demo`, `seed:demo-user`, `pathoplex:seed`, `ibex:import`, `fpbase:sync`.
- `npm run ibex:import` / `ibex:fetch`, `npm run pathoplex:lookup` / `pathoplex:seed`, `npm run fpbase:sync`: see `docs/self-hosting/data.md`.
- There is no `prisma/seed.ts` any more; never reintroduce a destructive default seed.

### Documentation Layout
- `README.md`: entry point for institutions evaluating or deploying PanelMaker, quick start, short development section
- `docs/self-hosting/`: operator guide (deployment, configuration, legal and branding, AI assistant, data, upgrading, administration)
- `docs/development/`: architecture overview and design notes (`chat-persistence.md`, `lab-structure/`, `ibex-import.md`, `metadata-standards.md`)
- `src/app/docs/`: in-app user documentation (MDX), served at `/docs` on every instance. `/docs/getting-started/self-hosting` links to `docs/self-hosting/` on GitHub
- When you change configuration, commands or operator-visible behavior, update `docs/self-hosting/` in the same change

---

## Architecture Guidelines

### Next.js App Router
- **File-based routing**: `src/app/` directory
- **Route groups**: Use `(group)` for organization without affecting URL
- **API routes**: `src/app/api/*/route.ts` with named exports (GET, POST, etc.)
- **Middleware**: Auth middleware in `src/proxy.ts` (Next 16 renamed the file; it re-exports the Auth.js handler)
- **Metadata**: Export `metadata` and `viewport` from page components

### State Management
- **Server state**: React Server Components (default)
- **Client state**: `useState` for local, Zustand for global (see `src/stores/panels.ts`)
- **URL state**: `useSearchParams` and `useRouter` from `next/navigation`
- **Form state**: `react-hook-form` with `@hookform/resolvers` and Zod

### AI & Chat
- **Vercel AI SDK**: `ai` v7 and `@ai-sdk/react` v4 (providers `@ai-sdk/google`, `@ai-sdk/openai`, `@ai-sdk/anthropic` v4) for streaming chat responses. Use v7 names: `instructions` (not `system`), `isStepCount`, `onEnd`/`onStepEnd`, `usage` (covers all steps), `toUIMessageStream` + `createUIMessageStreamResponse`, `createGoogle`. Reasoning goes through the top-level `reasoning` option chosen in the UI, not provider-specific `providerOptions`.
- **No MCP**: Tools call internal model query functions directly (no `@ai-sdk/mcp` or `@modelcontextprotocol/sdk`)
- **Providers**: Anthropic (Claude), Google (Gemini), OpenAI via `@ai-sdk/*`
- **Tools**: defined in `src/lib/chat-tools.ts`, call `src/models/*/queries.ts` functions directly

### MDX & Documentation
- **MDX support**: `@next/mdx` with remark/rehype plugins
- **Plugins in use** (MDX pages in `next.config.ts`, runtime Markdown in `src/components/markdown.tsx`):
  - `remark-gfm`: GitHub Flavored Markdown
  - `remark-breaks`: Line breaks
  - `remark-supersub`: Superscript/subscript
  - `rehype-external-links`: External links open in a new tab
  - `rehype-sanitize`: XSS prevention (runtime Markdown)
  - `rehype-github-alerts`: Alert blocks (runtime Markdown)

### Performance & Security
- **Bundle optimization**: Dynamic imports for heavy components
- **Image optimization**: Next.js Image component with configured domains
- **Content Security Policy**: Strict CSP in production
- **Sanitization**: All user content sanitized before render
- **Rate limiting**: On public APIs and resource-intensive operations

---

## Common Patterns

### Conditional Rendering
```typescript
// Use explicit boolean coercion
{isLoading && <Spinner />}
{items.length > 0 && <List items={items} />}
{error ? <Error /> : <Content />}
```

### Error Boundaries
```typescript
// Use try-catch in server components
try {
  const data = await fetchData()
} catch (error) {
  return <ErrorDisplay message="Failed to load" />
}
```

### Loading States
```typescript
// Use Suspense with fallback
<Suspense fallback={<Skeleton />}>
  <AsyncComponent />
</Suspense>
```

### Toasts & Notifications
```typescript
import { toast } from "sonner"

toast.success("Operation successful")
toast.error("Operation failed")
```

---

## Key Reminders

- **Understand before implementing**: Read 2-3 similar files first
- **Follow established patterns**: Consistency over novelty
- **Type everything explicitly**: Leverage TypeScript fully
- **Server by default**: Only use client components when necessary
- **Use the design system**: Don't create custom components unnecessarily
- **Handle errors gracefully**: Use standard error handling patterns
- **Test thoroughly**: E2E tests for features, quality over speed
- **Secure by default**: Validate input, sanitize output, rate limit
- **Ask when uncertain**: Especially for architectural decisions
- **Run `nvm use` first**: Before any terminal commands