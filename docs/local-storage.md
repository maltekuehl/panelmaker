# Local-first panels for logged-out users (NAR Web Servers) — Design Proposal

> **Status: PROPOSAL / not committed.** This documents *how* we would let logged-out users
> build panels locally and sync them after login. It is contingent on the decision to submit
> PanelMaker to **NAR Web Servers**, whose policy requires main features to be usable without
> login. We are no longer certain we will pursue NAR, so this is an outline to revisit, **not**
> an approved implementation.

## Context

NAR Web Servers requires that the primary feature of a web server be accessible without
authentication. PanelMaker's primary feature is the **Panel Designer**, which today is fully
gated: every panel operation calls `requireAuth()` on the server, and `/panel` renders only a
"Sign in to create panels" message for guests.

To satisfy the policy we would let guests build panels in a browser-local store, persisted across
reloads, then **push them to their account after login**. Logged-in users would see their local
drafts alongside cloud panels, each local one marked with a **"Local" badge** and a **"Push to
cloud"** button. The AI assistant and report submission stay sign-in-gated (acceptable under the
policy); local export must work so journal reviewers can exercise the full builder + download a
panel without an account.

Two product decisions are already settled (confirmed with the user):
- **Sync UX:** explicit per-panel "Push to cloud" button *plus* a one-time post-login toast
  offering "Push all N local panels to your account". Nothing syncs without a click.
- **Guest scope:** full parity — the `/panel` page, the right-edge Panel Drawer, **and** the
  "Add to panel" buttons on browse/search results all work logged-out against a local panel.

## Goals / Non-goals

