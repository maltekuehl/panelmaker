# TODO

Living tracker. Check items off as they land. Phases 1-4 are the foundation; pause for review before Phase 5.

## Phase 0 - Docs scaffolding
- [x] Create `docs/lab-structure/` with README, data-model, access-control, decisions, TODO.

## Phase 1 - Schema, migrations, seed
- [x] Rename access gate in `prisma/schema.prisma` (`SubmissionAccess`->`AccessStatus`, `submissionAccess`->`accessStatus`, `submissionRequestedAt`->`accessRequestedAt`).
- [x] Update all `submissionAccess`/`canSubmit` readers so the build passes (lib/auth.ts + 5 files; reports routes keep `canSubmit` alias). Unified gate: `isVerified`/`canSubmit`/`canCreateLab`. tsc clean.
- [x] Migration `rename_access_status` (ALTER RENAME, preserve data) - applied.
- [x] Add enums `LabRole`, `LabInvitationStatus`, `LabAntibodyStatus`, `Visibility`.
- [x] Add models `Lab`, `LabMembership`, `LabInvitation`, `LabAntibody`, `ExperimentLabShare`, `PanelLabShare`.
- [x] Add `User`/`Antibody` back-relations; add `visibility`/`owningLabId`/`labShares` + indexes to `Experiment`/`Panel` (keep `isPublic`).
- [x] Migration `add_lab_structure` (+ hand-added backfill UPDATEs) - applied, schema valid.
- [x] Apply on shadow DB, `prisma generate`.
- [x] Update `prisma/seed.ts`: labs from institution clustering, memberships, LAB experiments (incl. 1 PENDING + works=true), inventory items. seedLabs also syncs visibility<->isPublic for seeded rows. The home lab (`LABS[0]`, the demo user's lab + killer-query attribution target) is the **Puelles Lab at Aarhus University** (`seed_lab_puelles`), with mouse T-cell reports by its members; the other seeded labs remain as background data. (See the user-lab-affiliation memory for the home-lab default.)
- [x] Verify: migrate clean, seed runs, backfill invariant holds, killer-query precondition met, tsc clean. (DB assertions pass.)

## Phase 2 - Lab model layer, CRUD, membership
- [x] `models/lab/{queries,access,visibility,transforms,schema,index}.ts`. access.ts + visibility.ts are pure (type-only Prisma import), unit-testable.
- [x] Generalize access helpers in `lib/auth.ts` (`getAccessState`, `isVerified`, `canSubmit` alias, `canCreateLab`, `requestAccess`/`grantAccess`/`revokeAccess`). (done in Phase 1 rename)
- [x] `resolveViewerContext` (React cache), `requireLabMember`, `requireLabRole`, `authErrorResponse`; extend `createAuthHandler` catch (403/404).
- [x] `LAB_*` SecurityEventType members + severities (enum AND exhaustive map updated together).
- [x] RATE_LIMITS: `LABS_CREATE` (10/24h), `LAB_INVITATIONS_SEND` (50/24h), `INVENTORY_MUTATE` (300/24h).
- [x] Routes: `app/api/labs/route.ts` (GET, POST gated on `canCreateLab`), `app/api/labs/[id]/route.ts` (GET member/404, PATCH ADMIN, DELETE OWNER), `app/api/labs/[id]/members/[userId]/route.ts` (PATCH role, DELETE remove/leave).
- [x] Last-OWNER guard on removeMember + changeMemberRole + extend `deleteUser` (getSoleOwnerLabIds).
- [x] Member-removal share cleanup (only ex-member-owned, non-lab-owned shares).
- [x] Tests: pure predicate + visibility-builder assertions + fail-closed + purity guard + import guard (`tests/unit/lab-access.ts`, `npm run test:unit`). 14 assertions pass (the import guard was added in Phase 5).
- [x] tsc clean, eslint clean. (Full e2e API smoke deferred to checkpoint manual verification.)

## Phase 3 - Invitations
- [x] Invitation queries (create/accept/decline/revoke/list/sweepExpired + getInvitationView) with hardening: sha256 token hash, 7-day expiry, link-mode capped at MEMBER, ADMIN invites need finite maxUses, atomic conditional-increment claim prevents maxUses overrun, email-mismatch rejected.
- [x] Schemas `.strict()` (inviteToLabSchema, acceptInvitationSchema).
- [x] Routes: `app/api/labs/[id]/invitations/route.ts` (POST ADMIN + rate limit + returns accept URL once; GET list), `.../[invId]/route.ts` (DELETE revoke), `app/api/invitations/accept|decline/route.ts`.
- [x] Page `app/lab/join/[token]/page.tsx` (uncached) + `components/lab/join-invitation.tsx` client actions.
- [x] tsc clean, eslint clean (purity: expiry computed in model layer, not render). Full accept-flow verified at checkpoint via running app.

## Phase 4 - Two-lane visibility cutover
- [x] `buildReportWhere(q, filters, viewer=null)` + `getPublicReportById`/`getVisibleReportById`/`getVisibleReportsForExperiment`. Public callers unchanged (viewer=null).
- [x] `models/experiment/queries.ts`: public lane + `getVisibleExperimentById`.
- [x] `models/panel/queries.ts`: `getVisiblePanels`/`getVisiblePanelById`; createPanel/updatePanel write visibility + mirror isPublic + manage PanelLabShare rows.
- [x] Thread visibility+sharedLabIds+owningLabId through submit (schema, ExperimentContextInput, resolveAndCreateReports/createReport). Centralized `resolveResourceVisibility` in models/lab (LAB-default for experiments, PRIVATE for panels); validates every share/owningLab against the owner's memberships server-side.
- [x] Panel `[id]` route + all sub-routes (cycles, markers, reorder, validate, export) + `app/panel/[id]/page.tsx` -> canViewPanel/canEditPanel (admins can edit shared).
- [x] Metadata leak fixes: panel/[id] + report/[id] generateMetadata are PUBLIC-only; report & experiment detail bodies are viewer-aware (uncached, members see PENDING lab work). `getReportById` leak closed via `getPublicReportById`.
- [x] Verify: `next build` passes under cacheComponents (no auth() in "use cache"); tsc 0; eslint clean; prettier clean; unit assertions pass.
- [x] Panel-workspace isPublic toggle swapped for VisibilitySelector (done in Phase 5).
- [~] STILL PENDING: comprehensive `cacheTag`/`revalidate` on visibility *downgrade* of an existing resource. New submissions default LAB/PRIVATE so they never enter the public cache, and the admin approve route already revalidates; a true PUBLIC->LAB downgrade of existing public content is the remaining gap (wire when the visibility-edit-of-existing flow lands).

## >>> CHECKPOINT: pause for user review <<<

## Phase 5 - Lab UI, nav, visibility selector  (DONE - built via parallel subagents)
- [x] Sidebar "Labs" entry (`components/app-sidebar.tsx`, FlaskConical).
- [x] Shared components: `components/lab/lab-link.tsx`, `components/shared/visibility-selector.tsx` (hides LAB option when user has no labs), `components/lab/lab-form.tsx` (create/edit, handles 403 NOT_VERIFIED), `lab-tabs-nav.tsx`, `invite-member-form.tsx` (copies the returned accept link), `member-manager.tsx` (roles/remove/leave/revoke), `delete-lab-button.tsx`.
- [x] Pages: `app/labs/page.tsx` (my labs + verify-gate notice + empty state), `app/labs/new`, `app/labs/[slug]/page.tsx` (dashboard / public profile / notFound), `app/labs/[slug]/members`, `app/labs/[slug]/settings` (edit + OWNER danger zone). All dynamic (no "use cache").
- [x] VisibilitySelector wired into submit (`components/submit/*` + `app/(content)/submit/page.tsx` passes the user's labs) and the panel designer (`panel-workspace.tsx`; `models/panel/transforms.ts` now exposes visibility/owningLab/sharedLabIds).
- [x] Lab attribution (LabLink) on panel/report/experiment detail pages (owningLab exposed on the selects).
- [x] FIX (build-caught): `member-manager.tsx` imported the server-only `@/models/lab` barrel into a client bundle; repointed to `@/models/lab/access`. Added an import-guard unit test so no "use client" file can pull in server-only lab/prisma code again.
- [x] Verify: `next build` passes (all 5 lab routes build as dynamic/partial-prerender; no `auth()` inside any `"use cache"`), tsc 0, eslint + prettier clean, unit suite (14 assertions) passes.

## Browse - Lab facet  (DONE)
- [x] Added a "Lab" facet/filter to `/browse` (lib/data-table.ts dimension+parser, report WHERE_BUILDERS+FACET_EXTRACTORS via `experiment.owningLab`, experiment-tab `buildExperimentWhere`). Stays in the PUBLIC lane: filters public results by the lab they are attributed to (`owningLabId`); never exposes private lab content. Seed + a live update attribute one public experiment to the Stanford lab so the facet has data.

## shadcn components
- [x] Checked: all UI components used by the new lab UI already exist (full build resolves every `@/components/ui/*` import); nothing to install.

## Phase 5 refactor (review feedback)
- [x] DRY header: extracted `components/lab/lab-page-header.tsx` (breadcrumb + title + inline metadata + LabTabsNav). Replaced the triplicated/inconsistent header blocks in the overview, members, and settings pages with it.
- [x] Lab page now shows the lab's content by reusing the browse tables: `getLabExperimentEntries(labId)` + `getLabReportEntries(labId)` (private lane, member-gated, all visibilities) feed `DataTable` with the existing `experimentColumns`/`reportColumns` inside a shadcn `Tabs` (Experiments primary, Reports secondary). Dropped the at-a-glance/member-preview clutter ("nothing else").
- [x] De-card: `/labs/new` verification notice is now a bordered callout (was a Card). Remaining Card is `LabForm` only (a form, which the house rule permits).
- [x] Verify: tsc 0, eslint + prettier clean, unit suite passes, `next build` OK.

## Phase 5 refactor round 2 (review feedback)
- [x] Lab settings matches the user settings page style: de-carded `<section className="space-y-4 border-t pt-6">` blocks ("Lab details", "Danger zone"), no Cards. `LabForm` rewritten to plain `Label`+`Input` (dropped the Card + RHF Form wrapper) like `app/settings/profile-section.tsx`. The lab UI now uses zero `Card` components.
- [x] Lab institution is a ROR id, like the user: added `Lab.institutionId` (migration `add_lab_institution_id`), threaded through schema/queries/transforms, and `LabForm` uses `<OntologyCombobox ontologyType="ror">` storing `institution` (name) + `institutionId` (ROR id). Seed labs now carry ROR ids; applied to existing seeded labs via non-destructive update.
- [x] Verify: tsc 0, eslint + prettier clean, unit passes, `next build` OK.

## Phase 6 - Lab antibody inventory  (DONE)
- [x] Model layer: `getLabInventory` (full, for the AI query), `getLabInventoryPage` (paginated/searchable/sortable/filterable), `getLabInventoryFacets` (host + clonality facets with counts), `upsertLabAntibody` (resolves the global `Antibody` by RRID first, then gap-fills curated identity), `updateLabAntibody`, `removeLabAntibody`. All scoped by `labId` (no cross-lab IDOR). Schemas `addLabAntibodySchema`/`updateLabAntibodySchema` (`.strict()`), `toLabAntibodyResponse` transform, barrel exports.
- [x] Rich add: the add dialog reuses the `AntibodyRegistryCombobox` (auto-imports vendor/catalog/clone/target/host like the submit form) and captures antibody-identity facts - notably **host species ("raised in")**, target protein, marker name. `upsertLabAntibody` gap-fills these onto the shared global `Antibody` (only empty fields, never overwriting) so the data is available for later submission import.
- [x] Routes: `app/api/labs/[id]/inventory/route.ts` (GET member, POST MEMBER+ rate-limited via `INVENTORY_MUTATE`), `.../[itemId]/route.ts` (PATCH/DELETE MEMBER+; VIEWER blocked). RRID-unresolvable add returns 422.
- [x] UI: `inventory-columns.tsx` (sortable headers via `DataTableColumnHeader`, cross-links marker/antibody/profile), `inventory-form-dialog.tsx` (one dialog, add + edit modes), `inventory-manager.tsx` (search + Status/Host/Clonality faceted filters + `DataTablePagination` + add/edit/delete), `app/labs/[slug]/inventory/page.tsx` (member-gated, parses nuqs params). "Inventory" tab added to `LabTabsNav`.
- [x] Pagination/search/sort/filter mirror `/browse`: `labInventoryParsers` (nuqs: sort/order/page + q + status/host/clonality arrays) in `lib/data-table.ts`, server-side `getLabInventoryPage` (offset paging, `DEFAULT_PAGE_SIZE`), reuses `DataTable`/`DataTablePagination`/`DataTableFacetedFilter`/`DataTableColumnHeader`. Scales to hundreds of antibodies.
- [x] Reuse local-type pattern: client `InventoryItem` is declared in `inventory-columns.tsx` (mirrors `LabAntibodyResponse`) so no `"use client"` file imports the server-only lab barrel. Import guard still green.
- [x] Verify: tsc 0, eslint 0 errors (4 pre-existing warnings unrelated), prettier clean, unit suite (14) passes, `next build` OK (inventory route builds as partial-prerender).

## Phase 6b - Submit-side import from lab inventory  (DONE)
- [x] `getImportableInventory(labIds, q?)` (models/lab) + `GET /api/labs/inventory/mine` (viewer-resolved, scoped to the user's own labs). `components/submit/lab-inventory-combobox.tsx` queries it (debounced, minLength 0 so it lists stock on open).
- [x] Per-row "Import from lab" picker in the submit antibody editor (`antibody-accordion.tsx`, threaded `hasLabs` from `submission-form.tsx`): pre-fills rrid/vendor/catalog/clone/target protein/marker/host species. Submit resolves the existing global Antibody by RRID, so the captured host species flows through. Shown only when the user belongs to a lab.

## Phase 6c - Lab overview: panels tab + search/sort  (DONE)
- [x] Lab overview (`/labs/[slug]`) now has Experiments / Reports / **Panels** tabs via `components/lab/lab-content-tabs.tsx` (client). Reuses browse `experimentColumns`/`reportColumns` with a prepended **Member** column (profile-linked); panels use a local `labPanelColumns` (name/member/markers/cycles/species/visibility/updated).
- [x] Searchable (incl. by **team member** name) and sortable (date + name + member + counts), client-side over the loaded entries. `submitter` added to `ExperimentEntry`/`ReportEntry` (+ selects/transforms); new `getLabPanelEntries(labId)` + `LabPanelEntry` in models/panel.
- [x] Verify: tsc 0, eslint 0 errors, prettier clean, unit suite passes, `next build` OK.

## Phase 7 - AI lab-scoped queries (DONE - see ai-queries.md for the 20 target queries)

- [x] `getCellTypeDescendantIds(rootId)` (models/cell-type): reverse `parentIds` index walk, memoized per request, so "T cell" matches CD4/CD8.
- [x] `models/evidence`: the viewer-scoped evidence workhorse - `findReports(viewer, filter, limit)` (rich filter: markers/cellTypes/tissue/species/method/antibody/rrid/host/clonality/conjugate/fluorophore/works/quality/specificity/submitter/condition) and `aggregateReports(viewer, filter, groupBy)` (works-rate + strong-signal rollups). Both delegate scope to `buildReportVisibilityWhere` (fail-closed).
- [x] `getInventoryForLabs(labIds, filter)` (models/lab) for AI inventory queries across the viewer's labs.
- [x] `lib/chat-tools.ts` -> `createChatTools(viewer)` with the composable toolkit: resolveMarkers/CellTypes(+expand)/Species/Tissues/Antibodies, getMarkerDetails, getAntibodyDetails, findReports, aggregateReports, listMyLabs, getLabInventory, getLabPanels, analyzePanel, getPanelLayoutSignals. Every tool closes over the viewer; a model-supplied scope/labIds is intersected with the viewer's memberships (no cross-lab leak).
- [x] `app/api/chat/route.ts`: resolves the viewer (`resolveViewerContext`) and passes `createChatTools(viewer)`; system prompt rewritten with the toolkit guidance, panel-layout best practices (#5), and a data-isolation clause.
- [x] Verify: tsc 0, eslint 0 errors, prettier clean, unit suite (14) passes, `next build` OK. Runtime check of the 20 queries needs a re-seed (`npx prisma db seed` + `npm run seed:demo-user`) since it resets the DB; the Puelles lab's mouse T-cell data backs #6/#16/#19.

## Phase 8 - Drop isPublic (DONE)

- [x] Audited every `isPublic` reader/writer (excluding Lab `isPublicProfile`). Switched all public-lane reads to `visibility: "PUBLIC"` (app home count, experiment/report detail + metadata guards, `models/experiment` browse where + header select, all `models/experimental-report` public-lane queries, all `models/user` stat queries, `getPublicPanels`).
- [x] Removed the mirror writes: `resolveResourceVisibility` no longer takes/returns `isPublic`; `createPanel`/`updatePanel`/`resolveAndCreateExperiment` write `visibility` only; dropped `isPublic` from `panelSelect`/`reportSelect`/`experimentHeaderSelect`, the panel + report Zod schemas, the `Panel` client type + `panel-workspace` state, and the batch report payload.
- [x] `models/panel/intelligence.ts` export report keeps an `isPublic` field but now derives it (`panel.visibility === "PUBLIC"`).
- [x] Schema: removed `Experiment.isPublic`/`Panel.isPublic` + both `@@index([isPublic])`. Migration `20260625150000_drop_ispublic` (hand-authored: drop indexes + columns; the interactive data-loss guard blocks `migrate dev` non-interactively), applied via `prisma db execute` + `migrate resolve --applied`; client regenerated; `migrate status` clean.
- [x] Seed: experiments/panels now set `visibility` directly (default PUBLIC for experiments, explicit PUBLIC for the two public panels); removed the isPublic->visibility sync pass.
- [x] Verify: tsc 0, eslint 0 errors, prettier clean, unit suite (14) passes, `next build` OK (77/77). NOTE: did not re-run `prisma db seed` (it resets the DB) - run it locally to repopulate.
