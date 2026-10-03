import "server-only"

import type { Prisma } from "@/lib/generated/prisma/client"
import type { Clonality, Preservation, Recommendation, ValidationResult } from "@/lib/generated/prisma/enums"
import { prisma } from "@/lib/prisma"
import { imagingMethodSelect } from "@/models/imaging-method/queries"
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
  recommendationIn?: string[]
  validatedBy?: string[]
  issueIds?: string[]
  submitterIds?: string[]
  conditionIds?: string[]
  preservations?: string[]
  fixativeIds?: string[]
  vendors?: string[]
  subcellularIds?: string[]
}

const evidenceSelect = {
  id: true,
  recommendation: true,
  concentrationUgPerMl: true,
  validations: { select: { result: true, method: { select: { id: true, label: true } } } },
  issues: { select: { issue: { select: { id: true, label: true } } } },
  dilution: true,
  incubation: true,
  metalTag: true,
  cycleNumber: true,
  status: true,
  fluorophore: { select: { id: true, name: true, excitation: true, emission: true } },
  cellTypes: { select: { cellType: { select: { id: true, label: true } } } },
  experiment: {
    select: {
      imagingMethod: { select: imagingMethodSelect },
      preservation: true,
      fixative: { select: { id: true, label: true } },
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
  recommendation: Recommendation | null
  validations: { method: string; result: ValidationResult }[]
  issues: string[]
  dilution: string | null
  concentrationUgPerMl: number | null
  incubation: string | null
  fluorophore: string | null
  metalTag: string | null
  method: string | null
  methodId: string | null
  preservation: string | null
  fixative: { id: string; label: string } | null
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
  if (filter.preservations?.length) experiment.preservation = { in: filter.preservations as Preservation[] }
  if (filter.fixativeIds?.length) experiment.fixativeId = { in: filter.fixativeIds }
  if (filter.methods?.length) experiment.imagingMethodId = { in: filter.methods }
  if (filter.submitterIds?.length) experiment.submitterId = { in: filter.submitterIds }
  if (Object.keys(experiment).length) where.experiment = experiment

  if (filter.markerIds?.length) antibody.targetProteinId = { in: filter.markerIds }
  if (filter.rrids?.length) antibody.rrid = { in: filter.rrids }
  if (filter.hostTaxonIds?.length) antibody.hostTaxonId = { in: filter.hostTaxonIds }
  if (filter.clonalities?.length) antibody.clonality = { in: filter.clonalities as Clonality[] }
  if (filter.conjugates?.length) antibody.conjugate = { in: filter.conjugates }
  if (filter.vendors?.length) antibody.vendorName = { in: filter.vendors }
  if (Object.keys(antibody).length) where.antibody = antibody

  if (filter.antibodyIds?.length) where.antibodyId = { in: filter.antibodyIds }
  if (filter.fluorophoreIds?.length) where.fluorophoreId = { in: filter.fluorophoreIds }
  if (filter.subcellularIds?.length) where.subcellularId = { in: filter.subcellularIds }
  if (filter.cellTypeIds?.length) where.cellTypes = { some: { cellTypeId: { in: filter.cellTypeIds } } }
  if (filter.recommendationIn?.length) where.recommendation = { in: filter.recommendationIn as Recommendation[] }
  if (filter.validatedBy?.length) {
    where.validations = { some: { methodId: { in: filter.validatedBy }, result: "SUPPORTS" } }
  }
  if (filter.issueIds?.length) where.issues = { some: { issueId: { in: filter.issueIds } } }

  return where
}

function toEvidenceReport(row: EvidenceRow): EvidenceReport {
  return {
    id: row.id,
    reportUrl: `/report/${row.id}`,
    recommendation: row.recommendation,
    validations: row.validations.map(({ method, result }) => ({ method: method.label, result })),
    issues: row.issues.map(({ issue }) => issue.label),
    dilution: row.dilution,
    concentrationUgPerMl: row.concentrationUgPerMl,
    incubation: row.incubation,
    fluorophore: row.fluorophore?.name ?? null,
    metalTag: row.metalTag,
    method: row.experiment.imagingMethod?.label ?? null,
    methodId: row.experiment.imagingMethod?.id ?? null,
    preservation: row.experiment.preservation,
    fixative: row.experiment.fixative,
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

// A listing is meant to be read, an aggregation is meant to be counted, so they cap differently.
export const MAX_FIND_REPORTS = 200
export const MAX_AGGREGATE_REPORTS = 2000

async function loadEvidenceReports(
  viewer: ViewerContext | null,
  filter: EvidenceFilter,
  limit: number,
  cap: number,
): Promise<EvidenceReport[]> {
  const rows = await prisma.experimentalReport.findMany({
    where: { AND: [buildReportVisibilityWhere(viewer), buildEvidenceWhere(filter)] },
    select: evidenceSelect,
    take: Math.min(Math.max(1, limit), cap),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  })
  return rows.map(toEvidenceReport)
}

export async function findReports(
  viewer: ViewerContext | null,
  filter: EvidenceFilter,
  limit = 100,
): Promise<EvidenceReport[]> {
  return loadEvidenceReports(viewer, filter, limit, MAX_FIND_REPORTS)
}

export type EvidenceGroupBy =
  | "antibody"
  | "clone"
  | "marker"
  | "tissue"
  | "species"
  | "dilution"
  | "antigenRetrieval"
  | "preservation"
  | "fixative"
  | "method"
  | "submitter"
  | "fluorophore"

export interface EvidenceGroup {
  key: string
  label: string
  count: number
  recommendedCount: number
  withCaveatsCount: number
  notRecommendedCount: number
  usableRate: number
  validatedCount: number
  topIssues: { label: string; count: number }[]
}

const TOP_ISSUES = 3

type GroupTally = {
  label: string
  count: number
  rated: number
  outcomes: Record<Recommendation, number>
  validated: number
  issues: Map<string, number>
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
    case "preservation":
      return report.preservation ? { key: report.preservation, label: report.preservation } : null
    case "fixative":
      return report.fixative ? { key: report.fixative.id, label: report.fixative.label } : null
    case "method":
      return report.methodId ? { key: report.methodId, label: report.method ?? report.methodId } : null
    case "submitter":
      return report.submitter ? { key: report.submitter.id, label: report.submitter.name ?? "Unnamed" } : null
    case "fluorophore":
      return report.fluorophore ? { key: report.fluorophore, label: report.fluorophore } : null
  }
}

// Groups reports along one dimension and counts outcomes per group: how many reports recommend, accept with
// caveats or reject, how many back specificity with a supporting control, and the most frequent issues.
// The usable rate counts recommended and with-caveats reports over reports that state an outcome.
export async function aggregateReports(
  viewer: ViewerContext | null,
  filter: EvidenceFilter,
  groupBy: EvidenceGroupBy,
  limit = 400,
): Promise<EvidenceGroup[]> {
  const reports = await loadEvidenceReports(viewer, filter, limit, MAX_AGGREGATE_REPORTS)
  const groups = new Map<string, GroupTally>()

  for (const report of reports) {
    const group = groupKeyOf(report, groupBy)
    if (!group) continue
    const entry = groups.get(group.key) ?? {
      label: group.label,
      count: 0,
      rated: 0,
      outcomes: { RECOMMENDED: 0, WITH_CAVEATS: 0, NOT_RECOMMENDED: 0 },
      validated: 0,
      issues: new Map<string, number>(),
    }
    entry.count += 1
    if (report.recommendation) {
      entry.rated += 1
      entry.outcomes[report.recommendation] += 1
    }
    if (report.validations.some((validation) => validation.result === "SUPPORTS")) entry.validated += 1
    for (const issue of report.issues) entry.issues.set(issue, (entry.issues.get(issue) ?? 0) + 1)
    groups.set(group.key, entry)
  }

  return [...groups.entries()]
    .map(([key, entry]) => ({
      key,
      label: entry.label,
      count: entry.count,
      recommendedCount: entry.outcomes.RECOMMENDED,
      withCaveatsCount: entry.outcomes.WITH_CAVEATS,
      notRecommendedCount: entry.outcomes.NOT_RECOMMENDED,
      usableRate: entry.rated > 0 ? (entry.outcomes.RECOMMENDED + entry.outcomes.WITH_CAVEATS) / entry.rated : 0,
      validatedCount: entry.validated,
      topIssues: [...entry.issues.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, TOP_ISSUES)
        .map(([label, count]) => ({ label, count })),
    }))
    .sort((a, b) => b.usableRate - a.usableRate || b.recommendedCount - a.recommendedCount || b.count - a.count)
}