**Goals**
- Guests create / edit / export panels with no account; data persists in `localStorage`.
- One persistence abstraction (`PanelRepository`) with a **local** and a **cloud** implementation;
  UI components are backend-agnostic (DRY — today's `fetch` calls are scattered across 6 files).
- Logged-in users see local + cloud panels in one list; local ones badged; one-click push to cloud.
- Encourage sign-in with a non-blocking CTA.

**Non-goals**
- AI assistant working on local panels (stays cloud-only by design — server tools require auth).
- Report submission for guests (stays gated).
- Cross-device sync of local drafts (localStorage is per-device until pushed).

## Core design — a `PanelRepository` abstraction

Today every mutation is a direct `fetch("/api/panels/...")` inside a component. We introduce one
client-side interface and route by panel origin. Crucially, the **data shapes do not change**:
local and cloud both produce `Panel` / `PanelCycle` / `PanelMarker` from
`components/panel/types.ts`, so component logic (optimistic updates, callbacks) is untouched — only
the call sites swap `fetch(...)` for `repo.xxx(...)`.

```ts
// components/panel/panel-repository.ts  (new)
export interface PanelRepository {
  list(): Promise<Panel[]>
  get(panelId: string): Promise<Panel | null>
  create(input: CreatePanelInput): Promise<Panel>
  update(id: string, patch: UpdatePanelInput): Promise<Panel>
  remove(id: string): Promise<void>
  addCycle(panelId: string, input: AddCycleInput): Promise<PanelCycle>
  updateCycle(panelId: string, cycleId: string, patch: { notes: string | null }): Promise<PanelCycle>
  removeCycle(panelId: string, cycleId: string): Promise<void>
  addMarker(panelId: string, input: AddMarkerInput): Promise<PanelMarker>
  updateMarker(panelId: string, markerId: string, patch: UpdateMarkerInput): Promise<PanelMarker>
  removeMarker(panelId: string, markerId: string): Promise<void>
  reorderMarkers(panelId: string, items: ReorderItem[]): Promise<void>
}
```

**Origin routing by id prefix (KISS, no type changes):** local panels get ids `local_<uuid>`
(`crypto.randomUUID()`); cloud ids are cuids. `isLocalPanelId(id) = id.startsWith("local_")`.
The "Local" badge and routing are then pure functions of the id — no new field on `Panel`.

Three pieces:

1. **`CloudPanelRepository`** — the existing `fetch` calls, lifted verbatim into one module.
   This alone removes duplication (same fetch logic currently lives in `panel-workspace`,
   `panel-list`, `cycle-section`, `marker-search-dialog`, `marker-card`, `add-to-panel-button`).

2. **`LocalPanelRepository`** — delegates to a persisted Zustand store, wrapping synchronous
   in-memory mutations in `Promise.resolve(...)`. Mirrors cloud semantics: `create()` seeds a
   "Cycle 1" (matching `createPanel` in `models/panel/queries.ts:301`).

3. **`usePanelRepository()`** — a thin hook over `useSession()` returning a composite that:
   - `list()` → merge local panels with cloud panels (cloud only when authenticated).
   - mutations → dispatch on `isLocalPanelId(panelId)`.
   - `create()` → **cloud when logged in** (best experience), **local when logged out**.

### Local store — `stores/local-panels.ts` (new)

Zustand + `persist` middleware, key `panelmaker:local-panels:v1`. Holds `panels: Panel[]` (the
full nested client shape). Exposes the same verbs as the repository. Notes:
- IDs via `crypto.randomUUID()` (client-only; store is used solely in `"use client"` components).
- **Marker enrichment:** `AddMarkerInput` carries optional resolved display objects
  (`protein`, `antibody`, `fluorophore`) so the local repo can build a full `PanelMarker` with no
  server join. The search dialog already holds these: the selected `SearchResult` + the
  `FluorophoreOption` (which is exactly `{ id, name, excitation, emission }` —
  `components/fluorophore-combobox.tsx:10`), so spectral-overlap validation works offline. The
  cloud repo ignores the display objects and sends only ids/labels (then refetches, as today).
- Local mutations reuse the existing `usePanelsSignal` signal (`stores/panels.ts`) so the
  workspace re-reads `repo.list()` exactly as it re-fetches today — same refresh pattern, no new
  reactivity wiring.

### Client-side validate + export (one path for both origins)

`models/panel/intelligence.ts` is **client-safe** (only `import type` from `queries.ts`, erased at
build; no `server-only`, no Prisma) and operates on an in-memory panel. The active panel object is
already in memory for both origins, so we run `validatePanel()` and `exportPanelCsv/OrderCsv/Json()`
client-side for **all** panels. This:
- makes guest export "just work" (the journal-reviewer requirement),
- removes the `/api/panels/[id]/validate` and `/export` round-trips,
- is a real DRY win (one validation/export path instead of server + client).

Export builds the Blob + filename in `panel-workspace.tsx` `handleExport` instead of reading the
server's `Content-Disposition`.

## Sync — "Push to cloud"

A new authenticated, rate-limited endpoint imports a whole panel in one transaction.

- **`POST /api/panels/import`** — `requireAuth`, reuse `RATE_LIMITS.PANELS_CREATE`. Body is the
  full panel payload (name, description, species{id,label}, fixation, condition{id,label},
  cycles[{ name, notes, markers[{ proteinId/proteinLabel/geneSymbol/ensemblGeneId, antibodyId,
  fluorophoreId, metalTag }] }]). Creates everything in one `prisma.$transaction`, **reusing**
  `createPanel` / `addCycle` / `addMarker` query building blocks and replicating the protein
  `upsert` from the markers route (`app/api/panels/[id]/markers/route.ts:55`, since UniProt
  accessions aren't cuids). Returns a `PanelResponse`.
  - New: `importPanelSchema` in `models/panel/schema.ts`, `importPanel(data, ownerId)` in
    `models/panel/queries.ts`.

- **`pushToCloud(localPanelId)`** (composite repo / hook): map the local panel → import payload,
  `POST /api/panels/import`, on success delete the local panel from the store and switch the active
  panel to the returned cloud id, then `notifyPanelsChanged()`.

- **One-time post-login prompt:** a small client component mounted in the app shell uses
  `useSession()`; when the user transitions to authenticated and local panels exist, show a single
  toast/banner "You have N local panels — [Push all] [Keep local]". "Push all" loops
  `pushToCloud` over local panels. Dismissal is remembered for the session.

## UI changes

- **`app/panel/page.tsx`** — always render `PanelWorkspace`; replace the gated message with a
  non-blocking sign-in CTA banner shown only to guests ("Panels are saved on this device. Sign in
  to sync them and use the AI assistant.").
- **`components/panel/panel-drawer.tsx`** — drop `if (!session?.user) return null`; show for
  everyone; `fetchPanelCount` → `repo.list()` (counts local + cloud).
- **`components/panel/panel-workspace.tsx`** — `fetchPanels`→`repo.list()`, create/delete/update
  via repo; client-side validate/export; render a **"Local" badge** in the panel `Select` items and
  near the active-panel header; when active panel is local **and** authenticated, show a
  **"Push to cloud"** button beside export/delete. Hide/disable the `VisibilitySelector` for local
  panels (a local panel can't be PUBLIC/LAB) with a "Sign in to share" hint.
- **`panel-list.tsx`, `cycle-section.tsx`, `marker-search-dialog.tsx`, `marker-card.tsx`** — swap
  their `fetch` calls (reorder, add/remove cycle, cycle notes, add marker, marker update) for the
  matching `repo.*` methods. Keep the public `/api/proteins`, `/api/antibodies`,
  `/api/fluorophores` search fetches as-is (already unauthenticated).
- **`components/panel/add-to-panel-button.tsx`** — remove the `if (!session?.user) return null`
  guard; use the composite repo so guests can add browse/search results to a local panel. The AI
  *server* tools remain cloud-only, so "AI assistant only works with cloud panels" still holds.

## Edge cases / risks

- **Persist hydration:** Zustand `persist` hydrates on the client; the workspace already renders a
  skeleton from a `useEffect`, so there's no SSR mismatch. Keep the store client-only.
- **Partial antibody data on local markers:** browse/search results don't always include
  `hostTaxon`/`catalogNumber`; cross-reactivity validation may be weaker locally but resolves on
  push (server re-joins). Acceptable degradation.
- **localStorage limits / private browsing:** wrap reads/writes defensively; fall back to
  in-memory if storage is unavailable.
- **Protein ids on push:** import endpoint must upsert proteins exactly like the markers route or
  the FK insert fails.

## Representative files

New: `stores/local-panels.ts`, `components/panel/panel-repository.ts` (interface + cloud/local/
composite + `usePanelRepository`), `app/api/panels/import/route.ts`, a post-login prompt component
(e.g. `components/panel/local-panel-sync-prompt.tsx`).
Modified: `models/panel/{schema.ts,queries.ts,index.ts}` (import schema + query), `app/panel/page.tsx`,
`components/panel/{panel-workspace,panel-drawer,panel-list,cycle-section,marker-search-dialog,
marker-card,add-to-panel-button}.tsx`.

## Verification (if/when built)

1. **Guest flow (Chromium via argent or manual):** logged out, open `/panel` → create panel, add
   cycle + marker + fluorophore, reload page → state persists; export CSV/JSON downloads; add a
   marker from a browse result → lands in the local panel.
2. **Sync:** sign in → one-time prompt appears; "Push to cloud" on a local panel creates the cloud
   panel (verify in Prisma Studio / `GET /api/panels`), local copy disappears, active panel becomes
   the cloud one; "Push all" handles multiple.
3. **AI stays cloud-only:** assistant does not see local panels.
4. **Regression:** existing logged-in create/edit/reorder/visibility/export still pass; run
   `npm run lint` and the Playwright suite (`tests/*.spec.ts`), add a guest-panel spec.

## Open decisions to revisit

- Whether to pursue NAR at all (this whole effort is conditional).
- Whether local panels should be capped (e.g. max N drafts) to bound localStorage.
- Badge wording ("Local" vs "On this device" vs "Draft").
