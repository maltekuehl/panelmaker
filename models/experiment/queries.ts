import "server-only"

import type { ExperimentEntry } from "@/components/browse/columns"
import type { CarouselImage, CarouselImageLink } from "@/components/browse/image-carousel-dialog"
import { METHOD_LABELS } from "@/lib/constants"
import type { BrowseMarkerParams, EntryFilterParams, LabContentParams } from "@/lib/data-table"
import type { Prisma } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { type EntriesPage, paginate } from "@/models/experimental-report/queries"
import type { ViewerContext } from "@/models/lab/access"
import { buildExperimentVisibilityWhere } from "@/models/lab/visibility"
import type { UpdateExperimentData } from "./schema"

const experimentHeaderSelect = {
  id: true,
  name: true,
  description: true,
  citation: true,
  pmid: true,
  doi: true,
  fixation: true,
  method: true,
  antigenRetrieval: true,
  visibility: true,
  createdAt: true,
  submitterId: true,
  owningLabId: true,
  labShares: { select: { labId: true } },
  species: { select: { id: true, label: true } },
  tissue: { select: { id: true, label: true } },
  condition: { select: { id: true, label: true } },
  submitter: { select: { id: true, name: true, institution: true } },
  owningLab: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.ExperimentSelect

export type ExperimentHeaderRow = Prisma.ExperimentGetPayload<{ select: typeof experimentHeaderSelect }>

const experimentAccessSelect = {
  id: true,
  submitterId: true,
  visibility: true,
  owningLabId: true,
  labShares: { select: { labId: true } },
} satisfies Prisma.ExperimentSelect

export type ExperimentAccessRow = Prisma.ExperimentGetPayload<{ select: typeof experimentAccessSelect }>

export async function getExperimentAccessById(id: string): Promise<ExperimentAccessRow | null> {
  return prisma.experiment.findUnique({ where: { id }, select: experimentAccessSelect })
}

export async function getExperimentById(id: string): Promise<ExperimentHeaderRow | null> {
  return prisma.experiment.findUnique({ where: { id }, select: experimentHeaderSelect })
}

// Private lane: returns the experiment only if the viewer may see it (public, own, or lab-shared).
export async function getVisibleExperimentById(
  id: string,
  viewer: ViewerContext | null,
): Promise<ExperimentHeaderRow | null> {
  return prisma.experiment.findFirst({
    where: { AND: [{ id }, buildExperimentVisibilityWhere(viewer)] },
    select: experimentHeaderSelect,
  })
}

export async function updateExperiment(id: string, data: UpdateExperimentData): Promise<ExperimentHeaderRow> {
  return prisma.experiment.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description ?? null,
      citation: data.citation ?? null,
      pmid: data.pmid ?? null,
      doi: data.doi ?? null,
    },
    select: experimentHeaderSelect,
  })
}

const BROWSE_AGGREGATION_CAP = 2000

const experimentEntrySelect = {
  id: true,
  name: true,
  citation: true,
  pmid: true,
  doi: true,
  method: true,
  createdAt: true,
  submitter: { select: { id: true, name: true } },
  species: { select: { id: true, label: true } },
  tissue: { select: { id: true, label: true } },
  condition: { select: { id: true, label: true } },
  reports: {
    where: { status: "PUBLISHED" },
    select: {
      works: true,
      antibodyId: true,
      antibody: { select: { name: true, rrid: true, targetName: true, targetProteinId: true } },
      cellTypes: { select: { cellType: { select: { id: true, label: true } } } },
      images: { select: { url: true } },
    },
  },
} satisfies Prisma.ExperimentSelect

const MAX_ENTRY_IMAGES = 12

type ExperimentEntryRow = Prisma.ExperimentGetPayload<{ select: typeof experimentEntrySelect }>

const BROWSE_EXPERIMENT_SCOPE: Prisma.ExperimentWhereInput = {
  visibility: "PUBLIC",
  reports: { some: { status: "PUBLISHED" } },
}

function labExperimentScope(labId: string): Prisma.ExperimentWhereInput {
  return { OR: [{ owningLabId: labId }, { labShares: { some: { labId } } }] }
}

function buildExperimentWhere(
  params: EntryFilterParams,
  base: Prisma.ExperimentWhereInput = BROWSE_EXPERIMENT_SCOPE,
): Prisma.ExperimentWhereInput {
  const and: Prisma.ExperimentWhereInput[] = [base]

  if (params.species.length) and.push({ speciesId: { in: params.species } })
  if (params.tissue.length) and.push({ tissueId: { in: params.tissue } })
  if (params.condition.length) and.push({ conditionId: { in: params.condition } })
  if (params.method.length)
    and.push({ method: { in: params.method as Prisma.EnumMultiplexMethodNullableFilter["in"] } })
  if (params.fixation.length) and.push({ fixation: { in: params.fixation as Prisma.EnumFixationNullableFilter["in"] } })
  if (params.lab.length) and.push({ owningLabId: { in: params.lab } })

  if (params.q) {
    and.push({
      OR: [
        { name: { contains: params.q, mode: "insensitive" } },
        { description: { contains: params.q, mode: "insensitive" } },
        { species: { label: { contains: params.q, mode: "insensitive" } } },
        { tissue: { label: { contains: params.q, mode: "insensitive" } } },
      ],
    })
  }

  return { AND: and }
}

