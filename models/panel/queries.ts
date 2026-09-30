import "server-only"

import type { BrowseMarkerParams, EntryFilterParams, LabContentParams } from "@/lib/data-table"
import { BadRequestError, NotFoundError } from "@/lib/error-handling"
import type { Prisma } from "@/lib/generated/prisma/client"
import type { Visibility } from "@/lib/generated/prisma/enums"
import { searchDiseaseOntology, searchSpecies } from "@/lib/ontology"
import { prisma } from "@/lib/prisma"
import { type EntriesPage, paginate } from "@/models/experimental-report/queries"
import { getFluorophoreSpectra } from "@/models/fluorophore/queries"
import type { FluorophoreSpectraMap } from "@/models/fluorophore/spectra"
import { resolveImagingMethodId } from "@/models/imaging-method/data"
import { imagingMethodExists } from "@/models/imaging-method/queries"
import type { ViewerContext } from "@/models/lab/access"
import { resolveResourceVisibility } from "@/models/lab/queries"
import { buildPanelVisibilityWhere } from "@/models/lab/visibility"
import { type PanelValidationResult, validatePanel } from "./intelligence"
import type { AddCycleData, AddMarkerData, CreatePanelData, UpdatePanelData } from "./schema"

export type PanelQueryParams = {
  limit?: number
  cursor?: string
}

const panelMarkerSelect = {
  id: true,
  cycleId: true,
  proteinId: true,
  antibodyId: true,
  fluorophoreId: true,
  metalTag: true,
  sortOrder: true,
  fluorophore: {
    // Spectra are deliberately absent here: panelSelect is also used by the list queries and a stored
    // curve is a few hundred points. validatePanelWithSpectra loads them for the panel under review.
    select: {
      id: true,
      name: true,
      excitation: true,
      emission: true,
      extinctionCoefficient: true,
      quantumYield: true,
    },
  },
  protein: {
    select: {
      id: true,
      label: true,
      geneSymbol: true,
    },
  },
  antibody: {
    select: {
      id: true,
      rrid: true,
      name: true,
      conjugate: true,
      hostTaxon: { select: { id: true, label: true } },
      vendorName: true,
      catalogNumber: true,
      cloneId: true,
    },
  },
} satisfies Prisma.PanelMarkerSelect

const panelCycleSelect = {
  id: true,
  panelId: true,
  name: true,
  notes: true,
  sortOrder: true,
  markers: {
    select: panelMarkerSelect,
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  },
} satisfies Prisma.PanelCycleSelect

const panelSelect = {
  id: true,
  name: true,
  description: true,
  species: { select: { id: true, label: true } },
  fixation: true,
  imagingMethodId: true,
  imagingMethod: { select: { id: true, label: true, shortLabel: true, efoId: true, detection: true, cyclic: true } },
  ownerId: true,
  visibility: true,
  owningLabId: true,
  labShares: { select: { labId: true } },
  createdAt: true,
  updatedAt: true,
  condition: {
    select: {
      id: true,
      label: true,
    },
  },
  owner: {
    select: {
      id: true,
      name: true,
    },
  },
  owningLab: { select: { id: true, name: true, slug: true } },
  cycles: {
    select: panelCycleSelect,
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  },
} satisfies Prisma.PanelSelect

export type PanelRow = Prisma.PanelGetPayload<{ select: typeof panelSelect }>
export type PanelCycleRow = Prisma.PanelCycleGetPayload<{ select: typeof panelCycleSelect }>
export type PanelMarkerRow = Prisma.PanelMarkerGetPayload<{ select: typeof panelMarkerSelect }>

function collectFluorophoreIds(panel: PanelRow): string[] {
  const ids = new Set<string>()
  for (const cycle of panel.cycles) {
    for (const marker of cycle.markers) {
      if (marker.fluorophoreId) ids.add(marker.fluorophoreId)
    }
  }
  return [...ids]
}

/**
 * Validate a panel against the stored FPbase spectra. `validatePanel` on its own falls back to the
 * emission-peak heuristic, so this is the entry point any caller that wants the real overlap integral
 * should use.
 */
export async function validatePanelWithSpectra(panel: PanelRow): Promise<PanelValidationResult> {
  const ids = collectFluorophoreIds(panel)
  const spectra: FluorophoreSpectraMap = ids.length > 0 ? await getFluorophoreSpectra(ids) : new Map()
  return validatePanel(panel, spectra)
}

export async function getPanelsForUser(userId: string): Promise<PanelRow[]> {
  return prisma.panel.findMany({
    select: panelSelect,
    where: { ownerId: userId },
    orderBy: { updatedAt: "desc" },
  })
}

