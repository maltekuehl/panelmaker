import "server-only"

import type { AntibodyEntry, MarkerEntry, ReportEntry } from "@/components/browse/columns"
import type { CarouselImage, CarouselImageLink } from "@/components/browse/image-carousel-dialog"
import { CLONALITY_LABELS, PRESERVATION_LABELS, SPECIFICITY_LABELS } from "@/lib/constants"
import { FILTER_KEYS, type BrowseMarkerParams, type EntryFilterParams, type LabContentParams } from "@/lib/data-table"
import { UnprocessableError } from "@/lib/error-handling"
import type { Prisma, ValidationStatus } from "@/lib/generated/prisma/client"
import type { Visibility } from "@/lib/generated/prisma/enums"
import { lookupAntibodyByRrid, searchAntibodyRegistry } from "@/lib/integrations/antibody-registry"
import type { OntologyResult } from "@/lib/ontology"
import {
  searchCellOntology,
  searchChebi,
  searchDiseaseOntology,
  searchEfoImagingMethods,
  searchGoCellularComponent,
  searchHsapDv,
  searchMmusDv,
  searchSpecies,
  searchUberon,
} from "@/lib/ontology"
import { prisma } from "@/lib/prisma"
import { antibodyHref, markerHref } from "@/lib/routes"
import { normalizeRrid } from "@/lib/utils"
import { registryToAntibodyCreate } from "@/models/antibody/transforms"
import type { SpecimenInput } from "@/models/experiment/schema"
import { imageWithChannelsSelect, reportImagesSelect, toCarouselChannels } from "@/models/image/transforms"
import { imagingMethodSelect } from "@/models/imaging-method/queries"
import type { ViewerContext } from "@/models/lab/access"
import { resolveResourceVisibility } from "@/models/lab/queries"
import { buildReportVisibilityWhere } from "@/models/lab/visibility"
import type { CreateReportBatchData, CreateReportData } from "./schema"
import {
  aggregateAntibodyEntries,
  aggregateMarkerEntries,
  sortAntibodyEntries,
  sortMarkerEntries,
  sortReportEntries,
  toReportEntry,
} from "./transforms"

export type ReportQueryParams = {
  q?: string
  method?: string | string[]
  preservation?: string | string[]
  fixative?: string | string[]
  species?: string | string[]
  tissue?: string | string[]
  limit?: number
  cursor?: string
}

