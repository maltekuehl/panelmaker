import "server-only"

import type { Prisma } from "@/lib/generated/prisma/client"
import type { Clonality, MultiplexMethod, SignalQuality, Specificity } from "@/lib/generated/prisma/enums"
import { prisma } from "@/lib/prisma"
import type { ViewerContext } from "@/models/lab/access"
import { buildReportVisibilityWhere } from "@/models/lab/visibility"

// The single evidence workhorse behind most AI queries: a filterable, viewer-scoped read over
// experimental reports. `viewer = null` collapses to PUBLISHED + PUBLIC (the public lane); a
// ViewerContext additionally exposes the viewer's own + lab-shared work (incl. PENDING). Scoping is
// delegated to buildReportVisibilityWhere, which fails closed on a malformed viewer.

export interface EvidenceFilter {
  markerIds?: string[]
  cellTypeIds?: string[]
  tissueIds?: string[]
  speciesIds?: string[]
  methods?: string[]
  antibodyIds?: string[]
  rrids?: string[]
  hostTaxonIds?: string[]
  clonalities?: string[]
  conjugates?: string[]
  fluorophoreIds?: string[]
  works?: boolean
  signalQualityIn?: string[]
  specificityIn?: string[]
  submitterIds?: string[]
  conditionIds?: string[]
}

const evidenceSelect = {
  id: true,
  works: true,
  signalQuality: true,
  specificity: true,
  dilution: true,
  incubation: true,
  metalTag: true,
  cycleNumber: true,
  status: true,
  fluorophore: { select: { id: true, name: true, excitation: true, emission: true } },
  cellTypes: { select: { cellType: { select: { id: true, label: true } } } },
  experiment: {
    select: {
      method: true,
      fixation: true,
      antigenRetrieval: true,
      species: { select: { id: true, label: true } },
      tissue: { select: { id: true, label: true } },
      condition: { select: { id: true, label: true } },
      submitter: { select: { id: true, name: true } },
      owningLab: { select: { id: true, name: true, slug: true } },
    },
  },
  antibody: {
    select: {
      id: true,
      name: true,
      rrid: true,
      cloneId: true,
      clonality: true,
      vendorName: true,
      catalogNumber: true,
      conjugate: true,
      targetName: true,
      citationCount: true,
      hostTaxon: { select: { id: true, label: true } },
      targetProtein: { select: { id: true, label: true, geneSymbol: true } },
    },
  },
} satisfies Prisma.ExperimentalReportSelect

type EvidenceRow = Prisma.ExperimentalReportGetPayload<{ select: typeof evidenceSelect }>

export interface EvidenceReport {
  id: string
  reportUrl: string
  works: boolean | null
  signalQuality: SignalQuality | null
  specificity: Specificity | null
  dilution: string | null
  incubation: string | null
  fluorophore: string | null
  metalTag: string | null
  method: string | null
  fixation: string | null
  antigenRetrieval: string | null
  species: string | null
  tissue: string | null
  condition: string | null
  cellTypes: string[]
  antibody: {
    id: string
    name: string
    rrid: string | null
    cloneId: string | null
    clonality: Clonality | null
    vendorName: string | null
    conjugate: string | null
    targetName: string | null
    markerId: string | null
    markerSymbol: string | null
    hostSpecies: string | null
    citationCount: number
  } | null
  submitter: { id: string; name: string | null } | null
  lab: { id: string; name: string; slug: string } | null
}

function buildEvidenceWhere(filter: EvidenceFilter): Prisma.ExperimentalReportWhereInput {
  const where: Prisma.ExperimentalReportWhereInput = {}
  const experiment: Prisma.ExperimentWhereInput = {}
  const antibody: Prisma.AntibodyWhereInput = {}

  if (filter.tissueIds?.length) experiment.tissueId = { in: filter.tissueIds }
  if (filter.speciesIds?.length) experiment.speciesId = { in: filter.speciesIds }
  if (filter.conditionIds?.length) experiment.conditionId = { in: filter.conditionIds }
  if (filter.methods?.length) experiment.method = { in: filter.methods as MultiplexMethod[] }
  if (filter.submitterIds?.length) experiment.submitterId = { in: filter.submitterIds }
  if (Object.keys(experiment).length) where.experiment = experiment

  if (filter.markerIds?.length) antibody.targetProteinId = { in: filter.markerIds }
  if (filter.rrids?.length) antibody.rrid = { in: filter.rrids }
  if (filter.hostTaxonIds?.length) antibody.hostTaxonId = { in: filter.hostTaxonIds }
  if (filter.clonalities?.length) antibody.clonality = { in: filter.clonalities as Clonality[] }
  if (filter.conjugates?.length) antibody.conjugate = { in: filter.conjugates }
  if (Object.keys(antibody).length) where.antibody = antibody

  if (filter.antibodyIds?.length) where.antibodyId = { in: filter.antibodyIds }
  if (filter.fluorophoreIds?.length) where.fluorophoreId = { in: filter.fluorophoreIds }
  if (filter.cellTypeIds?.length) where.cellTypes = { some: { cellTypeId: { in: filter.cellTypeIds } } }
  if (filter.works !== undefined) where.works = filter.works
  if (filter.signalQualityIn?.length) where.signalQuality = { in: filter.signalQualityIn as SignalQuality[] }
  if (filter.specificityIn?.length) where.specificity = { in: filter.specificityIn as Specificity[] }

  return where
}

