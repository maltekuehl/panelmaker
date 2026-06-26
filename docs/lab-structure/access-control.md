# Access control

## Where it lives

- `models/lab/access.ts` - pure predicates, NO prisma client, NO `server-only` (type-only Prisma import) so it is unit-testable: `ViewerContext`, `ROLE_RANK`, `isLabMember`, `hasLabRole`, `LabAction` + `canDoLabAction` (the lab-management capability map), `ResourceVisibility`, `canViewResource`/`canEditResource` (the core predicates), `experimentResource`/`panelResource` (row -> ResourceVisibility adapters), and the typed wrappers `canViewExperiment`/`canEditExperiment`/`canViewPanel`/`canEditPanel`.
- `models/lab/visibility.ts` - the single source of truth for Prisma where-builders (type-only Prisma import): `buildExperimentVisibilityWhere`, `buildReportVisibilityWhere`, `buildPanelVisibilityWhere`, plus the fail-closed `assertViewer`.
- `models/lab/queries.ts` - `import "server-only"` + prisma; all DB access.
- `lib/auth.ts` - request guards: `resolveViewerContext` (React `cache()`), `requireLabMember`, `requireLabRole`, `authErrorResponse`; `isVerified`/`canCreateLab` (the verified-access gate); `createAuthHandler` maps lab errors to 403/404.

**Client-import rule (build-enforced):** `"use client"` files must import lab symbols ONLY from `@/models/lab/access` or `@/models/lab/visibility` (both pure). They must NEVER import the `@/models/lab` barrel, `@/models/lab/queries`, `@/lib/prisma`, or `server-only` - the barrel re-exports the server-only queries and breaks the client bundle. The import-guard unit test enforces this.

## ViewerContext

```ts
type ViewerContext = {
  userId: string
  labIds: string[]
  roleByLab: Record<string, LabRole>
  isAdmin: boolean
}
```

Resolved per request from one indexed `LabMembership` query, memoized with React `cache()`. Never stored in the JWT.

## RBAC matrix

| Action | OWNER | ADMIN | MEMBER | VIEWER |
|---|---|---|---|---|
| View lab content (incl. unpublished) | yes | yes | yes | yes |
| Create lab | VERIFIED user (or site ADMIN) only; creator becomes OWNER | | | |
| Edit lab settings / profile | yes | yes | no | no |
| Invite member / revoke invite | yes | yes | no | no |
| Change member role | yes | yes (not OWNER, no self-promote to OWNER) | no | no |
| Remove member | yes | yes (not OWNER) | no | no |
| Delete lab | yes | no | no | no |
| Add / edit / remove inventory | yes | yes | yes | no |
| Create experiment/panel in lab | yes | yes | yes | no |
| Edit any LAB-shared experiment/panel | yes | yes | own only | no |
| Set/change a resource's visibility | yes | yes | own only | no |
| Un-share a resource from the lab | yes | yes | own only | no |
| Run lab-scoped AI queries | yes | yes | yes | yes |

`ROLE_RANK = { VIEWER: 0, MEMBER: 1, ADMIN: 2, OWNER: 3 }`. Edit predicate: `resource.ownerId === viewer.userId` OR viewer holds ADMIN/OWNER in `resource.owningLabId` OR in any lab in the resource's share set.

## Two-lane visibility

`cacheComponents` forbids `auth()` inside `"use cache"`. So:

- **Public lane** (cached): existing browse/detail reads, `viewer = null`, PUBLIC-only predicate. Never receives a viewer.
- **Private lane** (uncached): new `getVisible*` functions take a `ViewerContext`; the only path that returns LAB/PRIVATE data. Used by API routes, chat tools, and uncached page sections.

## Visibility predicate (reports)

```ts
buildReportVisibilityWhere(viewer): { OR: [
  { status: "PUBLISHED", experiment: { visibility: "PUBLIC" } },                              // public
  ...(viewer?.userId ? [{ experiment: { submitterId: viewer.userId } }] : []),                 // own
  ...(viewer?.labIds?.length
      ? [{ experiment: { visibility: "LAB", labShares: { some: { labId: { in: viewer.labIds } } } } }]
      : []),                                                                                   // lab-shared
]}
```

`viewer = null` collapses to PUBLIC-only. **Fail closed:** the builders throw on a truthy-but-empty viewer object so a coding slip cannot widen to open. The public branch keys on `visibility: "PUBLIC"` (the transitional `isPublic` mirror was dropped in Phase 8; `visibility` is now the sole source of truth).

## Tests (`tests/unit/lab-access.ts`, run via `npm run test:unit`)

14 pure assertions (no DB), all passing:

- `ROLE_RANK` ordering (VIEWER < MEMBER < ADMIN < OWNER);
- PUBLIC visible to anonymous (null viewer); PRIVATE/LAB not visible to anonymous;
- owner can view own PRIVATE resource;
- LAB resource visible to a shared-lab member, not to an outsider;
- edit predicates: owner edits own, lab ADMIN edits shared, plain MEMBER cannot edit another's;
- `canDoLabAction` matrix across roles/actions;
- `buildReportVisibilityWhere(null)` yields a single PUBLIC-only clause;
- `buildReportVisibilityWhere(member)` adds own + lab clauses (3 total);
- empty `labIds` never emits a `labShares` clause;
- panel builder mirrors the report builder shape;
- builders fail closed on a truthy-but-empty viewer;
- purity guard: `access.ts`/`visibility.ts` import neither prisma client nor `server-only`;
- import guard: no `"use client"` file imports `@/models/lab` (barrel), `@/models/lab/queries`, `@/lib/prisma`, or `server-only`.