function toExperimentEntry(exp: ExperimentEntryRow): ExperimentEntry {
  const workingCount = exp.reports.filter((r) => r.works === true).length
  const antibodyCount = new Set(exp.reports.map((r) => r.antibodyId).filter(Boolean)).size

  const facts = [exp.species?.label, exp.tissue?.label].filter((f): f is string => !!f)
  const images: CarouselImage[] = []
  const seenImages = new Set<string>()
  for (const report of exp.reports) {
    const markerName = report.antibody?.targetName ?? report.antibody?.name ?? undefined
    const links: CarouselImageLink[] = []
    if (report.antibody?.targetProteinId && report.antibody.targetName) {
      links.push({ label: report.antibody.targetName, href: `/marker/${report.antibody.targetProteinId}` })
    }
    if (report.antibody?.rrid) {
      links.push({ label: report.antibody.name, href: `/antibody/${report.antibody.rrid.replace(/^RRID:/, "")}` })
    }
    for (const link of report.cellTypes) {
      links.push({ label: link.cellType.label, href: `/celltype/${link.cellType.id}` })
    }
    for (const image of report.images) {
      if (seenImages.has(image.url) || images.length >= MAX_ENTRY_IMAGES) continue
      seenImages.add(image.url)
      images.push({ src: image.url, title: markerName, links, facts })
    }
  }
  return {
    id: exp.id,
    name: exp.name ?? null,
    citation: exp.citation ?? null,
    pmid: exp.pmid ?? null,
    doi: exp.doi ?? null,
    method: exp.method ? (METHOD_LABELS[exp.method] ?? exp.method) : "Unknown",
    species: exp.species?.label ?? "Unknown",
    tissue: exp.tissue?.label ?? "Unknown",
    condition: exp.condition?.label ?? null,
    stainingCount: exp.reports.length,
    workingCount,
    antibodyCount,
    images,
    createdAt: exp.createdAt.toISOString(),
    submitter: exp.submitter ? { id: exp.submitter.id, name: exp.submitter.name } : null,
  }
}

const EXPERIMENT_SORT_ACCESSORS: Record<string, (e: ExperimentEntry) => string | number> = {
  name: (e) => (e.name ?? "").toLowerCase(),
  member: (e) => (e.submitter?.name ?? "").toLowerCase(),
  method: (e) => e.method.toLowerCase(),
  species: (e) => e.species.toLowerCase(),
  tissue: (e) => e.tissue.toLowerCase(),
  condition: (e) => (e.condition ?? "").toLowerCase(),
  stainingCount: (e) => e.stainingCount,
  workingCount: (e) => e.workingCount,
  createdAt: (e) => e.createdAt,
}

function sortExperimentEntries(
  entries: ExperimentEntry[],
  sort?: string | null,
  order: string = "desc",
): ExperimentEntry[] {
  const accessor = sort ? EXPERIMENT_SORT_ACCESSORS[sort] : undefined
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

// Lab-scoped (private lane, member-gated by the page): every experiment owned by or shared with the
// lab, regardless of visibility, with the same search/filter/sort/paging surface as browse.
export async function getLabExperimentEntriesPage(
  labId: string,
  params: LabContentParams & { pageSize?: number },
): Promise<EntriesPage<ExperimentEntry>> {
  const experiments = await prisma.experiment.findMany({
    select: experimentEntrySelect,
    where: buildExperimentWhere(params, labExperimentScope(labId)),
    orderBy: { createdAt: "desc" },
    take: BROWSE_AGGREGATION_CAP,
  })
  const entries = sortExperimentEntries(experiments.map(toExperimentEntry), params.sort, params.order)
  return paginate(entries, params.page, params.pageSize)
}

export async function getLabExperimentCount(labId: string): Promise<number> {
  return prisma.experiment.count({ where: labExperimentScope(labId) })
}

export async function getExperimentEntriesPage(
  params: BrowseMarkerParams & { pageSize?: number },
): Promise<EntriesPage<ExperimentEntry>> {
  const experiments = await prisma.experiment.findMany({
    select: experimentEntrySelect,
    where: buildExperimentWhere(params),
    orderBy: { createdAt: "desc" },
    take: BROWSE_AGGREGATION_CAP,
  })

  const entries = sortExperimentEntries(experiments.map(toExperimentEntry), params.sort, params.order)
  return paginate(entries, params.page, params.pageSize)
}