export async function getPublicPanels(params: PanelQueryParams): Promise<PanelRow[]> {
  const { limit = 20, cursor } = params

  return prisma.panel.findMany({
    select: panelSelect,
    where: { visibility: "PUBLIC" },
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  })
}

export async function getPanelById(id: string): Promise<PanelRow | null> {
  return prisma.panel.findUnique({
    where: { id },
    select: panelSelect,
  })
}

// Private lane: panels the viewer may see (public, own, or lab-shared), for the panels API.
const labPanelEntrySelect = {
  id: true,
  name: true,
  description: true,
  visibility: true,
  updatedAt: true,
  species: { select: { label: true } },
  imagingMethod: { select: { id: true, label: true, shortLabel: true } },
  owner: { select: { id: true, name: true } },
  _count: { select: { cycles: true } },
  cycles: { select: { _count: { select: { markers: true } } } },
} satisfies Prisma.PanelSelect

type PanelEntryRow = Prisma.PanelGetPayload<{ select: typeof labPanelEntrySelect }>

export interface LabPanelEntry {
  id: string
  name: string
  description: string | null
  ownerId: string | null
  ownerName: string | null
  species: string | null
  method: string | null
  visibility: Visibility
  cycleCount: number
  markerCount: number
  updatedAt: string
}

function toLabPanelEntry(panel: PanelEntryRow): LabPanelEntry {
  return {
    id: panel.id,
    name: panel.name,
    description: panel.description,
    ownerId: panel.owner?.id ?? null,
    ownerName: panel.owner?.name ?? null,
    species: panel.species?.label ?? null,
    method: panel.imagingMethod?.shortLabel ?? null,
    visibility: panel.visibility,
    cycleCount: panel._count.cycles,
    markerCount: panel.cycles.reduce((sum, cycle) => sum + cycle._count.markers, 0),
    updatedAt: panel.updatedAt.toISOString(),
  }
}

// Lab-scoped (private lane, member-gated by the page): every panel owned by or shared with the lab,
// regardless of visibility, with the same search/filter/sort/paging surface as browse.
export async function getLabPanelEntriesPage(
  labId: string,
  params: LabContentParams & { pageSize?: number },
): Promise<EntriesPage<LabPanelEntry>> {
  const panels = await prisma.panel.findMany({
    select: labPanelEntrySelect,
    where: buildBrowsePanelWhere(params, labPanelScope(labId)),
    orderBy: { updatedAt: "desc" },
    take: BROWSE_AGGREGATION_CAP,
  })
  const entries = sortPanelEntries(panels.map(toLabPanelEntry), params.sort, params.order)
  return paginate(entries, params.page, params.pageSize)
}

export async function getLabPanelCount(labId: string): Promise<number> {
  return prisma.panel.count({ where: labPanelScope(labId) })
}

const BROWSE_AGGREGATION_CAP = 2000

const BROWSE_PANEL_SCOPE: Prisma.PanelWhereInput = { visibility: "PUBLIC" }

function labPanelScope(labId: string): Prisma.PanelWhereInput {
  return {
    visibility: { not: "PRIVATE" },
    OR: [{ owningLabId: labId }, { labShares: { some: { labId } } }],
  }
}

function buildBrowsePanelWhere(
  params: EntryFilterParams,
  base: Prisma.PanelWhereInput = BROWSE_PANEL_SCOPE,
): Prisma.PanelWhereInput {
  const and: Prisma.PanelWhereInput[] = [base]

  if (params.species.length) and.push({ speciesId: { in: params.species } })
  if (params.condition.length) and.push({ conditionId: { in: params.condition } })
  if (params.fixation.length) and.push({ fixation: { in: params.fixation as Prisma.EnumFixationNullableFilter["in"] } })
  if (params.lab.length) and.push({ owningLabId: { in: params.lab } })
  if (params.method.length) {
    // Filter values arrive either as an ImagingMethod id or as a legacy enum value from an old link.
    const methodIds = params.method.map((value) => resolveImagingMethodId(value)).filter((id): id is string => !!id)
    and.push(methodIds.length ? { imagingMethodId: { in: methodIds } } : { id: "__no_match__" })
  }

  if (params.q) {
    and.push({
      OR: [
        { name: { contains: params.q, mode: "insensitive" } },
        { description: { contains: params.q, mode: "insensitive" } },
      ],
    })
  }

  return { AND: and }
}

const PANEL_SORT_ACCESSORS: Record<string, (p: LabPanelEntry) => string | number> = {
  name: (p) => p.name.toLowerCase(),
  member: (p) => (p.ownerName ?? "").toLowerCase(),
  species: (p) => (p.species ?? "").toLowerCase(),
  method: (p) => (p.method ?? "").toLowerCase(),
  markerCount: (p) => p.markerCount,
  cycleCount: (p) => p.cycleCount,
  updatedAt: (p) => p.updatedAt,
}

