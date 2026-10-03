import "server-only"

import {
  BROWSE_AGGREGATION_CAP,
  type BrowseMarkerParams,
  type EntriesPage,
  type EntryFilterParams,
  type LabContentParams,
  paginate,
  type SortAccessor,
  sortEntries,
} from "@/lib/data-table"
import { ForbiddenError, NotFoundError } from "@/lib/error-handling"
import type { Prisma } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import type { ExperimentEntry } from "@/models/experimental-report/entries"
import { reportLevelWhere } from "@/models/experimental-report/filters"
import type { CarouselDetail, CarouselImage } from "@/models/image/transforms"
import { imageTitle, imageWithChannelsSelect, targetDetails, toCarouselChannels } from "@/models/image/transforms"
import { imagingMethodSelect as methodFields } from "@/models/imaging-method/queries"
import { canEditExperiment, type ViewerContext } from "@/models/lab/access"
import { buildExperimentVisibilityWhere, labContentScope } from "@/models/lab/visibility"
import { persistOntologyTerms, resolveOptionalTerm } from "@/models/ontology-term"
import type { UpdateExperimentData } from "./schema"

const imagingMethodSelect = { select: methodFields } as const

// What a report shows of its experiment. The header adds the description and the access fields.
export const experimentDetailSelect = {
  id: true,
  name: true,
  citation: true,
  pmid: true,
  doi: true,
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
  species: { select: { id: true, label: true } },
  tissue: { select: { id: true, label: true } },
  condition: { select: { id: true, label: true } },
  submitter: { select: { id: true, name: true, institution: true } },
  owningLab: { select: { id: true, name: true, slug: true } },
  source: { select: { id: true, name: true, url: true, license: true, attribution: true } },
} satisfies Prisma.ExperimentSelect

const experimentAccessSelect = {
  id: true,
  submitterId: true,
  visibility: true,
  owningLabId: true,
  labShares: { select: { labId: true } },
} satisfies Prisma.ExperimentSelect

const experimentHeaderSelect = {
  ...experimentDetailSelect,
  ...experimentAccessSelect,
  description: true,
} satisfies Prisma.ExperimentSelect

export type ExperimentHeaderRow = Prisma.ExperimentGetPayload<{ select: typeof experimentHeaderSelect }>

export type ExperimentAccessRow = Prisma.ExperimentGetPayload<{ select: typeof experimentAccessSelect }>

export async function requireEditableExperiment(
  id: string,
  viewer: ViewerContext | null,
): Promise<ExperimentAccessRow> {
  const experiment = await prisma.experiment.findUnique({ where: { id }, select: experimentAccessSelect })
  if (!experiment) throw new NotFoundError("Experiment not found")
  if (!canEditExperiment(viewer, experiment)) throw new ForbiddenError("Forbidden")
  return experiment
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
  const fixative = await resolveOptionalTerm("fixative", data.fixative)
  const developmentalStage = await resolveOptionalTerm("developmentalStage", data.developmentalStage)
  await persistOntologyTerms(prisma, [
    ["fixative", fixative],
    ["developmentalStage", developmentalStage],
  ])

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
    },
    select: experimentHeaderSelect,
  })
}

const MAX_ENTRY_IMAGES = 12

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
      recommendation: true,
      antibodyId: true,
      antibody: { select: { name: true, rrid: true, targetName: true, targetProteinId: true } },
      cellTypes: { select: { cellType: { select: { id: true, label: true } } } },
    },
  },
  images: {
    where: { channels: { some: { report: { status: "PUBLISHED" } } } },
    select: imageWithChannelsSelect,
    orderBy: { sortOrder: "asc" },
    take: MAX_ENTRY_IMAGES,
  },
} satisfies Prisma.ExperimentSelect

type ExperimentEntryRow = Prisma.ExperimentGetPayload<{ select: typeof experimentEntrySelect }>

const BROWSE_EXPERIMENT_SCOPE: Prisma.ExperimentWhereInput = {
  visibility: "PUBLIC",
  reports: { some: { status: "PUBLISHED" } },
}

