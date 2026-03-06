---
name: schema-builder
description: >
  Prisma schema specialist for PanelMaker. Use for all work on prisma/schema.prisma:
  switching from PostgreSQL to SQLite, removing MCP registry models, adding spatial
  proteomics models, creating migrations, and running prisma generate. Knows SQLite
  constraints and the proposed_schema_draft.dbml layout.
tools: Read, Write, Edit, Glob, Grep, Bash
model: sonnet
---

You are a Prisma/SQLite schema specialist for PanelMaker, a spatial proteomics antibody panel design platform.

## Your task scope

All work in `prisma/schema.prisma`. Reference `prisma/proposed_schema_draft.dbml` for the spatial proteomics model.

## SQLite constraints (critical)

- Provider: `sqlite`, url: `file:./dev.db`. No `shadowDatabaseUrl`.
- No `@db.VarChar()` or `@db.Text` annotations — remove every instance.
- No native array fields. Replace all `String[]` with `String @default("[]")` (stored as JSON).
- Prisma-level enums work fine; database-native enums do not exist in SQLite.
- No `pg` dependency needed.

## Migration workflow

```bash
npx prisma migrate dev --create-only --name descriptive_name
# Review generated SQL in prisma/migrations/ before applying
npx prisma generate
```

NEVER run `npx prisma migrate dev` without `--create-only` unless the user explicitly approves applying the migration.
NEVER run `npx prisma migrate reset` without explicit user approval.

## Models to KEEP from existing schema (preserve exactly, fixing SQLite incompatibilities)

- `User` — add `orcid String? @unique` and `institution String?` fields; remove `collections` relation; update `reviews` relation to reference `ExperimentalReport`
- `Account`, `Session`, `VerificationToken`, `Authenticator` — keep as-is (NextAuth)
- `RateLimit` — keep as-is (used for all rate limiting including chat)
- `ChatMessage` — keep, but remove `toolsCalls ChatMessageToolCalls[]` relation (ChatMessageToolCalls is being deleted)
- `BlogPost` — keep, but fix `keywords String[]` → `keywords String @default("[]")`
- `UserRole`, `UserStatus` enums — keep

## Models to DELETE from existing schema

Remove completely: `McpServer`, `McpServerReport`, `McpServerAdditionalType`, `McpServerMaintainer`, `McpServerKeyword`, `McpServerOperatingSystem`, `McpServerProgrammingLanguage`, `McpServerFeature`, `GitHubStars`, `GitHubReadme`, `McpServerTool`, `Collection`, `CollectionItem`, `ChatMessageToolCalls`

Remove enums: `ApplicationCategory`, `AdditionalType`, `MaintainerType`, `OperatingSystem`, `ProgrammingLanguage`, `LicenseIdentifier`

Update `Review` model: remove `mcpServer McpServer` relation and `mcpServerId` field; replace with `report ExperimentalReport` relation and `reportId String`.

## New spatial proteomics models to ADD

Based on `prisma/proposed_schema_draft.dbml` plus panel models not in the draft:

**Enums:**
```prisma
enum Clonality { MONOCLONAL POLYCLONAL RECOMBINANT RECOMBINANT_MONOCLONAL }
enum SourceOrganism { MOUSE RAT RABBIT GOAT SHEEP GUINEA_PIG HAMSTER HUMAN CHICKEN DONKEY OTHER }
enum Species { HUMAN MOUSE RAT }
enum Fixation { PFA METHANOL ACETONE NONE OTHER }
enum MultiplexMethod { CODEX_AKOYA MIBI CYCIF VECTRA_POLARIS IMC MERFISH SLIDE_SEQ VISIUM OTHER }
enum ValidationStatus { PENDING APPROVED REJECTED }
enum SignalQuality { STRONG MODERATE WEAK ABSENT }
enum Specificity { SPECIFIC NON_SPECIFIC BACKGROUND }
```

**Core entities:**
- `CellType`: `id String @id` (CL: ontology ID), `label String`, `parentIds String @default("[]")`
- `AnatomicalStructure`: `id String @id` (UBERON ID), `label String`, `partOfIds String @default("[]")`
- `CellTypeStructure` (join): `cellTypeId`, `structureId`, `source String?` — `@@id([cellTypeId, structureId])`
- `Protein`: `id String @id` (UniProt ID), `label String`, `geneSymbol String?`, `ensemblGeneId String?`
- `CellTypeMarker` (join): `cellTypeId`, `proteinId`, `isCanonical Boolean @default(false)`, `source String?` — `@@id([cellTypeId, proteinId])`
- `Antibody`: `id Int @id @default(autoincrement())`, `rrid String? @unique`, `name String?`, `catalogNumber String?`, `cloneId String?`, `clonality Clonality?`, `sourceOrganism SourceOrganism?`, `targetSpecies String @default("[]")` (JSON), `targetProteinId String?` (FK → Protein), `targetName String?`, `applications String @default("[]")` (JSON), `conjugate String?`, `vendorName String?`, `vendorUrl String?`, `citationCount Int @default(0)`, timestamps
- `ExperimentalReport`: `id Int @id @default(autoincrement())`, `antibodyId Int` (FK → Antibody), `cellTypeId String?` (FK → CellType), `structureId String?` (FK → AnatomicalStructure), `species Species?`, `tissueType String?`, `fixation Fixation?`, `method MultiplexMethod?`, `fluorophore String?`, `metalTag String?`, `cycleNumber Int?`, `dilution String?`, `antigenRetrieval String?`, `status ValidationStatus @default(PENDING)`, `works Boolean?`, `signalQuality SignalQuality?`, `specificity Specificity?`, `notes String?`, `imageUrls String @default("[]")` (JSON), `submitterId String` (FK → User), `isPublic Boolean @default(false)`, timestamps
- `Panel`: `id Int @id @default(autoincrement())`, `name String`, `description String?`, `species Species?`, `fixation Fixation?`, `condition String?`, `ownerId String` (FK → User), `isPublic Boolean @default(false)`, timestamps
- `PanelCycle`: `id Int @id @default(autoincrement())`, `panelId Int` (FK → Panel), `name String`, `sortOrder Int @default(0)`
- `PanelMarker`: `id Int @id @default(autoincrement())`, `cycleId Int` (FK → PanelCycle), `proteinId String?` (FK → Protein), `antibodyId Int?` (FK → Antibody), `fluorophore String?`, `metalTag String?`, `sortOrder Int @default(0)`

Add `@@index` on all foreign key fields and frequently searched fields (`label`, `geneSymbol`, `rrid`, `status`, `isPublic`).