function sortPanelEntries(entries: LabPanelEntry[], sort?: string | null, order: string = "desc"): LabPanelEntry[] {
  const accessor = sort ? PANEL_SORT_ACCESSORS[sort] : undefined
  if (!accessor) return entries
  const direction = order === "asc" ? 1 : -1
  return [...entries].sort((a, b) => {
    const av = accessor(a)
    const bv = accessor(b)
    if (av < bv) return -direction
    if (av > bv) return direction
    return 0
  })
}

// Public lane: published panels for the browse table, with the same search/filter/sort/paging
// surface as the other browse modes.
export async function getPanelEntriesPage(
  params: BrowseMarkerParams & { pageSize?: number },
): Promise<EntriesPage<LabPanelEntry>> {
  const panels = await prisma.panel.findMany({
    select: labPanelEntrySelect,
    where: buildBrowsePanelWhere(params),
    orderBy: { updatedAt: "desc" },
    take: BROWSE_AGGREGATION_CAP,
  })

  const entries = sortPanelEntries(panels.map(toLabPanelEntry), params.sort, params.order)
  return paginate(entries, params.page, params.pageSize)
}

export async function getVisiblePanels(viewer: ViewerContext, params: PanelQueryParams): Promise<PanelRow[]> {
  const { limit, cursor } = params
  return prisma.panel.findMany({
    select: panelSelect,
    where: buildPanelVisibilityWhere(viewer),
    ...(limit ? { take: limit } : {}),
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
  })
}

// Private lane: a single panel only if the viewer may see it.
export async function getVisiblePanelById(id: string, viewer: ViewerContext | null): Promise<PanelRow | null> {
  return prisma.panel.findFirst({
    where: { AND: [{ id }, buildPanelVisibilityWhere(viewer)] },
    select: panelSelect,
  })
}

// Taxon and DiseaseCondition are global tables shown in every facet and filter, so an unknown id is
// only written after the ontology confirms it, the same rule the report path applies.
async function resolveCondition(conditionId?: string, conditionLabel?: string): Promise<string | undefined> {
  if (!conditionId) return undefined

  const existing = await prisma.diseaseCondition.findUnique({ where: { id: conditionId } })
  if (existing) return existing.id

  if (!conditionLabel) throw new BadRequestError(`Unknown disease condition ${conditionId}`)
  const match = (await searchDiseaseOntology(conditionLabel)).find((r) => r.id === conditionId)
  if (!match) {
    throw new BadRequestError(`Disease condition ${conditionId} (${conditionLabel}) not found in Disease Ontology`)
  }

  await prisma.diseaseCondition.create({ data: { id: match.id, label: match.label } })
  return match.id
}

async function resolveTaxon(speciesId?: string, speciesLabel?: string): Promise<string | undefined> {
  if (!speciesId) return undefined

  const existing = await prisma.taxon.findUnique({ where: { id: speciesId } })
  if (existing) return existing.id

  if (!speciesLabel) throw new BadRequestError(`Unknown species ${speciesId}`)
  const match = (await searchSpecies(speciesLabel)).find((r) => r.id === speciesId)
  if (!match) throw new BadRequestError(`Species ${speciesId} (${speciesLabel}) not found in NCBI Taxonomy`)

  await prisma.taxon.create({ data: { id: match.id, label: match.label } })
  return match.id
}

// An imaging method id must already exist in the catalog; a panel may not invent one, the same rule
// the ontology-backed fields follow.
async function resolveImagingMethod(imagingMethodId?: string | null): Promise<string | null | undefined> {
  if (imagingMethodId === undefined) return undefined
  if (imagingMethodId === null) return null

  const resolved = resolveImagingMethodId(imagingMethodId) ?? imagingMethodId
  if (!(await imagingMethodExists(resolved))) throw new BadRequestError(`Unknown imaging method ${imagingMethodId}`)
  return resolved
}

export async function createPanel(data: CreatePanelData, ownerId: string): Promise<PanelRow> {
  const resolvedConditionId = await resolveCondition(data.conditionId, data.conditionLabel)
  const resolvedSpeciesId = await resolveTaxon(data.speciesId, data.speciesLabel)
  const resolvedImagingMethodId = await resolveImagingMethod(data.imagingMethodId)
  // Panels default to PRIVATE (draft); the owner opts in to sharing or publishing.
  const access = await resolveResourceVisibility({
    ownerId,
    defaultVisibility: "PRIVATE",
    visibility: data.visibility,
    sharedLabIds: data.sharedLabIds,
    owningLabId: data.owningLabId,
  })

  return prisma.panel.create({
    data: {
      name: data.name,
      description: data.description,
      speciesId: resolvedSpeciesId,
      fixation: data.fixation,
      imagingMethodId: resolvedImagingMethodId ?? undefined,
      conditionId: resolvedConditionId,
      visibility: access.visibility,
      owningLabId: access.owningLabId,
      ownerId,
      labShares: { create: access.sharedLabIds.map((labId) => ({ labId })) },
      cycles: {
        create: {
          name: "Cycle 1",
          sortOrder: 0,
        },
      },
    },
    select: panelSelect,
  })
}

