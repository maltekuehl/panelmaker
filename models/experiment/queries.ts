import "server-only"

import type { ExperimentEntry } from "@/components/browse/columns"
import type { CarouselImage, CarouselImageLink } from "@/components/browse/image-carousel-dialog"
import type { BrowseMarkerParams, EntryFilterParams, LabContentParams } from "@/lib/data-table"
import type { Prisma } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { antibodyHref, cellTypeHref, markerHref } from "@/lib/routes"
import { validateAndResolveOntologyTerm } from "@/models/experimental-report"
import { type EntriesPage, paginate } from "@/models/experimental-report/queries"
import { resolveImagingMethodId } from "@/models/imaging-method/data"
import type { ViewerContext } from "@/models/lab/access"
import { buildExperimentVisibilityWhere } from "@/models/lab/visibility"
import type { UpdateExperimentData } from "./schema"
import { legacyFixationFor } from "./transforms"

const imagingMethodSelect = {
  select: { id: true, label: true, shortLabel: true, detection: true, cyclic: true },
} as const

const experimentHeaderSelect = {
  id: true,
  name: true,
  description: true,
  citation: true,
  pmid: true,
  doi: true,
  fixation: true,
  imagingMethod: imagingMethodSelect,
  antigenRetrieval: true,
  preservation: true,
  preservationText: true,
  fixativeConcentration: true,
  antigenRetrievalText: true,
  sampleType: true,
  sectionThicknessUm: true,
  donorSex: true,
  donorAge: true,
  protocolDoi: true,
  fixative: { select: { id: true, label: true } },
  developmentalStage: { select: { id: true, label: true } },
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
  const fixative = data.fixative ? await validateAndResolveOntologyTerm("fixative", data.fixative) : null
  const developmentalStage = data.developmentalStage
    ? await validateAndResolveOntologyTerm("developmentalStage", data.developmentalStage)
    : null

  if (fixative) {
    await prisma.fixative.upsert({
      where: { id: fixative.id },
      update: { label: fixative.label },
      create: fixative,
    })
  }
  if (developmentalStage) {
    await prisma.developmentalStage.upsert({
      where: { id: developmentalStage.id },
      update: { label: developmentalStage.label },
      create: developmentalStage,
    })
  }

  return prisma.experiment.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description ?? null,
      citation: data.citation ?? null,
      pmid: data.pmid ?? null,
      doi: data.doi ?? null,
      preservation: data.preservation ?? null,
      preservationText: data.preservationText ?? null,
      fixativeId: fixative?.id ?? null,
      fixativeConcentration: data.fixativeConcentration ?? null,
      antigenRetrievalText: data.antigenRetrievalText ?? null,
      sampleType: data.sampleType ?? null,
      sectionThicknessUm: data.sectionThicknessUm ?? null,
      donorSex: data.donorSex ?? null,
      donorAge: data.donorAge ?? null,
      developmentalStageId: developmentalStage?.id ?? null,
      protocolDoi: data.protocolDoi ?? null,
      // Keep the legacy column in step so browse filters and evidence roll-ups stay correct.
      fixation: legacyFixationFor({ preservation: data.preservation, fixativeId: fixative?.id }),
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
  imagingMethod: imagingMethodSelect,
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
  return {
    visibility: { not: "PRIVATE" },
    OR: [{ owningLabId: labId }, { labShares: { some: { labId } } }],
  }
}

function buildExperimentWhere(
  params: EntryFilterParams,
  base: Prisma.ExperimentWhereInput = BROWSE_EXPERIMENT_SCOPE,
): Prisma.ExperimentWhereInput {
  const and: Prisma.ExperimentWhereInput[] = [base]

  if (params.marker.length) and.push({ reports: { some: { antibody: { targetProteinId: { in: params.marker } } } } })
  if (params.cellType.length) {
    and.push({ reports: { some: { cellTypes: { some: { cellTypeId: { in: params.cellType } } } } } })
  }
  if (params.species.length) and.push({ speciesId: { in: params.species } })
  if (params.tissue.length) and.push({ tissueId: { in: params.tissue } })
  if (params.condition.length) and.push({ conditionId: { in: params.condition } })
  if (params.method.length) {
    // Filter values arrive either as an ImagingMethod id or as a legacy enum value from an old link, so
    // every incoming term is resolved against the catalog before it reaches the column.
    const methodIds = params.method.map((value) => resolveImagingMethodId(value)).filter((id): id is string => !!id)
    and.push(methodIds.length ? { imagingMethodId: { in: methodIds } } : { id: "__no_match__" })
  }
  if (params.fixation.length) and.push({ fixation: { in: params.fixation as Prisma.EnumFixationNullableFilter["in"] } })
  if (params.lab.length) and.push({ owningLabId: { in: params.lab } })

  if (params.q) {
    and.push({
      OR: [
        { name: { contains: params.q, mode: "insensitive" } },
        { description: { contains: params.q, mode: "insensitive" } },
        { citation: { contains: params.q, mode: "insensitive" } },
        { doi: { contains: params.q, mode: "insensitive" } },
        { pmid: { contains: params.q } },
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
      links.push({ label: report.antibody.targetName, href: markerHref(report.antibody.targetProteinId) })
    }
    const abHref = antibodyHref(report.antibody?.rrid)
    if (abHref && report.antibody) {
      links.push({ label: report.antibody.name, href: abHref })
    }
    for (const link of report.cellTypes) {
      links.push({ label: link.cellType.label, href: cellTypeHref(link.cellType.id) })
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
    method: exp.imagingMethod?.shortLabel ?? "Unknown",
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