function toFilterList(value?: string | string[]): string[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

const reportSelect = {
  id: true,
  experimentId: true,
  antibodyId: true,
  subcellularId: true,
  fluorophoreId: true,
  metalTag: true,
  cycleNumber: true,
  dilution: true,
  incubation: true,
  status: true,
  works: true,
  signalQuality: true,
  specificity: true,
  notes: true,
  imageChannels: reportImagesSelect,
  createdAt: true,
  updatedAt: true,
  experiment: {
    select: {
      id: true,
      name: true,
      citation: true,
      pmid: true,
      doi: true,
      imagingMethod: { select: imagingMethodSelect },
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
    },
  },
  antibody: {
    select: {
      id: true,
      rrid: true,
      name: true,
      targetName: true,
      cloneId: true,
      vendorName: true,
      catalogNumber: true,
      conjugate: true,
      clonality: true,
      targetProteinId: true,
      hostTaxon: { select: { id: true, label: true } },
    },
  },
  fluorophore: {
    select: {
      id: true,
      name: true,
      excitation: true,
      emission: true,
    },
  },
  subcellular: { select: { id: true, label: true } },
  cellTypes: { select: { cellType: { select: { id: true, label: true } } } },
} satisfies Prisma.ExperimentalReportSelect

export type ReportRow = Prisma.ExperimentalReportGetPayload<{ select: typeof reportSelect }>

function resultWhere(values: string[]): Prisma.ExperimentalReportWhereInput | null {
  const wantsWorks = values.includes("works")
  const wantsFailed = values.includes("failed")
  if (wantsWorks && wantsFailed) return { works: { not: null } }
  if (wantsWorks) return { works: true }
  if (wantsFailed) return { works: false }
  return null
}

const WHERE_BUILDERS: Record<string, (values: string[]) => Prisma.ExperimentalReportWhereInput | null> = {
  marker: (v) => ({ antibody: { targetProteinId: { in: v } } }),
  cellType: (v) => ({ cellTypes: { some: { cellTypeId: { in: v } } } }),
  species: (v) => ({ experiment: { speciesId: { in: v } } }),
  tissue: (v) => ({ experiment: { tissueId: { in: v } } }),
  method: (v) => ({ experiment: { imagingMethodId: { in: v } } }),
  preservation: (v) => ({ experiment: { preservation: { in: v as Prisma.EnumPreservationNullableFilter["in"] } } }),
  fixative: (v) => ({ experiment: { fixativeId: { in: v } } }),
  vendor: (v) => ({ antibody: { vendorName: { in: v } } }),
  host: (v) => ({ antibody: { hostTaxonId: { in: v } } }),
  conjugate: (v) => ({ antibody: { conjugate: { in: v } } }),
  clonality: (v) => ({ antibody: { clonality: { in: v as Prisma.EnumClonalityNullableFilter["in"] } } }),
  subcellular: (v) => ({ subcellularId: { in: v } }),
  condition: (v) => ({ experiment: { conditionId: { in: v } } }),
  specificity: (v) => ({ specificity: { in: v as Prisma.EnumSpecificityNullableFilter["in"] } }),
  result: (v) => resultWhere(v),
  lab: (v) => ({ experiment: { owningLabId: { in: v } } }),
  source: (v) => ({ experiment: { sourceId: { in: v } } }),
}

const REPORT_LEVEL_FILTER_KEYS = [
  "marker",
  "cellType",
  "vendor",
  "host",
  "conjugate",
  "clonality",
  "subcellular",
  "specificity",
  "result",
] as const satisfies (keyof EntryFilterParams)[]

// The report-level dimensions as one predicate, so a parent (an experiment) can require a single report
// that satisfies all of them together rather than one report per dimension.
export function reportLevelWhere(params: EntryFilterParams): Prisma.ExperimentalReportWhereInput | null {
  const conditions = REPORT_LEVEL_FILTER_KEYS.flatMap((key) => {
    const values = params[key]
    const condition = values.length > 0 ? WHERE_BUILDERS[key](values) : null
    return condition ? [condition] : []
  })
  return conditions.length > 0 ? { AND: conditions } : null
}

const BROWSE_REPORT_SCOPE: Prisma.ExperimentalReportWhereInput = {
  status: "PUBLISHED",
  experiment: { visibility: "PUBLIC" },
}

function labReportScope(labId: string): Prisma.ExperimentalReportWhereInput {
  return {
    experiment: {
      visibility: { not: "PRIVATE" },
      OR: [{ owningLabId: labId }, { labShares: { some: { labId } } }],
    },
  }
}

function buildReportWhere(
  q: string | undefined,
  filters: Record<string, string[]>,
  base: Prisma.ExperimentalReportWhereInput = BROWSE_REPORT_SCOPE,
): Prisma.ExperimentalReportWhereInput {
  const conditions: Prisma.ExperimentalReportWhereInput[] = [base]

  if (q) {
    conditions.push({
      OR: [
        { antibody: { name: { contains: q, mode: "insensitive" } } },
        { antibody: { targetName: { contains: q, mode: "insensitive" } } },
        { antibody: { rrid: { contains: q, mode: "insensitive" } } },
        { antibody: { cloneId: { contains: q, mode: "insensitive" } } },
        { antibody: { catalogNumber: { contains: q, mode: "insensitive" } } },
        { experiment: { name: { contains: q, mode: "insensitive" } } },
        { notes: { contains: q, mode: "insensitive" } },
      ],
    })
  }

  for (const [key, values] of Object.entries(filters)) {
    if (!values || values.length === 0) continue
    const condition = WHERE_BUILDERS[key]?.(values)
    if (condition) conditions.push(condition)
  }

  return { AND: conditions }
}

function browseFilters(params: EntryFilterParams): Record<string, string[]> {
  const filters: Record<string, string[]> = {}
  for (const key of FILTER_KEYS) {
    const value = params[key as keyof EntryFilterParams]
    if (Array.isArray(value) && value.length > 0) filters[key] = value as string[]
  }
  return filters
}

export async function getAllReports(params: ReportQueryParams): Promise<ReportRow[]> {
  const { limit = 20, cursor } = params

  return prisma.experimentalReport.findMany({
    select: reportSelect,
    where: buildReportWhere(params.q, {
      method: toFilterList(params.method),
      preservation: toFilterList(params.preservation),
      fixative: toFilterList(params.fixative),
      species: toFilterList(params.species),
      tissue: toFilterList(params.tissue),
    }),
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  })
}

const BROWSE_AGGREGATION_CAP = 2000

export type BrowseQueryParams = BrowseMarkerParams & { pageSize?: number }

export type MarkerEntriesParams = BrowseQueryParams

export type EntriesPage<T> = {
  rows: T[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

export type MarkerEntriesPage = EntriesPage<MarkerEntry>

export function paginate<T>(rows: T[], page = 1, pageSize = 20): EntriesPage<T> {
  const total = rows.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const current = Math.min(Math.max(1, page), pageCount)
  return { rows: rows.slice((current - 1) * pageSize, current * pageSize), total, page: current, pageSize, pageCount }
}

async function fetchBrowseReports(
  params: BrowseQueryParams,
  scope: Prisma.ExperimentalReportWhereInput = BROWSE_REPORT_SCOPE,
): Promise<ReportRow[]> {
  return prisma.experimentalReport.findMany({
    select: reportSelect,
    where: buildReportWhere(params.q, browseFilters(params), scope),
    orderBy: { createdAt: "desc" },
    take: BROWSE_AGGREGATION_CAP,
  })
}

export async function getMarkerEntriesPage(params: BrowseQueryParams): Promise<EntriesPage<MarkerEntry>> {
  const reports = await fetchBrowseReports(params, { AND: [BROWSE_REPORT_SCOPE, { cellTypes: { some: {} } }] })
  const sorted = sortMarkerEntries(aggregateMarkerEntries(reports), params.sort, params.order)
  return paginate(sorted, params.page, params.pageSize)
}

export async function getAntibodyEntriesPage(params: BrowseQueryParams): Promise<EntriesPage<AntibodyEntry>> {
  const reports = await fetchBrowseReports(params)
  const sorted = sortAntibodyEntries(aggregateAntibodyEntries(reports), params.sort, params.order)
  return paginate(sorted, params.page, params.pageSize)
}

export async function getReportEntriesPage(params: BrowseQueryParams): Promise<EntriesPage<ReportEntry>> {
  const reports = await fetchBrowseReports(params)
  const sorted = sortReportEntries(reports.map(toReportEntry), params.sort, params.order)
  return paginate(sorted, params.page, params.pageSize)
}

// Lab-scoped (private lane, member-gated by the page): every report on an experiment owned by or
// shared with the lab, regardless of status/visibility, with the same search/filter/sort/paging surface.
export async function getLabReportEntriesPage(
  labId: string,
  params: LabContentParams & { pageSize?: number },
): Promise<EntriesPage<ReportEntry>> {
  const reports = await prisma.experimentalReport.findMany({
    select: reportSelect,
    where: buildReportWhere(params.q, browseFilters(params), labReportScope(labId)),
    orderBy: { createdAt: "desc" },
    take: BROWSE_AGGREGATION_CAP,
  })
  const sorted = sortReportEntries(reports.map(toReportEntry), params.sort, params.order)
  return paginate(sorted, params.page, params.pageSize)
}

export async function getLabReportCount(labId: string): Promise<number> {
  return prisma.experimentalReport.count({ where: labReportScope(labId) })
}

export type FacetOption = { value: string; label: string; description?: string }

export type BrowseFacets = Record<string, FacetOption[]>

type FacetExtractor = (report: ReportRow) => FacetOption[]

const FACET_EXTRACTORS: Record<string, FacetExtractor> = {
  marker: (r) =>
    r.antibody?.targetProteinId
      ? [
          {
            value: r.antibody.targetProteinId,
            label: r.antibody.targetName ?? r.antibody.targetProteinId,
            description: r.antibody.targetProteinId,
          },
        ]
      : [],
  cellType: (r) =>
    r.cellTypes.map(({ cellType }) => ({ value: cellType.id, label: cellType.label, description: cellType.id })),
  species: (r) =>
    r.experiment.species
      ? [{ value: r.experiment.species.id, label: r.experiment.species.label, description: r.experiment.species.id }]
      : [],
  tissue: (r) =>
    r.experiment.tissue
      ? [{ value: r.experiment.tissue.id, label: r.experiment.tissue.label, description: r.experiment.tissue.id }]
      : [],
  method: (r) =>
    r.experiment.imagingMethod
      ? [
          {
            value: r.experiment.imagingMethod.id,
            label: r.experiment.imagingMethod.label,
            description: r.experiment.imagingMethod.id,
          },
        ]
      : [],
  preservation: (r) =>
    r.experiment.preservation
      ? [{ value: r.experiment.preservation, label: PRESERVATION_LABELS[r.experiment.preservation] }]
      : [],
  fixative: (r) =>
    r.experiment.fixative
      ? [{ value: r.experiment.fixative.id, label: r.experiment.fixative.label, description: r.experiment.fixative.id }]
      : [],
  vendor: (r) => (r.antibody?.vendorName ? [{ value: r.antibody.vendorName, label: r.antibody.vendorName }] : []),
  host: (r) =>
    r.antibody?.hostTaxon
      ? [{ value: r.antibody.hostTaxon.id, label: r.antibody.hostTaxon.label, description: r.antibody.hostTaxon.id }]
      : [],
  conjugate: (r) => (r.antibody?.conjugate ? [{ value: r.antibody.conjugate, label: r.antibody.conjugate }] : []),
  clonality: (r) =>
    r.antibody?.clonality
      ? [{ value: r.antibody.clonality, label: CLONALITY_LABELS[r.antibody.clonality] ?? r.antibody.clonality }]
      : [],
  subcellular: (r) =>
    r.subcellular ? [{ value: r.subcellular.id, label: r.subcellular.label, description: r.subcellular.id }] : [],
  condition: (r) =>
    r.experiment.condition
      ? [
          {
            value: r.experiment.condition.id,
            label: r.experiment.condition.label,
            description: r.experiment.condition.id,
          },
        ]
      : [],
  specificity: (r) =>
    r.specificity ? [{ value: r.specificity, label: SPECIFICITY_LABELS[r.specificity] ?? r.specificity }] : [],
  result: (r) =>
    r.works === null ? [] : [{ value: r.works ? "works" : "failed", label: r.works ? "Works" : "Failed" }],
  lab: (r) =>
    r.experiment.owningLab ? [{ value: r.experiment.owningLab.id, label: r.experiment.owningLab.name }] : [],
  source: (r) => (r.experiment.source ? [{ value: r.experiment.source.id, label: r.experiment.source.name }] : []),
}

function buildFacets(reports: ReportRow[]): BrowseFacets {
  const facets: BrowseFacets = {}
  for (const [key, extract] of Object.entries(FACET_EXTRACTORS)) {
    const counts = new Map<string, { label: string; description?: string; count: number }>()
    for (const report of reports) {
      for (const option of extract(report)) {
        const current = counts.get(option.value)
        if (current) current.count += 1
        else counts.set(option.value, { label: option.label, description: option.description, count: 1 })
      }
    }
    facets[key] = [...counts.entries()]
      .sort((a, b) => b[1].count - a[1].count || a[1].label.localeCompare(b[1].label))
      .map(([value, { label, description }]) => ({ value, label, description }))
  }
  return facets
}

export async function getBrowseFacets(): Promise<BrowseFacets> {
  const reports = await prisma.experimentalReport.findMany({
    select: reportSelect,
    where: BROWSE_REPORT_SCOPE,
    take: BROWSE_AGGREGATION_CAP,
  })
  return buildFacets(reports)
}

// Lab-scoped facet set: derived from every report on the lab's experiments (all statuses/visibility),
// mirroring how browse derives a single report-based facet set shared across all of its modes.
export async function getLabContentFacets(labId: string): Promise<BrowseFacets> {
  const reports = await prisma.experimentalReport.findMany({
    select: reportSelect,
    where: labReportScope(labId),
    take: BROWSE_AGGREGATION_CAP,
  })
  return buildFacets(reports)
}

// Public lane: only ever returns a PUBLISHED report on a PUBLIC experiment. Used by the cached
// detail page and by metadata, neither of which can read auth() under cacheComponents.
export async function getPublicReportById(id: string): Promise<ReportRow | null> {
  return prisma.experimentalReport.findFirst({
    where: { AND: [{ id }, BROWSE_REPORT_SCOPE] },
    select: reportSelect,
  })
}

// Private lane: returns the report only if the viewer may see it (public, own, or lab-shared).
export async function getVisibleReportById(id: string, viewer: ViewerContext | null): Promise<ReportRow | null> {
  return prisma.experimentalReport.findFirst({
    where: { AND: [{ id }, buildReportVisibilityWhere(viewer)] },
    select: reportSelect,
  })
}

// Private lane: reports for an experiment the viewer can see, including unpublished (PENDING) lab work.
export async function getVisibleReportsForExperiment(
  experimentId: string,
  viewer: ViewerContext | null,
): Promise<ReportRow[]> {
  return prisma.experimentalReport.findMany({
    where: { AND: [{ experimentId }, buildReportVisibilityWhere(viewer)] },
    select: reportSelect,
    orderBy: { createdAt: "asc" },
  })
}

// Public lane reader: every caller shares BROWSE_REPORT_SCOPE so the rule has one definition.
function publishedReports(where: Prisma.ExperimentalReportWhereInput): Promise<ReportRow[]> {
  return prisma.experimentalReport.findMany({
    select: reportSelect,
    where: { AND: [BROWSE_REPORT_SCOPE, where] },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  })
}

export async function getReportsForAntibody(antibodyId: string): Promise<ReportRow[]> {
  return publishedReports({ antibodyId })
}

export async function getReportsForCellType(cellTypeId: string): Promise<ReportRow[]> {
  return publishedReports({ cellTypes: { some: { cellTypeId } } })
}

export async function getImagesForCellType(cellTypeId: string): Promise<CarouselImage[]> {
  const images = await prisma.image.findMany({
    where: {
      cellTypes: { some: { cellTypeId } },
      channels: { some: { report: BROWSE_REPORT_SCOPE } },
    },
    select: imageWithChannelsSelect,
    orderBy: { createdAt: "desc" },
  })

  return images.map((image) => {
    const links: CarouselImageLink[] = []
    for (const channel of image.channels) {
      const antibody = channel.report?.antibody
      if (!antibody || channel.role !== "TARGET") continue
      const markerName = antibody.targetName ?? antibody.name
      if (antibody.targetProteinId) links.push({ label: markerName, href: markerHref(antibody.targetProteinId) })
      const abHref = antibodyHref(antibody.rrid)
      if (abHref) links.push({ label: antibody.name, href: abHref })
    }
    const target = image.channels.find((channel) => channel.role === "TARGET" && channel.report?.antibody)
    const title = target?.report?.antibody?.targetName ?? target?.report?.antibody?.name ?? undefined
    return { src: image.url, caption: image.caption, title, links, channels: toCarouselChannels(image) }
  })
}

export async function getConditionById(conditionId: string): Promise<{ id: string; label: string } | null> {
  return prisma.diseaseCondition.findUnique({ where: { id: conditionId } })
}

export async function getReportsForCondition(conditionId: string): Promise<ReportRow[]> {
  return publishedReports({ experiment: { conditionId } })
}

export async function getCellTypesFromReports(proteinId: string): Promise<{ id: string; label: string }[]> {
  const links = await prisma.reportCellType.findMany({
    where: {
      report: { ...BROWSE_REPORT_SCOPE, antibody: { targetProteinId: proteinId } },
    },
    select: { cellType: { select: { id: true, label: true } } },
    distinct: ["cellTypeId"],
  })

  return links.map((l) => l.cellType)
}

export async function getReportsForProtein(proteinId: string): Promise<ReportRow[]> {
  return publishedReports({ antibody: { targetProteinId: proteinId } })
}

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]
type OntologyValue = { id: string; label: string }

async function resolveProtein(tx: TxClient, data: CreateReportData): Promise<string | undefined> {
  const pd = data.proteinData
  if (!pd) return undefined

  const existing = await tx.protein.findUnique({ where: { id: pd.id } })
  if (existing) return existing.id

  return (await tx.protein.create({ data: { id: pd.id, label: pd.label, geneSymbol: pd.geneSymbol ?? null } })).id
}

async function resolveAntibody(
  tx: TxClient,
  data: CreateReportData,
  proteinId: string | undefined,
  hostTaxonId: string | undefined,
): Promise<string | undefined> {
  if (data.antibodyId) {
    const existing = await tx.antibody.findUnique({ where: { id: data.antibodyId } })
    if (existing) return existing.id
  }

  const rrid = data.rrid || data.antibodyData?.citation
  if (rrid) {
    const byRrid = await tx.antibody.findFirst({ where: { rrid } })
    if (byRrid) return byRrid.id
  }

  const ab = data.antibodyData
  if (!ab) return undefined

  return (
    await tx.antibody.create({
      // Shared registry mapping, then the submission form's own fallbacks on top.
      data: {
        ...registryToAntibodyCreate(ab, {
          rrid: rrid || null,
          hostTaxonId: hostTaxonId ?? null,
          targetProteinId: proteinId ?? null,
        }),
        name: ab.name || data.markerName || "Unknown",
        catalogNumber: ab.catalogNumber || data.catalogNumber || null,
        cloneId: ab.cloneId || data.cloneId || null,
        targetName: ab.target || data.markerName || null,
        vendorName: ab.vendor || data.antibodyVendor || null,
      },
    })
  ).id
}

type OntologyKind =
  | "cellType"
  | "cellularComponent"
  | "condition"
  | "developmentalStage"
  | "fixative"
  | "imagingMethod"
  | "taxon"
  | "tissue"

const ONTOLOGY_RESOLVERS: Record<
  OntologyKind,
  {
    exists: (id: string) => Promise<boolean>
    search: (q: string) => Promise<OntologyResult[]>
    noun: string
    ontology: string
  }
> = {
  cellType: {
    exists: async (id) => (await prisma.cellType.findUnique({ where: { id }, select: { id: true } })) !== null,
    search: searchCellOntology,
    noun: "Cell type",
    ontology: "Cell Ontology",
  },
  cellularComponent: {
    exists: async (id) => (await prisma.cellularComponent.findUnique({ where: { id }, select: { id: true } })) !== null,
    search: searchGoCellularComponent,
    noun: "Subcellular location",
    ontology: "GO Cellular Component",
  },
  condition: {
    exists: async (id) => (await prisma.diseaseCondition.findUnique({ where: { id }, select: { id: true } })) !== null,
    search: searchDiseaseOntology,
    noun: "Disease condition",
    ontology: "Disease Ontology",
  },
  developmentalStage: {
    exists: async (id) =>
      (await prisma.developmentalStage.findUnique({ where: { id }, select: { id: true } })) !== null,
    // HsapDv covers human donors and MmusDv mouse; the submit form picks the ontology from the
    // experiment species, so accept an id from either here.
    search: async (q) => [...(await searchHsapDv(q)), ...(await searchMmusDv(q))],
    noun: "Developmental stage",
    ontology: "HsapDv or MmusDv",
  },
  fixative: {
    exists: async (id) => (await prisma.fixative.findUnique({ where: { id }, select: { id: true } })) !== null,
    search: searchChebi,
    noun: "Fixative",
    ontology: "ChEBI",
  },
  imagingMethod: {
    exists: async (id) => (await prisma.imagingMethod.findUnique({ where: { id }, select: { id: true } })) !== null,
    search: searchEfoImagingMethods,
    noun: "Imaging method",
    ontology: "EFO",
  },
  taxon: {
    exists: async (id) => (await prisma.taxon.findUnique({ where: { id }, select: { id: true } })) !== null,
    search: searchSpecies,
    noun: "Species",
    ontology: "NCBI Taxonomy",
  },
  tissue: {
    exists: async (id) => (await prisma.tissue.findUnique({ where: { id }, select: { id: true } })) !== null,
    search: searchUberon,
    noun: "Tissue",
    ontology: "UBERON",
  },
}

// Accepts a term already in the catalog, otherwise requires the source ontology to confirm that the
// submitted id really carries the submitted label before anything is written.
export async function validateAndResolveOntologyTerm(kind: OntologyKind, value: OntologyValue): Promise<OntologyValue> {
  const resolver = ONTOLOGY_RESOLVERS[kind]
  if (await resolver.exists(value.id)) return value

  const match = (await resolver.search(value.label)).find((term) => term.id === value.id)
  if (!match) {
    throw new UnprocessableError(`${resolver.noun} ${value.id} (${value.label}) not found in ${resolver.ontology}`)
  }
  return { id: match.id, label: match.label }
}

async function validateAntibody(data: CreateReportData): Promise<void> {
  const rrid = data.rrid || data.antibodyData?.citation
  const ab = data.antibodyData
  if (!rrid || !ab || data.antibodyId) return

  const existing = await prisma.antibody.findFirst({ where: { rrid } })
  if (existing) return

  const registryResult = await lookupAntibodyByRrid(rrid)
  if (registryResult) return

  // Fallback for resolver outages: search by the RRID itself and require an exact citation match.
  // Searching by name would accept any unrelated hit and persist a bogus RRID on a global Antibody.
  const searchResults = await searchAntibodyRegistry(rrid, 1)
  if (normalizeRrid(searchResults[0]?.citation ?? "") !== normalizeRrid(rrid)) {
    throw new UnprocessableError(`Antibody with RRID ${rrid} not found in Antibody Registry`)
  }
}

type ExperimentContextInput = {
  name?: string | null
  description?: string | null
  citation?: string | null
  pmid?: string | null
  doi?: string | null
  species?: OntologyValue | null
  tissue?: OntologyValue | null
  condition?: OntologyValue | null
  imagingMethod?: OntologyValue | null
  antigenRetrieval?: CreateReportData["antigenRetrieval"]
  visibility?: Visibility
  sharedLabIds?: string[]
  owningLabId?: string | null
} & SpecimenInput

function specimenContextOf(source: SpecimenInput): SpecimenInput {
  return {
    preservation: source.preservation,
    preservationText: source.preservationText,
    fixative: source.fixative,
    fixativeConcentration: source.fixativeConcentration,
    antigenRetrievalText: source.antigenRetrievalText,
    sampleType: source.sampleType,
    sectionThicknessUm: source.sectionThicknessUm,
    donorSex: source.donorSex,
    donorAge: source.donorAge,
    developmentalStage: source.developmentalStage,
    protocolDoi: source.protocolDoi,
  }
}

export async function resolveAndCreateExperiment(ctx: ExperimentContextInput, submitterId: string): Promise<string> {
  const resolvedSpecies = ctx.species ? await validateAndResolveOntologyTerm("taxon", ctx.species) : undefined
  const resolvedTissue = ctx.tissue ? await validateAndResolveOntologyTerm("tissue", ctx.tissue) : undefined
  const resolvedCondition = ctx.condition ? await validateAndResolveOntologyTerm("condition", ctx.condition) : undefined
  const resolvedFixative = ctx.fixative ? await validateAndResolveOntologyTerm("fixative", ctx.fixative) : undefined
  const resolvedStage = ctx.developmentalStage
    ? await validateAndResolveOntologyTerm("developmentalStage", ctx.developmentalStage)
    : undefined
  const resolvedImagingMethod = ctx.imagingMethod
    ? await validateAndResolveOntologyTerm("imagingMethod", ctx.imagingMethod)
    : undefined
  // New submissions default to LAB when the submitter belongs to a lab, otherwise PRIVATE.
  const access = await resolveResourceVisibility({
    ownerId: submitterId,
    defaultVisibility: "LAB",
    visibility: ctx.visibility,
    sharedLabIds: ctx.sharedLabIds,
    owningLabId: ctx.owningLabId,
  })

  return prisma.$transaction(async (tx) => {
    if (resolvedSpecies) {
      await tx.taxon.upsert({ where: { id: resolvedSpecies.id }, update: {}, create: resolvedSpecies })
    }
    if (resolvedTissue) {
      await tx.tissue.upsert({ where: { id: resolvedTissue.id }, update: {}, create: resolvedTissue })
    }
    if (resolvedCondition) {
      await tx.diseaseCondition.upsert({
        where: { id: resolvedCondition.id },
        update: {},
        create: resolvedCondition,
      })
    }
    if (resolvedFixative) {
      await tx.fixative.upsert({ where: { id: resolvedFixative.id }, update: {}, create: resolvedFixative })
    }
    if (resolvedStage) {
      await tx.developmentalStage.upsert({ where: { id: resolvedStage.id }, update: {}, create: resolvedStage })
    }
    if (resolvedImagingMethod) {
      await tx.imagingMethod.upsert({
        where: { id: resolvedImagingMethod.id },
        update: {},
        create: resolvedImagingMethod,
      })
    }

    const experiment = await tx.experiment.create({
      data: {
        name: ctx.name ?? null,
        description: ctx.description ?? null,
        citation: ctx.citation ?? null,
        pmid: ctx.pmid ?? null,
        doi: ctx.doi ?? null,
        speciesId: resolvedSpecies?.id ?? null,
        tissueId: resolvedTissue?.id ?? null,
        conditionId: resolvedCondition?.id ?? null,
        preservation: ctx.preservation ?? null,
        preservationText: ctx.preservationText ?? null,
        fixativeId: resolvedFixative?.id ?? null,
        fixativeConcentration: ctx.fixativeConcentration ?? null,
        antigenRetrievalText: ctx.antigenRetrievalText ?? null,
        sampleType: ctx.sampleType ?? null,
        sectionThicknessUm: ctx.sectionThicknessUm ?? null,
        donorSex: ctx.donorSex ?? null,
        donorAge: ctx.donorAge ?? null,
        developmentalStageId: resolvedStage?.id ?? null,
        protocolDoi: ctx.protocolDoi ?? null,
        imagingMethodId: resolvedImagingMethod?.id ?? null,
        antigenRetrieval: ctx.antigenRetrieval ?? null,
        visibility: access.visibility,
        owningLabId: access.owningLabId,
        submitterId,
      },
      select: { id: true },
    })

    if (access.sharedLabIds.length > 0) {
      await tx.experimentLabShare.createMany({
        data: access.sharedLabIds.map((labId) => ({ experimentId: experiment.id, labId })),
        skipDuplicates: true,
      })
    }

    return experiment.id
  })
}

export async function resolveAndCreateReport(data: CreateReportData, experimentId: string): Promise<ReportRow> {
  const resolvedCellTypes: OntologyValue[] = []
  for (const ct of data.cellTypes ?? []) {
    resolvedCellTypes.push(await validateAndResolveOntologyTerm("cellType", ct))
  }
  const resolvedHostTaxon = data.hostSpecies
    ? await validateAndResolveOntologyTerm("taxon", data.hostSpecies)
    : undefined
  const resolvedSubcellular = data.subcellularLocation
    ? await validateAndResolveOntologyTerm("cellularComponent", data.subcellularLocation)
    : undefined

  await validateAntibody(data)

  return prisma.$transaction(async (tx) => {
    const proteinId = await resolveProtein(tx, data)

    if (resolvedHostTaxon) {
      await tx.taxon.upsert({ where: { id: resolvedHostTaxon.id }, update: {}, create: resolvedHostTaxon })
    }
    if (resolvedSubcellular) {
      await tx.cellularComponent.upsert({
        where: { id: resolvedSubcellular.id },
        update: {},
        create: resolvedSubcellular,
      })
    }
    if (resolvedCellTypes.length > 0) {
      await tx.cellType.createMany({ data: resolvedCellTypes, skipDuplicates: true })
    }

    const antibodyId = await resolveAntibody(tx, data, proteinId, resolvedHostTaxon?.id)

    const report = await tx.experimentalReport.create({
      data: {
        experimentId,
        antibodyId: antibodyId ?? data.antibodyId ?? null,
        subcellularId: resolvedSubcellular?.id ?? null,
        fluorophoreId: data.fluorophoreId ?? null,
        metalTag: data.metalTag ?? null,
        cycleNumber: data.cycleNumber ?? null,
        dilution: data.dilution ?? null,
        incubation: data.incubation ?? null,
        works: data.works ?? null,
        signalQuality: data.signalQuality ?? null,
        specificity: data.specificity ?? null,
        notes: data.notes ?? null,
      },
      select: { id: true },
    })

    if (resolvedCellTypes.length > 0) {
      await tx.reportCellType.createMany({
        data: resolvedCellTypes.map((ct) => ({ reportId: report.id, cellTypeId: ct.id })),
        skipDuplicates: true,
      })
    }

    const resolvedCellTypeIds = new Set(resolvedCellTypes.map((ct) => ct.id))
    const images = data.images ?? []
    for (let i = 0; i < images.length; i++) {
      const input = images[i]
      const caption = input.caption?.trim() || null
      const image = await tx.image.upsert({
        where: { experimentId_url: { experimentId, url: input.url } },
        update: {},
        create: { experimentId, url: input.url, caption, sortOrder: i },
        select: { id: true, caption: true, channels: { select: { role: true, label: true } } },
      })
      if (!image.caption && caption) await tx.image.update({ where: { id: image.id }, data: { caption } })

      const tags = (input.cellTypeIds ?? []).filter((id) => resolvedCellTypeIds.has(id))
      if (tags.length > 0) {
        await tx.imageCellType.createMany({
          data: tags.map((cellTypeId) => ({ imageId: image.id, cellTypeId })),
          skipDuplicates: true,
        })
      }

      let sortOrder = image.channels.length
      await tx.imageChannel.create({
        data: {
          imageId: image.id,
          reportId: report.id,
          role: "TARGET",
          displayColor: input.displayColor ?? null,
          sortOrder: sortOrder++,
        },
      })
      for (const reference of input.references ?? []) {
        const known = image.channels.some(
          (channel) =>
            channel.role === reference.role && channel.label?.toLowerCase() === reference.label.toLowerCase(),
        )
        if (known) continue
        await tx.imageChannel.create({
          data: {
            imageId: image.id,
            role: reference.role,
            label: reference.label,
            fluorophoreId: reference.fluorophoreId ?? null,
            displayColor: reference.displayColor ?? null,
            sortOrder: sortOrder++,
          },
        })
      }
    }

    return tx.experimentalReport.findUniqueOrThrow({ where: { id: report.id }, select: reportSelect })
  })
}

export type BatchReportResult = {
  created: ReportRow[]
  failed: { index: number; markerName: string; error: string }[]
}

export async function resolveAndCreateReports(
  batch: CreateReportBatchData,
  submitterId: string,
): Promise<BatchReportResult> {
  const { context, antibodies } = batch
  const created: ReportRow[] = []
  const failed: BatchReportResult["failed"] = []

  const experimentId = await resolveAndCreateExperiment(
    {
      name: context.name ?? null,
      description: context.description ?? null,
      citation: context.citation ?? null,
      pmid: context.pmid ?? null,
      doi: context.doi ?? null,
      species: context.species ?? null,
      tissue: context.tissue ?? null,
      condition: context.condition ?? null,
      ...specimenContextOf(context),
      imagingMethod: context.imagingMethod ?? null,
      antigenRetrieval: context.antigenRetrieval,
      visibility: context.visibility,
      sharedLabIds: context.sharedLabIds,
      owningLabId: context.owningLabId,
    },
    submitterId,
  )

  for (let index = 0; index < antibodies.length; index++) {
    const item = antibodies[index]
    const reportData: CreateReportData = {
      markerName: item.markerName,
      rrid: item.rrid,
      antibodyVendor: item.antibodyVendor,
      catalogNumber: item.catalogNumber,
      cloneId: item.cloneId,
      hostSpecies: item.hostSpecies ?? null,
      cellTypes: item.cellTypes,
      dilution: item.dilution,
      incubation: item.incubation,
      fluorophoreId: item.fluorophoreId,
      metalTag: item.metalTag,
      cycleNumber: item.cycleNumber,
      works: item.works,
      signalQuality: item.signalQuality,
      specificity: item.specificity,
      subcellularLocation: item.subcellularLocation,
      notes: item.notes,
      images: item.images,
      antibodyData: item.antibodyData,
      proteinData: item.proteinData,
    }

    try {
      created.push(await resolveAndCreateReport(reportData, experimentId))
    } catch (error) {
      failed.push({
        index,
        markerName: item.markerName,
        error: error instanceof Error ? error.message : "Failed to create report",
      })
    }
  }

  if (created.length === 0) {
    await prisma.experiment.delete({ where: { id: experimentId } }).catch(() => {})
  }

  return { created, failed }
}

export async function createReport(data: CreateReportData, submitterId: string): Promise<ReportRow> {
  const experimentId = await resolveAndCreateExperiment(
    {
      citation: data.citation ?? null,
      pmid: data.pmid ?? null,
      doi: data.doi ?? null,
      species: data.species ?? null,
      tissue: data.tissue ?? null,
      condition: data.condition ?? null,
      ...specimenContextOf(data),
      imagingMethod: data.imagingMethod ?? null,
      antigenRetrieval: data.antigenRetrieval,
      visibility: data.visibility,
      sharedLabIds: data.sharedLabIds,
      owningLabId: data.owningLabId,
    },
    submitterId,
  )
  return resolveAndCreateReport(data, experimentId)
}

export async function getPendingReports(): Promise<ReportRow[]> {
  return prisma.experimentalReport.findMany({
    select: reportSelect,
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
  })
}

export async function updateReportStatus(id: string, status: ValidationStatus): Promise<ReportRow> {
  return prisma.experimentalReport.update({
    where: { id },
    data: { status },
    select: reportSelect,
  })
}