function toEvidenceReport(row: EvidenceRow): EvidenceReport {
  return {
    id: row.id,
    reportUrl: `/report/${row.id}`,
    works: row.works,
    signalQuality: row.signalQuality,
    specificity: row.specificity,
    dilution: row.dilution,
    incubation: row.incubation,
    fluorophore: row.fluorophore?.name ?? null,
    metalTag: row.metalTag,
    method: row.experiment.method,
    fixation: row.experiment.fixation,
    antigenRetrieval: row.experiment.antigenRetrieval,
    species: row.experiment.species?.label ?? null,
    tissue: row.experiment.tissue?.label ?? null,
    condition: row.experiment.condition?.label ?? null,
    cellTypes: row.cellTypes.map((link) => link.cellType.label),
    antibody: row.antibody
      ? {
          id: row.antibody.id,
          name: row.antibody.name,
          rrid: row.antibody.rrid,
          cloneId: row.antibody.cloneId,
          clonality: row.antibody.clonality,
          vendorName: row.antibody.vendorName,
          conjugate: row.antibody.conjugate,
          targetName: row.antibody.targetName,
          markerId: row.antibody.targetProtein?.id ?? null,
          markerSymbol: row.antibody.targetProtein?.geneSymbol ?? row.antibody.targetProtein?.label ?? null,
          hostSpecies: row.antibody.hostTaxon?.label ?? null,
          citationCount: row.antibody.citationCount,
        }
      : null,
    submitter: row.experiment.submitter
      ? { id: row.experiment.submitter.id, name: row.experiment.submitter.name }
      : null,
    lab: row.experiment.owningLab,
  }
}

export async function findReports(
  viewer: ViewerContext | null,
  filter: EvidenceFilter,
  limit = 100,
): Promise<EvidenceReport[]> {
  const rows = await prisma.experimentalReport.findMany({
    where: { AND: [buildReportVisibilityWhere(viewer), buildEvidenceWhere(filter)] },
    select: evidenceSelect,
    take: Math.min(Math.max(1, limit), 200),
    orderBy: { createdAt: "desc" },
  })
  return rows.map(toEvidenceReport)
}

export type EvidenceGroupBy =
  | "antibody"
  | "clone"
  | "marker"
  | "tissue"
  | "species"
  | "dilution"
  | "antigenRetrieval"
  | "fixation"
  | "method"
  | "submitter"
  | "fluorophore"

export interface EvidenceGroup {
  key: string
  label: string
  count: number
  worksCount: number
  worksRate: number
  strongSignalCount: number
}

function groupKeyOf(report: EvidenceReport, groupBy: EvidenceGroupBy): { key: string; label: string } | null {
  switch (groupBy) {
    case "antibody":
      return report.antibody ? { key: report.antibody.id, label: report.antibody.name } : null
    case "clone":
      return report.antibody?.cloneId
        ? { key: report.antibody.cloneId, label: report.antibody.cloneId }
        : report.antibody
          ? { key: report.antibody.id, label: report.antibody.name }
          : null
    case "marker":
      return report.antibody?.markerId
        ? { key: report.antibody.markerId, label: report.antibody.markerSymbol ?? report.antibody.markerId }
        : null
    case "tissue":
      return report.tissue ? { key: report.tissue, label: report.tissue } : null
    case "species":
      return report.species ? { key: report.species, label: report.species } : null
    case "dilution":
      return report.dilution ? { key: report.dilution, label: report.dilution } : null
    case "antigenRetrieval":
      return report.antigenRetrieval ? { key: report.antigenRetrieval, label: report.antigenRetrieval } : null
    case "fixation":
      return report.fixation ? { key: report.fixation, label: report.fixation } : null
    case "method":
      return report.method ? { key: report.method, label: report.method } : null
    case "submitter":
      return report.submitter ? { key: report.submitter.id, label: report.submitter.name ?? "Unnamed" } : null
    case "fluorophore":
      return report.fluorophore ? { key: report.fluorophore, label: report.fluorophore } : null
  }
}

// Groups reports along one dimension and reports count + works-rate + strong-signal counts. Powers
// protocol aggregation, clone comparison, fluorophore-contrast, and expertise-style rollups.
export async function aggregateReports(
  viewer: ViewerContext | null,
  filter: EvidenceFilter,
  groupBy: EvidenceGroupBy,
  limit = 400,
): Promise<EvidenceGroup[]> {
  const reports = await findReports(viewer, filter, limit)
  const groups = new Map<string, { label: string; count: number; works: number; rated: number; strong: number }>()

  for (const report of reports) {
    const group = groupKeyOf(report, groupBy)
    if (!group) continue
    const entry = groups.get(group.key) ?? { label: group.label, count: 0, works: 0, rated: 0, strong: 0 }
    entry.count += 1
    if (report.works !== null) {
      entry.rated += 1
      if (report.works) entry.works += 1
    }
    if (report.signalQuality === "EXCELLENT" || report.signalQuality === "GOOD") entry.strong += 1
    groups.set(group.key, entry)
  }

  return [...groups.entries()]
    .map(([key, entry]) => ({
      key,
      label: entry.label,
      count: entry.count,
      worksCount: entry.works,
      worksRate: entry.rated > 0 ? entry.works / entry.rated : 0,
      strongSignalCount: entry.strong,
    }))
    .sort((a, b) => b.worksRate - a.worksRate || b.count - a.count)
}
