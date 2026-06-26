# PanelMaker: Comprehensive TODO List

**Output:** Save this as `TODO.md` in the project root for tracking across agent sessions.

## Context

PanelMaker is a community-driven platform for antibody panel design in spatial proteomics. The codebase was copied from BioContextAI (an MCP server registry) and still contains the entire old project's database schema, API routes, lib utilities, and branding. The Prisma database is PostgreSQL with MCP registry models -- it needs to be replaced with a local SQLite database with spatial proteomics models (markers, cell types, antibodies, panels, submissions). There are no migrations to preserve from the old database. The UI has been partially prototyped but relies on mock data and lacks interactivity (forms don't submit, panels aren't persisted, search doesn't work, ontology lookups are missing).

This TODO file is intended to be used across multiple agent sessions to track progress.

---

## 0. Architecture & Tech Stack Planning ✓ COMPLETE

- [x] **0.1** Code organization: **model folder pattern** adopted
  - Domain logic lives in `models/<entity>/` folders (not flat `lib/`)
  - Each entity folder: `queries.ts`, `transforms.ts`, `schema.ts`, `index.ts`
  - `panel/` also has `intelligence.ts` for compatibility checks
  - `queries.ts` has `import "server-only"` and imports from `@/lib/prisma`
  - `index.ts` re-exports all public types and query functions
  - Entities: `protein/`, `cell-type/`, `antibody/`, `experimental-report/`, `panel/`, `structure/`

- [x] **0.2** Tech stack decisions -- all resolved:
  - **Database**: SQLite via Prisma (`provider = "sqlite"`, `url = "file:./dev.db"`) -- no `pg`, no shadow DB
  - **AI chat**: Direct tool calls via Vercel AI SDK v5 -- no MCP dependency
  - **Search**: Prisma `contains` (LIKE) queries to start; add `@@index` on searchable fields; SQLite FTS5 is future optimization only if needed
  - **Image storage**: Cloudflare R2 via `@aws-sdk/client-s3` (S3-compatible API)
  - **Ontology lookups**: OLS4 REST API for CL + UBERON; NCBI E-utilities for taxonomy; debounced autocomplete client-side
  - **External APIs**: Antibody Registry (RRID), UniProt REST, Human Protein Atlas, Ensembl -- all in `lib/integrations/`
  - **State management**: Keep Zustand; remove MCP server config from `stores/chat.ts`
  - **Keep existing**: NextAuth v5, shadcn/ui, Tailwind, react-hook-form + Zod, Vercel AI SDK v5, Playwright

- [x] **0.3** Shared patterns and conventions -- all resolved (see AGENTS.md):
  - API routes: existing pattern (Zod validation, auth check, try/catch, `lib/api-response.ts`)
  - Auth helpers: `requireAuth()`, `requireAdmin()`, `createAuthHandler()` from `lib/auth.ts`
  - Rate limiting: add `REPORTS_SUBMIT` (10/24h) and `PANELS_CREATE` (50/24h) to `lib/rate-limiting.ts`
  - Forms: `components/ui/form.tsx` + react-hook-form pattern
  - Data tables: `components/browse/data-table.tsx` TanStack React Table pattern
  - Server components for data fetching, client only for interactivity
  - Each model folder exports its own TypeScript types via `index.ts`

- [x] **0.4** Public API v1 -- designed:
  - Base path: `app/api/(versions)/v1/` (replaces MCP registry v1 routes)
  - Endpoints (all GET, public, read-only): `/v1/proteins`, `/v1/proteins/[id]`, `/v1/cell-types`, `/v1/cell-types/[id]`, `/v1/antibodies`, `/v1/antibodies/[id]`, `/v1/reports`, `/v1/reports/[id]`, `/v1/panels`
  - Query params: `?q=` (text search), `?species=`, `?method=`, `?fixation=`, `?limit=` (max 100), `?cursor=` (cursor-based pagination)
  - Response: reuse `createSuccessResponse()` from `lib/api-response.ts`; add `nextCursor` to meta
  - OpenAPI schema: replace `v1/schema.json` with schema for new endpoints

