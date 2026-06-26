# Data model

Prisma generates to `lib/generated/prisma` (provider `prisma-client`). Enums import from `@/lib/generated/prisma/enums`. All PKs are `String @id @default(cuid())`.

## New enums

```prisma
enum LabRole { OWNER ADMIN MEMBER VIEWER }
enum LabInvitationStatus { PENDING ACCEPTED DECLINED REVOKED EXPIRED }
enum LabAntibodyStatus { IN_STOCK LOW ORDERED OUT_OF_STOCK }
enum Visibility { PRIVATE LAB PUBLIC }
```

## New models

- **Lab** - root entity. `slug @unique`, `institution` (display name) + `institutionId` (ROR id, optional, like the User), `createdById` SetNull, `isPublicProfile` default false. Relations: memberships, invitations, inventory, experimentShares, panelShares, owningExperiments, owningPanels.
- **LabMembership** - User<->Lab junction. `role LabRole @default(MEMBER)`, `@@unique([userId, labId])`. `user`/`lab` onDelete Cascade, `invitedBy` SetNull.
- **LabInvitation** - `tokenHash @unique` (sha256), `email?`, `role`, `status`, `maxUses? @default(1)`, `useCount`, `expiresAt`, `acceptedAt?`. `lab` Cascade; `invitedBy`/`acceptedBy` SetNull.
- **LabAntibody** - inventory. `@@unique([labId, antibodyId])`, `status LabAntibodyStatus`, plus `storageLocation`, `freezerLocation`, `lotNumber`, `vendorCatalog`, `aliquotsRemaining`, `notes`, `lastValidatedAt`. `lab`/`antibody` Cascade, `addedBy` SetNull.
- **ExperimentLabShare** - `@@id([experimentId, labId])`, both Cascade, `@@index([labId])`.
- **PanelLabShare** - `@@id([panelId, labId])`, both Cascade, `@@index([labId])`.

## Deltas to existing models

- **Experiment**: `visibility Visibility @default(PUBLIC)`, `owningLabId String?` + `owningLab` (SetNull), `labShares`, `@@index([visibility])`, `@@index([owningLabId])`. (`isPublic` was dropped in Phase 8 - `visibility` is authoritative.)
- **Panel**: `visibility Visibility @default(PRIVATE)`, `owningLabId String?` + `owningLab` (SetNull), `labShares`, the two indexes. (`isPublic` was dropped in Phase 8.)
- **User**: rename `submissionAccess` -> `accessStatus` (enum `SubmissionAccess` -> `AccessStatus`), `submissionRequestedAt` -> `accessRequestedAt`. Add back-relations: `labsCreated`, `labMemberships`, `membershipsInvited`, `labInvitesSent`, `labInvitesAccepted`, `labAntibodiesAdded`.
- **Antibody**: add `labInventory LabAntibody[]` (stays global/ownerless).

## Cascade rationale

- Deleting a **Lab** cascades memberships, invitations, inventory, and share rows, but NOT user-owned experiments/panels (those keep `owningLabId` via SetNull and lose lab visibility once shares are gone).
- Deleting a **User** cascades their memberships (guard the last-OWNER case in app code), SetNull on provenance fields (`createdBy`, `invitedBy`, `addedBy`, `owningLab`, `submitter`, `owner`).
- Deleting an **Experiment/Panel** cascades its share rows.

## Migrations (as actually applied)

1. `rename_access_status` - `ALTER TYPE "SubmissionAccess" RENAME TO "AccessStatus"` and `ALTER TABLE "User" RENAME COLUMN` for `submissionAccess` -> `accessStatus` and `submissionRequestedAt` -> `accessRequestedAt` (preserves data; hand-authored).
2. `add_lab_structure` - the new enums (`LabRole`, `LabInvitationStatus`, `LabAntibodyStatus`, `Visibility`), all lab models (`Lab`, `LabMembership`, `LabInvitation`, `LabAntibody`, `ExperimentLabShare`, `PanelLabShare`), the User/Antibody back-relations, AND the `Experiment`/`Panel` `visibility`/`owningLabId`/`labShares` columns + indexes, all in one migration. Hand-added backfill `UPDATE`s: `Experiment` `isPublic=false -> visibility=PRIVATE`, `Panel` `isPublic=true -> visibility=PUBLIC`.
3. `add_lab_institution_id` - add `Lab.institutionId` (the ROR id).
4. `drop_ispublic` (applied) - drop the transitional `isPublic` mirror columns + both `@@index([isPublic])`. Hand-authored (interactive data-loss guard blocks non-interactive `migrate dev`); applied via `prisma db execute` + `migrate resolve --applied`.

Always `--create-only`, review SQL, apply on the shadow DB. `SHADOW_DATABASE_URL` required for `migrate dev`. (Prisma 7 reads the datasource URL from `prisma.config.ts`; the rename was hand-authored and applied with `migrate dev` since `--create-only` is interactive on data-loss warnings.)

## Visibility source of truth

`visibility` (PRIVATE/LAB/PUBLIC) is the single source of truth on Experiment/Panel; the transitional `isPublic` mirror was dropped in Phase 8. Public-lane reads key on `visibility: "PUBLIC"`; the private lane uses the viewer-scoped builders. `owningLabId` stays NULL until a user attributes a resource to a lab.
