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

All domain logic lives in `models/<entity>/` (not flat `lib/`). Current entities:

```
models/
  protein/
    queries.ts      -- import "server-only"; Prisma queries (getAll, getById, search, getForCellType)
    transforms.ts   -- Prisma return types → API/UI shapes
    schema.ts       -- Zod schemas for API input validation
    index.ts        -- Re-exports: types + query functions
  cell-type/        -- same structure
  antibody/         -- same structure
  experimental-report/  -- same structure
  panel/
    queries.ts
    transforms.ts
    schema.ts
    intelligence.ts -- Fluorophore overlap, host species cross-reactivity checks
    index.ts
  structure/
    queries.ts
    index.ts
```

Rules:
- `queries.ts` always starts with `import "server-only"` and imports `prisma` from `@/lib/prisma`
- `index.ts` re-exports everything public (types and query functions)
- Do not add domain logic to `lib/` — `lib/` is for cross-cutting infrastructure only

### Database: PostgreSQL via Prisma

```prisma
datasource db {
  provider = "postgresql"
}
```

- Connection via the `@prisma/adapter-pg` driver adapter (`PrismaPg`) in `lib/prisma.ts`
- `DATABASE_URL` and `SHADOW_DATABASE_URL` (used by `migrate dev`) are both required
- Primary keys are `String @id @default(cuid())` — do NOT use `Int @default(autoincrement())` on any model (autoincrement sequences drift out of sync when rows are seeded with explicit ids, causing P2002 unique-constraint errors on insert)
- Native Postgres features are available: enums, `@db.VarChar()`/`@db.Text` annotations, `String[]` array fields
- Migrations: always `npx prisma migrate dev --create-only --name <name>`, then review SQL before applying

### Search: Prisma LIKE Queries

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

### Image Storage: Cloudflare R2

- SDK: `@aws-sdk/client-s3` (S3-compatible)
- Wrapper: `lib/storage.ts` — exports `uploadImage()`, `deleteImage()`, `getSignedUrl()`
- Upload route: `app/api/uploads/route.ts` (authenticated, rate-limited)
- Constraints: 10MB max per image, JPEG/PNG/TIFF only
- Env vars: `R2_BUCKET`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_URL`

### Ontology Lookups

- Cell Ontology (CL) and UBERON: OLS4 REST API at `https://www.ebi.ac.uk/ols4/api`
- Species/taxonomy: NCBI E-utilities API
- Client-side: debounced autocomplete (300ms) using React state or SWR
- Wrapper: `lib/ontology.ts` — exports `searchCellTypes()`, `searchStructures()`, `searchSpecies()`
- Store ontology ID alongside display name in all DB fields

### External API Integrations

All read-only enrichment in `lib/integrations/`:
- `antibody-registry.ts` — RRID lookup, auto-fill vendor/host/clone
- `uniprot.ts` — protein metadata by UniProt ID or gene name
- `hpa.ts` — Human Protein Atlas tissue expression and subcellular location
- `ensembl.ts` — Ensembl gene ID resolution

### AI Chat: Vercel AI SDK v5 (Direct Tools)

- No MCP dependency — tools call model query functions directly
- System prompt: spatial proteomics panel design context
- Tools defined in `lib/chat-tools.ts`: `searchMarkers`, `getMarkerDetails`, `suggestPanel`, `checkCompatibility`
- Remove `@ai-sdk/mcp` and `@modelcontextprotocol/sdk` dependencies
- Remove MCP server picker from chat UI and stores

### Public API v1: app/api/(versions)/v1/

All endpoints are read-only (GET), public, no auth required:

| Endpoint | Description |
|----------|-------------|
| `GET /v1/proteins` | List/search proteins |
| `GET /v1/proteins/[id]` | Single protein |
| `GET /v1/cell-types` | List/search cell types |
| `GET /v1/cell-types/[id]` | Single cell type |
| `GET /v1/antibodies` | List/search antibodies |
| `GET /v1/antibodies/[id]` | Single antibody |
| `GET /v1/reports` | Public validated reports |
| `GET /v1/reports/[id]` | Single report |
| `GET /v1/panels` | Public panels |