- [x] **0.5** Image upload infrastructure -- planned:
  - Storage: Cloudflare R2 via `@aws-sdk/client-s3`
  - Wrapper: `lib/storage.ts` -- `uploadImage()`, `deleteImage()`, `getSignedUrl()`
  - Upload endpoint: `app/api/uploads/route.ts` (auth required, rate-limited, 10MB max, JPEG/PNG/TIFF only)
  - Env vars: `R2_BUCKET`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_URL`

---

## 1. Database & Schema ✓ COMPLETE

- [x] **1.1** Switch Prisma from PostgreSQL to SQLite
- [x] **1.2** Delete all MCP registry models from Prisma schema
- [x] **1.3** Implement new spatial proteomics models (all enums at Prisma level)
- [x] **1.4** Merge draft users model with existing NextAuth User model
- [x] **1.5** Fresh migration: `prisma/migrations/20260227164048_initial_schema/`
- [x] **1.6** Seed script at `prisma/seed.ts` with enum-compatible values

---

## 2. Old Project Cleanup ✓ COMPLETE

- [x] **2.1** Deleted MCP registry lib files (`lib/registry.ts`, `lib/collections.ts`, `lib/bluesky.ts`, `lib/maps.ts`, `lib/url-validation.ts`)
- [x] **2.2** Deleted MCP registry API routes (`app/api/registry/`, `app/api/collections/`, `app/api/mcp/`, `app/api/(versions)/v1/`)
- [x] **2.3** Admin components updated to reference experimental reports
- [x] **2.4** BioContextAI branding removed; `BioContextRegistry.svg` deleted
- [x] **2.5** `package.json` description updated
- [x] **2.6** Browse page metadata updated for spatial proteomics
- [x] **2.7** `public/manifest.json` updated
- [x] **2.8** `lib/env.ts` cleaned up
- [x] **2.9** Unused MCP dependencies removed (`@ai-sdk/mcp`, `@modelcontextprotocol/sdk`)
- [x] **2.10** Old import scripts deleted
- [x] **Extra** Rewrote `app/api/chat/route.ts` (removed all MCP logic), `stores/chat.ts` (v6, no MCP state), `components/chat/chat.tsx` (no MCP refs), `app/chat/page.tsx` (simplified). Deleted `mcp-servers-picker.tsx`, `import-mcp-server-dialog.tsx`, `chat-with-import.tsx`.

---

## 3. Core Data Model & API ✓ COMPLETE

- [x] **3.1** Data access layer in `models/` (protein, cell-type, antibody, experimental-report, panel, structure)
- [x] **3.2** API routes created (proteins, cell-types, antibodies, reports, panels + cycles + markers)
- [x] **3.3** Admin routes already clean (reviews, stats reference Review/ChatMessage, not MCP)
- [x] **3.4** Deleted `lib/mock-data.ts` -- all consumers now use real data from `models/`
- [x] **3.5** `types/api.ts` already clean (no MCP types found); domain types live in `models/*/transforms.ts`
- [x] **3.6** Fixed `requireAuth` to auto-create User record when missing (handles DB reset with stale JWT session)

---

## 4. Ontology Integration ✓ COMPLETE

- [x] **4.1** Created `lib/ontology.ts` (OLS4 for CL + UBERON, NCBI E-utilities for taxonomy) + `app/api/ontology/route.ts`
- [x] **4.2** Built `components/ontology-combobox.tsx` with Popover + Command, debounced search (300ms), 2+ char threshold
- [x] **4.3** Submission form updated: species, tissue, cell type now use `OntologyCombobox` via react-hook-form `Controller`
- [x] **4.4** Ontology IDs stored alongside labels in DB (schema already supports this)
- [x] **4.5** GO Cellular Component ontology added (`go_cc` type) for subcellular location lookup
- [x] **4.6** Multi-select ontology combobox (`OntologyMultiCombobox`) for cell type selection

---

## 5. UI & Interactivity (HIGH -- user-facing features)

- [x] **5.1** Created `/panel` route (`app/panel/page.tsx`)
- [x] **5.2** PanelWorkspace wired to real API (fetch/create/delete panels, add/remove cycles and markers)
- [x] **5.3** Built `MarkerSearchDialog` (search proteins/antibodies, pick fluorophore/metal tag, add to cycle) + wired into `CycleSection`
- [x] **5.4** Browse page data table wired to real Prisma queries via `toMarkerEntry` transform
- [x] **5.5** Submission form connected to `POST /api/reports` with auth guard and enum mapping
- [x] **5.6** Search input wired: nav search form → `/browse?q=...`, browse page reads `searchParams`, report query supports text search
- [x] **5.7** Marker detail page wired to `getProteinById` + `getReportsForProtein` + `getCellTypesForProtein`
- [x] **5.8** Cell type detail page wired to `getCellTypeById` + `getReportsForCellType`
- [x] **5.9** Antibody detail page wired to `lookupByRrid` + `getReportsForAntibody`
- [x] **5.10** Built `AddToPanelButton` component (lists user's panels/cycles, fluorophore/metal tag inputs); wired into marker detail page

---

## 6. AI Assistant (MEDIUM -- differentiating feature)

**Approach: Direct chat with DB tools (no MCP dependency).** The AI calls internal functions directly as tool calls.

- [x] **6.1** Chat route simplified to Gemini 2.5 Flash only (removed Anthropic, OpenAI providers)
- [x] **6.2** Chat tools replaced with domain tools: `searchMarkers`, `getMarkerDetails`, `searchCellTypes`, `suggestPanel` (call `models/` directly)
- [x] **6.3** MCP server picker removed from chat UI; `stores/chat.ts` rewritten (v6)
- [x] **6.4** `@ai-sdk/mcp` and `@modelcontextprotocol/sdk` removed
- [x] **6.5** Floating AI assistant functional with `useChat`, streaming, auth guard, auto-scroll
- [x] **6.6** Panel-page AI assistant functional with `useChat` (separate `id: "panel-assistant"`)
- [x] **6.7** Built `ToolResultCard` component with rich interactive cards for all chat tools + "Add to Panel" buttons; floating assistant made draggable

---

## 7. External Integrations (MEDIUM -- enrichment)

- [x] **7.1** `lib/integrations/antibody-registry.ts` created (SciCrunch RRID lookup)
- [x] **7.2** `lib/integrations/uniprot.ts` created (UniProt REST lookup + search by gene)
- [x] **7.3** `lib/integrations/hpa.ts` created (Human Protein Atlas tissue expression + subcellular location)
- [x] **7.4** `lib/integrations/ensembl.ts` created (Ensembl gene lookup + symbol search)
- [x] **7.5** Antibody Registry search API (`app/api/antibody-registry/route.ts`) + `AntibodyRegistryCombobox` component
- [x] **7.6** Submission form antibody step: RRID search as primary input, auto-fills vendor/catalog/clone/clonality
- [x] **7.7** Submission form: cell type multi-select, subcellular location via GO CC ontology with "Not discernible" option

---

## 8. Panel Intelligence ✓ COMPLETE

- [x] **8.1** Fluorophore overlap detection in `models/panel/intelligence.ts` (spectral data for 19 common fluorophores)
- [x] **8.2** Host species cross-reactivity detection in `models/panel/intelligence.ts`
- [x] **8.3** Panel validation engine -- aggregates fluorophore overlap + cross-reactivity warnings per cycle
- [x] **8.4** Panel report generation -- structured validation report with severity levels
- [x] **8.5** Panel export -- CSV and JSON via `app/api/panels/[id]/export/route.ts`

---

## 9. Testing ✓ COMPLETE

- [x] **9.1** Deleted MCP registry test files
- [x] **9.2** New E2E tests: `browse.spec.ts`, `marker-detail.spec.ts`, `panel-designer.spec.ts`, `submission.spec.ts`, `search.spec.ts`
- [x] **9.3** Updated existing tests: `home.spec.ts`, `navigation.spec.ts`, `comprehensive.spec.ts`, `api.spec.ts` -- all MCP references removed
- [x] **9.4** API integration tests for proteins, cell-types, panels (auth flow, search, pagination)

---

## 10. Polish & Deployment ✓ COMPLETE

- [x] **10.1** Homepage stats query real DB counts (protein, antibody, report)
- [x] **10.2** Sitemap updated with dynamic routes for proteins and cell types
- [x] **10.3** SEO metadata updated across all pages (layout, browse, marker detail, etc.)
- [x] **10.4** Documentation pages fully rewritten for PanelMaker (getting started, API reference, community)
- [x] **10.5** README.md updated -- BioContextAI/MCP references removed
- [x] **10.6** CITATION.cff updated for PanelMaker spatial proteomics
- [x] **10.7** Unused dependencies audited and removed
- [x] **10.8** DB indexes added on searchable fields; `use cache` being added to listing pages
- [x] **10.9** Not-found pages added for markers, cell types, antibodies
- [x] **10.10** Dead links fixed (homepage, not-found page)

---

## Recommended Implementation Order

**Phase 0 -- Architecture:** 0.1-0.4 (tech stack decisions, code organization, patterns)
**Phase 1 -- Foundation:** 1.1-1.6, 2.1-2.10, 3.1 (schema + cleanup + data layer)
**Phase 2 -- Core Features:** 3.2-3.5, 5.1-5.5, 9.1-9.2 (API routes + UI wiring + tests)
**Phase 3 -- Enrichment:** 4.1-4.4, 5.6-5.10, 6.1-6.6 (ontology + UI polish + AI)
**Phase 4 -- Intelligence:** 7.1-7.4, 8.1-8.5, 9.3-9.4 (integrations + panel checks + test updates)
**Phase 5 -- Polish:** 10.1-10.10 (SEO, docs, performance, cleanup)

---

## Key Files Reference

| Purpose | Files |
|---------|-------|
| Proposed schema draft | `prisma/proposed_schema_draft.dbml` (reference for implementation) |
| Database schema | `prisma/schema.prisma` (rewrite based on draft) |
| Mock data (current reference) | `lib/mock-data.ts` (delete after migration) |
| MCP registry lib (delete) | `lib/registry.ts`, `lib/collections.ts` |
| Panel designer | `components/panel/panel-workspace.tsx`, `panel-form.tsx`, `panel-list.tsx`, `cycle-section.tsx`, `marker-card.tsx`, `types.ts` |
| Submission form | `components/submit/submission-form.tsx` |
| Browse UI | `components/browse/data-table.tsx`, `columns.tsx`, various detail tables |
| AI assistant | `components/ai-assistant-floating.tsx`, `ai-assistant-panel.tsx`, `lib/chat-tools.ts` |
| Navigation | `components/main-nav.tsx` |
| Homepage | `app/page.tsx` |
| Browse page | `app/(content)/browse/page.tsx` |
