import "server-only"

import type { ExperimentEntry } from "@/components/browse/columns"
import { METHOD_LABELS } from "@/lib/constants"
import type { BrowseMarkerParams } from "@/lib/data-table"
import type { Prisma } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { type EntriesPage, paginate } from "@/models/experimental-report/queries"

const experimentHeaderSelect = {
  id: true,
  name: true,
  description: true,
  fixation: true,
  method: true,
  antigenRetrieval: true,
  isPublic: true,
  createdAt: true,
  species: { select: { id: true, label: true } },
  tissue: { select: { id: true, label: true } },
  condition: { select: { id: true, label: true } },
  submitter: { select: { id: true, name: true, institution: true } },
} satisfies Prisma.ExperimentSelect

export type ExperimentHeaderRow = Prisma.ExperimentGetPayload<{ select: typeof experimentHeaderSelect }>

export async function getExperimentById(id: string): Promise<ExperimentHeaderRow | null> {
  return prisma.experiment.findUnique({ where: { id }, select: experimentHeaderSelect })
}

const BROWSE_AGGREGATION_CAP = 2000

const experimentEntrySelect = {
  id: true,
  name: true,
  method: true,
  createdAt: true,
  species: { select: { id: true, label: true } },
  tissue: { select: { id: true, label: true } },
  condition: { select: { id: true, label: true } },
  reports: { where: { status: "PUBLISHED" }, select: { works: true, antibodyId: true } },
} satisfies Prisma.ExperimentSelect

type ExperimentEntryRow = Prisma.ExperimentGetPayload<{ select: typeof experimentEntrySelect }>

function buildExperimentWhere(params: BrowseMarkerParams): Prisma.ExperimentWhereInput {
  const where: Prisma.ExperimentWhereInput = {
    isPublic: true,
    reports: { some: { status: "PUBLISHED" } },
  }

  if (params.species.length) where.speciesId = { in: params.species }
  if (params.tissue.length) where.tissueId = { in: params.tissue }
  if (params.condition.length) where.conditionId = { in: params.condition }
  if (params.method.length) where.method = { in: params.method as Prisma.EnumMultiplexMethodNullableFilter["in"] }
  if (params.fixation.length) where.fixation = { in: params.fixation as Prisma.EnumFixationNullableFilter["in"] }

  if (params.q) {
    where.OR = [
      { name: { contains: params.q, mode: "insensitive" } },
      { description: { contains: params.q, mode: "insensitive" } },
      { species: { label: { contains: params.q, mode: "insensitive" } } },
      { tissue: { label: { contains: params.q, mode: "insensitive" } } },
    ]
  }

  return where
}

function toExperimentEntry(exp: ExperimentEntryRow): ExperimentEntry {
  const workingCount = exp.reports.filter((r) => r.works === true).length
  const antibodyCount = new Set(exp.reports.map((r) => r.antibodyId).filter(Boolean)).size
  return {
    id: exp.id,
    name: exp.name ?? null,
    method: exp.method ? (METHOD_LABELS[exp.method] ?? exp.method) : "Unknown",
    species: exp.species?.label ?? "Unknown",
    tissue: exp.tissue?.label ?? "Unknown",
    condition: exp.condition?.label ?? null,
    stainingCount: exp.reports.length,
    workingCount,
    antibodyCount,
    createdAt: exp.createdAt.toISOString(),
  }
}

const EXPERIMENT_SORT_ACCESSORS: Record<string, (e: ExperimentEntry) => string | number> = {
  name: (e) => (e.name ?? "").toLowerCase(),
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