Query params: `?q=` (text search), `?species=`, `?method=`, `?fixation=`, `?limit=` (max 100, default 20), `?cursor=` (cursor-based pagination).
Response: use `createSuccessResponse()` from `lib/api-response.ts`; add `nextCursor` to meta when paginating.

### Rate Limiting: New Resource Types

Add to `RATE_LIMITS` in `lib/rate-limiting.ts`:
- `REPORTS_SUBMIT`: 10 requests / 24 hours (authenticated, submitting experimental reports)
- `PANELS_CREATE`: 50 requests / 24 hours (authenticated, creating/modifying panels)

---

## Technical Standards

### TypeScript & Code Quality
- **Strict TypeScript**: Target ES2024, strict mode enabled. Avoid `any` - use explicit types
- **Module system**: Use `"module": "nodenext"` and `"moduleResolution": "nodenext"`
- **Path aliases**: Use `@/` for imports (defined in tsconfig paths)
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
- **Available components**: button, card, dialog, dropdown-menu, form, input, label, select, separator, tabs, toast, tooltip, alert, badge, checkbox, sheet, skeleton, switch, textarea, alert-dialog, navigation-menu, pagination, progress, accordion, avatar, collapsible, sidebar, sonner
- **Styling**: Tailwind CSS with CSS variables for theming
- **Icons**: Use `lucide-react` for all icons
- **No margins inside buttons**: `Button` already spaces its children via a built-in `gap` (and icon-aware padding). NEVER add `ml-*`/`mr-*`/`mx-*` to icons or any other child inside a `Button` — just place the icon before or after the label and let the gap handle spacing. (Negative margin on the `Button` element itself for outer alignment, e.g. `-ml-3`, is fine.)

#### Tailwind Patterns
- Use utility classes, avoid custom CSS unless necessary
- Use `cn()` helper from `@/lib/utils` to merge class names
- Theme colors via CSS variables (defined in `app/globals.css`)
- Responsive: mobile-first approach

#### Layout & Visual Design Principles

These are the house style for app pages. Follow them by default; deviate only with a clear reason.

**App shell**
- The whole app lives inside a left **sidebar shell** (`components/app-sidebar.tsx` + `SidebarProvider`/`SidebarInset`). Primary nav lives in the sidebar ("Platform" group); secondary/footer links live in the sidebar ("Resources" group + legal/copyright in `SidebarFooter`). There is **no page footer component** — do not reintroduce one.
- Global search, the Submit action, theme toggle, and the user button live in the **top bar** (`components/site-header.tsx`), not in the sidebar.
- The content wrapper in `app/layout.tsx` is a plain block (`flex-1`), **not** a flex column. Never make the top-level content wrapper `flex flex-col` — auto-margin children (`mx-auto`) shrink-to-fit inside a flex parent, which silently narrows every centered page ("double compression"). Pages own their own container (`container mx-auto px-4`).