function buildExperimentWhere(
  params: EntryFilterParams,
  base: Prisma.ExperimentWhereInput = BROWSE_EXPERIMENT_SCOPE,
): Prisma.ExperimentWhereInput {
  const and: Prisma.ExperimentWhereInput[] = [base]

  const reportWhere = reportLevelWhere(params)
  if (reportWhere) and.push({ reports: { some: reportWhere } })
  if (params.species.length) and.push({ speciesId: { in: params.species } })
  if (params.tissue.length) and.push({ tissueId: { in: params.tissue } })
  if (params.condition.length) and.push({ conditionId: { in: params.condition } })
  if (params.method.length) and.push({ imagingMethodId: { in: params.method } })
  if (params.preservation.length) {
    and.push({ preservation: { in: params.preservation as Prisma.EnumPreservationNullableFilter["in"] } })
  }
  if (params.fixative.length) and.push({ fixativeId: { in: params.fixative } })
  if (params.lab.length) and.push({ owningLabId: { in: params.lab } })
  if (params.source.length) and.push({ sourceId: { in: params.source } })

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
  const usableCount = exp.reports.filter(
    (r) => r.recommendation === "RECOMMENDED" || r.recommendation === "WITH_CAVEATS",
  ).length
  const antibodyCount = new Set(exp.reports.map((r) => r.antibodyId).filter(Boolean)).size

  const contextDetails: CarouselDetail[] = [
    { label: "Tissue", values: exp.tissue ? [{ text: exp.tissue.label }] : [] },
    { label: "Species", values: exp.species ? [{ text: exp.species.label }] : [] },
  ].filter((detail) => detail.values.length > 0)
  const images: CarouselImage[] = exp.images.map((image) => ({
    src: image.url,
    caption: image.caption,
    title: imageTitle(image),
    details: [...targetDetails(image), ...contextDetails],
    channels: toCarouselChannels(image),
  }))
  return {
    id: exp.id,
    name: exp.name ?? null,
    pmid: exp.pmid ?? null,
    doi: exp.doi ?? null,
    method: exp.imagingMethod?.label ?? "Unknown",
    species: exp.species?.label ?? "Unknown",
    tissue: exp.tissue?.label ?? "Unknown",
    condition: exp.condition?.label ?? null,
    stainingCount: exp.reports.length,
    usableCount,
    antibodyCount,
    images,
    createdAt: exp.createdAt.toISOString(),
    submitter: exp.submitter ? { id: exp.submitter.id, name: exp.submitter.name } : null,
  }
}

const EXPERIMENT_SORT_ACCESSORS: Record<string, SortAccessor<ExperimentEntry>> = {
  name: (e) => (e.name ?? "").toLowerCase(),
  member: (e) => (e.submitter?.name ?? "").toLowerCase(),
  method: (e) => e.method.toLowerCase(),
  species: (e) => e.species.toLowerCase(),
  tissue: (e) => e.tissue.toLowerCase(),
  condition: (e) => (e.condition ?? "").toLowerCase(),
  stainingCount: (e) => e.stainingCount,
  usableCount: (e) => e.usableCount,
  createdAt: (e) => e.createdAt,
}

async function experimentEntriesPage(
  params: EntryFilterParams & { pageSize?: number },
  base?: Prisma.ExperimentWhereInput,
): Promise<EntriesPage<ExperimentEntry>> {
  const experiments = await prisma.experiment.findMany({
    select: experimentEntrySelect,
    where: buildExperimentWhere(params, base),
    orderBy: { createdAt: "desc" },
    take: BROWSE_AGGREGATION_CAP,
  })
  const entries = sortEntries(experiments.map(toExperimentEntry), EXPERIMENT_SORT_ACCESSORS, params.sort, params.order)
  return paginate(entries, params.page, params.pageSize)
}

// Lab-scoped (private lane, member-gated by the page): every experiment owned by or shared with the
// lab, regardless of visibility, with the same search/filter/sort/paging surface as browse.
export async function getLabExperimentEntriesPage(
  labId: string,
  params: LabContentParams & { pageSize?: number },
): Promise<EntriesPage<ExperimentEntry>> {
  return experimentEntriesPage(params, labContentScope(labId))
}

export async function getLabExperimentCount(labId: string): Promise<number> {
  return prisma.experiment.count({ where: labContentScope(labId) })
}

export async function getExperimentEntriesPage(
  params: BrowseMarkerParams & { pageSize?: number },
): Promise<EntriesPage<ExperimentEntry>> {
  return experimentEntriesPage(params)
}