export async function updatePanel(id: string, data: UpdatePanelData): Promise<PanelRow> {
  const resolvedConditionId =
    data.conditionId !== undefined ? await resolveCondition(data.conditionId, data.conditionLabel) : undefined
  const resolvedSpeciesId =
    data.speciesId !== undefined ? await resolveTaxon(data.speciesId, data.speciesLabel) : undefined
  const resolvedImagingMethodId = await resolveImagingMethod(data.imagingMethodId)

  const touchesVisibility =
    data.visibility !== undefined || data.sharedLabIds !== undefined || data.owningLabId !== undefined

  let access: Awaited<ReturnType<typeof resolveResourceVisibility>> | null = null
  if (touchesVisibility) {
    const panel = await prisma.panel.findUnique({ where: { id }, select: { ownerId: true } })
    if (!panel?.ownerId) throw new NotFoundError("Panel not found")
    access = await resolveResourceVisibility({
      ownerId: panel.ownerId,
      defaultVisibility: "PRIVATE",
      visibility: data.visibility,
      sharedLabIds: data.sharedLabIds,
      owningLabId: data.owningLabId,
    })
  }

  return prisma.$transaction(async (tx) => {
    if (access) {
      await tx.panelLabShare.deleteMany({ where: { panelId: id } })
      if (access.sharedLabIds.length > 0) {
        await tx.panelLabShare.createMany({
          data: access.sharedLabIds.map((labId) => ({ panelId: id, labId })),
        })
      }
    }
    return tx.panel.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(resolvedSpeciesId !== undefined && { speciesId: resolvedSpeciesId }),
        ...(data.fixation !== undefined && { fixation: data.fixation }),
        ...(resolvedImagingMethodId !== undefined && { imagingMethodId: resolvedImagingMethodId }),
        ...(resolvedConditionId !== undefined && { conditionId: resolvedConditionId }),
        ...(access ? { visibility: access.visibility, owningLabId: access.owningLabId } : {}),
      },
      select: panelSelect,
    })
  })
}

export async function deletePanel(id: string): Promise<void> {
  await prisma.panel.delete({ where: { id } })
}

export async function addCycle(panelId: string, data: AddCycleData): Promise<PanelCycleRow> {
  const { _max } = await prisma.panelCycle.aggregate({ where: { panelId }, _max: { sortOrder: true } })

  return prisma.panelCycle.create({
    data: {
      panelId,
      name: data.name,
      notes: data.notes,
      sortOrder: (_max.sortOrder ?? -1) + 1,
    },
    select: panelCycleSelect,
  })
}

export async function updateCycle(cycleId: string, data: { notes?: string | null }): Promise<PanelCycleRow> {
  return prisma.panelCycle.update({
    where: { id: cycleId },
    data: {
      ...(data.notes !== undefined && { notes: data.notes }),
    },
    select: panelCycleSelect,
  })
}

export async function addMarker(cycleId: string, data: AddMarkerData): Promise<PanelMarkerRow> {
  const { _max } = await prisma.panelMarker.aggregate({ where: { cycleId }, _max: { sortOrder: true } })

  return prisma.panelMarker.create({
    data: {
      cycleId,
      proteinId: data.proteinId,
      antibodyId: data.antibodyId,
      fluorophoreId: data.fluorophoreId,
      metalTag: data.metalTag,
      sortOrder: (_max.sortOrder ?? -1) + 1,
    },
    select: panelMarkerSelect,
  })
}

export async function updateMarker(
  markerId: string,
  data: { antibodyId?: string | null; fluorophoreId?: string | null; metalTag?: string | null },
): Promise<PanelMarkerRow> {
  return prisma.panelMarker.update({
    where: { id: markerId },
    data,
    select: panelMarkerSelect,
  })
}

export async function removeCycle(cycleId: string): Promise<void> {
  await prisma.panelCycle.delete({ where: { id: cycleId } })
}

export async function removeMarker(markerId: string): Promise<void> {
  await prisma.panelMarker.delete({ where: { id: markerId } })
}

export async function reorderMarkers(items: { markerId: string; cycleId: string; sortOrder: number }[]): Promise<void> {
  await prisma.$transaction(
    items.map((item) =>
      prisma.panelMarker.update({
        where: { id: item.markerId },
        data: { cycleId: item.cycleId, sortOrder: item.sortOrder },
      }),
    ),
  )
}