**De-carding (don't wrap content in cards)**
- Do **not** wrap data tables or page content in `Card`. Tables render directly inside the centered container, optionally in a `rounded-md border` for definition. The marketing home page is the only place feature/navigation cards are appropriate (and even there, keep it toned down).
- Detail pages (`marker`, `antibody`, `celltype`, `condition`, `report`, `profile`, `panel`) follow one pattern: **breadcrumb → header (title + inline metadata + actions) → plain sections separated by `border-t pt-6`**. Section headings are `text-lg font-semibold` (sidebar sub-blocks use `font-semibold`).
- `Card` is reserved for genuinely card-like floating UI (e.g. home navigation tiles, auth/settings forms), not as a generic content container.

**Condensing & surfacing data**
- Prefer **inline metadata rows** over grids of bordered tiles: `Label: value · Label: value` using `flex flex-wrap items-center gap-x-6 gap-y-1.5 text-sm` (muted label, `font-medium`/`font-mono` value). Apply this to header key/value facts.
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
// app/api/resource/route.ts
import { auth } from "@/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/api-response"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

// Validation schema
const requestSchema = z.object({
  field: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // 2. Parse & validate
    const body = await request.json()
    const validated = requestSchema.parse(body)

    // 3. Business logic
    const result = await prisma.model.create({
      data: validated,
    })

    // 4. Return response
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    // Use standard error handling
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

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
- Use predefined limits: `RATE_LIMITS.CHAT_FREE`, `RATE_LIMITS.REVIEWS`, etc.
- Check rate limits before expensive operations
- Return 429 with reset time when exceeded

### Database (Prisma + PostgreSQL)

#### PostgreSQL Configuration

```prisma
datasource db {
  provider = "postgresql"
}
```

- Connected through the `@prisma/adapter-pg` driver adapter (`PrismaPg`) in `lib/prisma.ts`
- `DATABASE_URL` (runtime) and `SHADOW_DATABASE_URL` (used by `migrate dev`) are both required
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
- `SHADOW_DATABASE_URL` must point at a separate, disposable database that `migrate dev` can drop/recreate

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
const post = await prisma.blogPost.findMany({
  include: { author: true },
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
  - `NEXT_PUBLIC_BASE_URL`: Public URL
  - `DATABASE_URL`: PostgreSQL connection string
  - `SHADOW_DATABASE_URL`: PostgreSQL shadow DB for `migrate dev`
  - `AUTH_SECRET`: Auth.js secret (32+ chars)
  - `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`: OAuth
  - `AUTH_LINKEDIN_ID`, `AUTH_LINKEDIN_SECRET`: OAuth
  - `GEMINI_API_KEY`: AI features
  - `CRON_SECRET`: Cron job auth
- **Image storage vars** (add when implementing uploads):
  - `R2_BUCKET`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_URL`
- **Removed vars** (no longer needed): `GITHUB_TOKEN` (no GitHub API calls)
- **Never hardcode secrets** in code or commit to git

### Security Headers
- CSP configured in `next.config.ts`
- Security headers: X-Frame-Options, X-Content-Type-Options, HSTS, etc.
- Content sanitization using `isomorphic-dompurify` and `sanitize-html`
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

---

## Architecture Guidelines

### Next.js App Router
- **File-based routing**: `app/` directory
- **Route groups**: Use `(group)` for organization without affecting URL
- **API routes**: `app/api/*/route.ts` with named exports (GET, POST, etc.)
- **Middleware**: Auth middleware in `middleware.ts`
- **Metadata**: Export `metadata` and `viewport` from page components

### State Management
- **Server state**: React Server Components (default)
- **Client state**: `useState` for local, Zustand for global (see `stores/chat.ts`)
- **URL state**: `useSearchParams` and `useRouter` from `next/navigation`
- **Form state**: `react-hook-form` with `@hookform/resolvers` and Zod

### AI & Chat
- **Vercel AI SDK v5**: For streaming chat responses
- **No MCP**: Tools call internal model query functions directly (no `@ai-sdk/mcp` or `@modelcontextprotocol/sdk`)
- **Providers**: Anthropic (Claude), Google (Gemini), OpenAI via `@ai-sdk/*`
- **Tools**: defined in `lib/chat-tools.ts`, call `models/*/queries.ts` functions directly

### MDX & Documentation
- **MDX support**: `@next/mdx` with remark/rehype plugins
- **Plugins in use**:
  - `remark-gfm`: GitHub Flavored Markdown
  - `remark-math`, `rehype-katex`: Math rendering
  - `remark-breaks`: Line breaks
  - `rehype-sanitize`: XSS prevention
  - `rehype-github-alerts`: Alert blocks
  - `remark-supersub`: Superscript/subscript

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