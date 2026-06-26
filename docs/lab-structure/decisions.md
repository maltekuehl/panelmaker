# Decisions

## Locked with the user

1. **Roles:** `OWNER / ADMIN / MEMBER / VIEWER`. Viewer is read-only (rotation students, external advisors). The matrix degrades cleanly if Viewer is dropped later.
2. **Invitations:** Shareable invite links now. No email library is added; the `email` field and single-use mode stay in the schema so real email invites drop in later.
3. **AI scope:** Lab members' AI queries may read their own lab's unpublished (PENDING) reports. The public/anonymous path only ever sees `PUBLISHED + PUBLIC`.
4. **Edit rights:** A lab `ADMIN`/`OWNER` may edit any experiment/panel shared with (or owned by) that lab. `MEMBER` edits own resources. `VIEWER` edits nothing.
5. **Default submission privacy:** New experiments/reports default to `LAB` when the submitter belongs to at least one lab, otherwise `PRIVATE`. The user opts in to make something public.
6. **Execution:** Phases 1-4 (data model, lab CRUD/membership, invitations, visibility cutover) -> review checkpoint -> Phases 5-8 (UI, inventory, AI, cleanup).
7. **Verified-access gate (rename + join):** One unified verified-access status gates both report submission and lab creation. Rename `SubmissionAccess` -> `AccessStatus`, `User.submissionAccess` -> `accessStatus`, `submissionRequestedAt` -> `accessRequestedAt`. `VERIFIED` unlocks both. Site admins grant it and can always create labs.

## Key abstraction calls

- **Lab is a root entity** (not an owned collection): membership is many-to-many and resources can be shared with multiple labs.
- **Visibility = enum + explicit typed join tables** (`ExperimentLabShare`, `PanelLabShare`), not a polymorphic share table (keeps Prisma FK integrity + cascades) and not a `String[]` of lab ids.
- **`owningLabId`** snapshots attribution separately from the share set, so re-attribution does not happen when people change labs, and the AI query has a clean indexed filter. When visibility is `LAB`, app logic auto-adds the owning lab to the share set.
- **Reports have no visibility column**: they inherit from the parent `Experiment`. Report `status` (publication) is orthogonal to audience (visibility).
- **`LabAntibody` is a separate per-lab model** joined to the global ownerless `Antibody`; operational metadata (storage, lot, stock) never goes on `Antibody`.
- **Lab context resolved per request** (`resolveViewerContext`, React `cache()`), never cached in the JWT, so removal/role changes take effect immediately.
- **`isPublic` kept as a derived mirror** of `visibility == PUBLIC` through Phases 1-7, dropped in Phase 8.

## Adversarial-review fixes folded in

1. Cell-type descendant expansion for the "T cell" query (parentIds is direct-only; build a reverse index). [P7]
2. Close metadata + cached-read leaks under `cacheComponents` (`generateMetadata` and `getReportById` must be PUBLIC-only). [P4]
3. Cache invalidation on visibility/status/share changes (`cacheTag` + `revalidateTag`/`expireTag`). [P4]
4. Invitation hardening: 7-day expiry default, link-mode capped at MEMBER, finite maxUses above MEMBER, in-tx re-check, store only `sha256(token)`. [P3]
5. Last-OWNER lockout guarded on removeMember, changeMemberRole, AND deleteUser. [P2]
6. Thread visibility through all four submit layers in one change (type, buildBatchPayload, schema `.strict()`, hardcoded `isPublic:true`). [P4]
7. AI cross-lab leak: constrain both inventory side and report side to `viewer.labIds`; non-public reports restricted to viewer labs. [P7]
8. Member-removal share cleanup: only drop shares where resource owner == removed user AND `owningLabId != that lab`. [P2]
9. Correct call sites: panel toggle is in `panel-workspace.tsx`; chat uses `@ai-sdk/google`; responses via `@/lib/error-handling`; routes `/labs` (list) + `/labs/[slug]` (detail).
10. `getEventSeverity` is an exhaustive Record - update enum + map together. `shouldPersistEvent` only console-logs today.
11. No em/en dashes in any new UI copy.

## Phase 5 decisions (from review feedback)

- **Lab institution is a ROR id, like the User.** Added `Lab.institutionId`; `LabForm` uses the same `OntologyCombobox ontologyType="ror"` as the profile form, storing `institution` (display name) + `institutionId` (ROR id).
- **The lab page reuses the browse tables.** The `/labs/[slug]` overview shows the lab's Experiments (primary) + Reports (secondary) via the existing `DataTable` + `experimentColumns`/`reportColumns`, fed by new private-lane, member-gated queries `getLabExperimentEntries`/`getLabReportEntries` (all visibilities). It is the private lane, distinct from `/browse` (public lane); browse only gained a public-lane Lab facet filtering by `owningLabId`.
- **DRY header + fully de-carded.** One `LabPageHeader` (breadcrumb + title + inline metadata + tabs) is shared by overview/members/settings. The lab UI uses zero `Card` components; settings matches `app/settings` (de-carded `border-t pt-6` sections).
- **Client-import guard (build-enforced).** A parallel agent shipped a client component importing the `@/models/lab` barrel, which pulled `server-only` Prisma into the client bundle and broke the build. Rule + import-guard test added: `"use client"` files import lab symbols only from `@/models/lab/access` or `@/models/lab/visibility`. See [[lab-structure-foundation]] and access-control.md.
- **Cache invalidation on visibility downgrade is still pending** (see TODO). New submissions default LAB/PRIVATE so they never enter the public cache; the gap is only a PUBLIC->LAB downgrade of already-public content.

## Phase 6 decisions (lab antibody inventory)

- **Antibody-identity facts live on the global `Antibody`; only operational metadata lives on `LabAntibody`.** Adding an inventory item resolves the antibody by RRID (capturing all registry data automatically) and then **gap-fills** curated identity (host species "raised in", target protein, marker name) onto the shared `Antibody` - filling empty fields only, never overwriting, so one lab cannot clobber another lab's / the registry's data. This keeps the killer-query join clean and makes the captured data importable into a later submission.
- **The add dialog mirrors the submit antibody editor** (`AntibodyRegistryCombobox` auto-fill + the same ontology/protein comboboxes), per the user's request to "make use of all the data we can get from the registry" and to "ask for raised-in species."
- **Inventory scales like /browse: server-side pagination + search + sort + faceted filters** (Status, Host species, Clonality), because a real lab stocks hundreds of antibodies. Reuses `lib/data-table.ts` parsers + `DataTable`/`DataTablePagination`/`DataTableFacetedFilter`/`DataTableColumnHeader`. The inventory page is the private/uncached lane (member-gated), distinct from the cached public `/browse`.
- **Home/demo lab is the Puelles Lab (Aarhus University).** `LABS[0]` in the seed is `seed_lab_puelles`; the demo user owns it and the killer-query mouse data is attributed to it. See [[user-lab-affiliation]].
- **Edit is operational-only.** The edit dialog changes stock/storage/lot/aliquots/notes; to (re)curate antibody identity, re-add via the add dialog (the upsert refreshes operational fields and gap-fills identity).
