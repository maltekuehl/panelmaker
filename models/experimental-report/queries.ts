import "server-only"

import type { AntibodyEntry, MarkerEntry, ReportEntry } from "@/components/browse/columns"
import { CLONALITY_LABELS, FIXATION_LABELS, METHOD_LABELS, SPECIFICITY_LABELS } from "@/lib/constants"
import { FILTER_KEYS, type BrowseMarkerParams } from "@/lib/data-table"
import type { Clonality, Prisma, ValidationStatus } from "@/lib/generated/prisma/client"
import { lookupAntibodyByRrid, searchAntibodyRegistry } from "@/lib/integrations/antibody-registry"
import {
  searchCellOntology,
  searchDiseaseOntology,
  searchGoCellularComponent,
  searchSpecies,
  searchUberon,
} from "@/lib/ontology"
import { prisma } from "@/lib/prisma"
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
  fixation?: string | string[]
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
  antibodyId: true,
  speciesId: true,
  tissueId: true,
  subcellularId: true,
  fixation: true,
  method: true,
  fluorophoreId: true,
  metalTag: true,
  cycleNumber: true,
  dilution: true,
  incubation: true,
  antigenRetrieval: true,
  status: true,
  works: true,
  signalQuality: true,
  specificity: true,
  notes: true,
  imageUrls: true,
  conditionId: true,
  submitterId: true,
  isPublic: true,
  createdAt: true,
  updatedAt: true,
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
  species: { select: { id: true, label: true } },
  tissue: { select: { id: true, label: true } },
  subcellular: { select: { id: true, label: true } },
  condition: { select: { id: true, label: true } },
  cellTypes: { select: { cellType: { select: { id: true, label: true } } } },
  submitter: {
    select: {
      id: true,
      name: true,
      institution: true,
    },
  },
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
  species: (v) => ({ speciesId: { in: v } }),
  tissue: (v) => ({ tissueId: { in: v } }),
  method: (v) => ({ method: { in: v as Prisma.EnumMultiplexMethodNullableFilter["in"] } }),
  fixation: (v) => ({ fixation: { in: v as Prisma.EnumFixationNullableFilter["in"] } }),
  vendor: (v) => ({ antibody: { vendorName: { in: v } } }),
  host: (v) => ({ antibody: { hostTaxonId: { in: v } } }),
  conjugate: (v) => ({ antibody: { conjugate: { in: v } } }),
  clonality: (v) => ({ antibody: { clonality: { in: v as Prisma.EnumClonalityNullableFilter["in"] } } }),
  subcellular: (v) => ({ subcellularId: { in: v } }),
  condition: (v) => ({ conditionId: { in: v } }),
  specificity: (v) => ({ specificity: { in: v as Prisma.EnumSpecificityNullableFilter["in"] } }),
  result: (v) => resultWhere(v),
}

function buildReportWhere(
  q: string | undefined,
  filters: Record<string, string[]>,
): Prisma.ExperimentalReportWhereInput {
  const conditions: Prisma.ExperimentalReportWhereInput[] = [{ isPublic: true, status: "PUBLISHED" }]

  if (q) {
    conditions.push({
      OR: [
        { antibody: { name: { contains: q, mode: "insensitive" } } },
        { antibody: { targetName: { contains: q, mode: "insensitive" } } },
        { antibody: { vendorName: { contains: q, mode: "insensitive" } } },
        { cellTypes: { some: { cellType: { label: { contains: q, mode: "insensitive" } } } } },
        { tissue: { label: { contains: q, mode: "insensitive" } } },
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

function browseFilters(params: BrowseMarkerParams): Record<string, string[]> {
  const filters: Record<string, string[]> = {}
  for (const key of FILTER_KEYS) {
    const value = params[key as keyof BrowseMarkerParams]
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
      fixation: toFilterList(params.fixation),
      species: toFilterList(params.species),
      tissue: toFilterList(params.tissue),
    }),
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
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

function paginate<T>(rows: T[], page = 1, pageSize = 20): EntriesPage<T> {
  const total = rows.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const current = Math.min(Math.max(1, page), pageCount)
  return { rows: rows.slice((current - 1) * pageSize, current * pageSize), total, page: current, pageSize, pageCount }
}

async function fetchBrowseReports(params: BrowseQueryParams): Promise<ReportRow[]> {
  return prisma.experimentalReport.findMany({
    select: reportSelect,
    where: buildReportWhere(params.q, browseFilters(params)),
    orderBy: { createdAt: "desc" },
    take: BROWSE_AGGREGATION_CAP,
  })
}

export async function getMarkerEntriesPage(params: BrowseQueryParams): Promise<EntriesPage<MarkerEntry>> {
  const reports = await fetchBrowseReports(params)
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

export type FacetOption = { value: string; label: string; description?: string }

export type BrowseFacets = Record<string, FacetOption[]>

type FacetExtractor = (report: ReportRow) => FacetOption[]

const FACET_EXTRACTORS: Record<string, FacetExtractor> = {
  species: (r) => (r.species ? [{ value: r.species.id, label: r.species.label, description: r.species.id }] : []),
  tissue: (r) => (r.tissue ? [{ value: r.tissue.id, label: r.tissue.label, description: r.tissue.id }] : []),
  method: (r) => (r.method ? [{ value: r.method, label: METHOD_LABELS[r.method] ?? r.method }] : []),
  fixation: (r) => (r.fixation ? [{ value: r.fixation, label: FIXATION_LABELS[r.fixation] ?? r.fixation }] : []),
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
    r.condition ? [{ value: r.condition.id, label: r.condition.label, description: r.condition.id }] : [],
  specificity: (r) =>
    r.specificity ? [{ value: r.specificity, label: SPECIFICITY_LABELS[r.specificity] ?? r.specificity }] : [],
  result: (r) =>
    r.works === null ? [] : [{ value: r.works ? "works" : "failed", label: r.works ? "Works" : "Failed" }],
}

export async function getBrowseFacets(): Promise<BrowseFacets> {
  const reports = await prisma.experimentalReport.findMany({
    select: reportSelect,
    where: { isPublic: true, status: "PUBLISHED" },
    take: BROWSE_AGGREGATION_CAP,
  })

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

export async function getReportById(id: string): Promise<ReportRow | null> {
  return prisma.experimentalReport.findUnique({
    where: { id },
    select: reportSelect,
  })
}

export async function getReportsForAntibody(antibodyId: string): Promise<ReportRow[]> {
  return prisma.experimentalReport.findMany({
    select: reportSelect,
    where: { antibodyId, isPublic: true, status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
  })
}

export async function getReportsForCellType(cellTypeId: string): Promise<ReportRow[]> {
  return prisma.experimentalReport.findMany({
    select: reportSelect,
    where: { cellTypes: { some: { cellTypeId } }, isPublic: true, status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
  })
}

export async function getConditionById(conditionId: string): Promise<{ id: string; label: string } | null> {
  return prisma.diseaseCondition.findUnique({ where: { id: conditionId } })
}

export async function getReportsForCondition(conditionId: string): Promise<ReportRow[]> {
  return prisma.experimentalReport.findMany({
    select: reportSelect,
    where: { conditionId, isPublic: true, status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
  })
}

export async function getReportsForTissue(tissueId: string): Promise<ReportRow[]> {
  return prisma.experimentalReport.findMany({
    select: reportSelect,
    where: { tissueId, isPublic: true, status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
  })
}

export async function getReportsForSubcellular(subcellularId: string): Promise<ReportRow[]> {
  return prisma.experimentalReport.findMany({
    select: reportSelect,
    where: { subcellularId, isPublic: true, status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
  })
}

export async function getReportsForTaxon(speciesId: string): Promise<ReportRow[]> {
  return prisma.experimentalReport.findMany({
    select: reportSelect,
    where: { speciesId, isPublic: true, status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
  })
}

export async function getCellTypesFromReports(proteinId: string): Promise<{ id: string; label: string }[]> {
  const links = await prisma.reportCellType.findMany({
    where: {
      report: { antibody: { targetProteinId: proteinId }, isPublic: true, status: "PUBLISHED" },
    },
    select: { cellType: { select: { id: true, label: true } } },
    distinct: ["cellTypeId"],
  })

  return links.map((l) => l.cellType)
}

export async function getReportsForProtein(proteinId: string): Promise<ReportRow[]> {
  return prisma.experimentalReport.findMany({
    select: reportSelect,
    where: {
      antibody: { targetProteinId: proteinId },
      isPublic: true,
      status: "PUBLISHED",
    },
    orderBy: { createdAt: "desc" },
  })
}

const CLONALITY_MAP: Record<string, Clonality> = {
  monoclonal: "MONOCLONAL",
  polyclonal: "POLYCLONAL",
  recombinant: "RECOMBINANT",
  oligoclonal: "OLIGOCLONAL",
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

  const clonality = CLONALITY_MAP[ab.clonality.toLowerCase()] ?? null

  return (
    await tx.antibody.create({
      data: {
        rrid: rrid || null,
        name: ab.name || data.markerName || "Unknown",
        catalogNumber: ab.catalogNumber || data.catalogNumber || null,
        cloneId: ab.cloneId || data.cloneId || null,
        clonality,
        hostTaxonId: hostTaxonId ?? null,
        targetSpecies: JSON.stringify(ab.targetSpecies ?? []),
        targetProteinId: proteinId ?? null,
        targetName: ab.target || data.markerName || null,
        applications: JSON.stringify(ab.applications ?? []),
        conjugate: ab.conjugate || null,
        vendorName: ab.vendor || data.antibodyVendor || null,
        vendorUrl: ab.url || null,
      },
    })
  ).id
}

async function validateAndResolveCellType(cellType: OntologyValue): Promise<OntologyValue> {
  const existing = await prisma.cellType.findUnique({ where: { id: cellType.id } })
  if (existing) return existing

  const ontologyResults = await searchCellOntology(cellType.label)
  const match = ontologyResults.find((r) => r.id === cellType.id)
  if (!match) {
    throw new Error(`Cell type ${cellType.id} (${cellType.label}) not found in Cell Ontology`)
  }
  return { id: match.id, label: match.label }
}

async function validateAndResolveCellularComponent(component: OntologyValue): Promise<OntologyValue> {
  const existing = await prisma.cellularComponent.findUnique({ where: { id: component.id } })
  if (existing) return existing

  const ontologyResults = await searchGoCellularComponent(component.label)
  const match = ontologyResults.find((r) => r.id === component.id)
  if (!match) {
    throw new Error(`Subcellular location ${component.id} (${component.label}) not found in GO Cellular Component`)
  }
  return { id: match.id, label: match.label }
}

async function validateAndResolveCondition(condition: OntologyValue): Promise<OntologyValue> {
  const existing = await prisma.diseaseCondition.findUnique({ where: { id: condition.id } })
  if (existing) return existing

  const ontologyResults = await searchDiseaseOntology(condition.label)
  const match = ontologyResults.find((r) => r.id === condition.id)
  if (!match) {
    throw new Error(`Disease condition ${condition.id} (${condition.label}) not found in Disease Ontology`)
  }
  return { id: match.id, label: match.label }
}

async function validateAndResolveTaxon(taxon: OntologyValue): Promise<OntologyValue> {
  const existing = await prisma.taxon.findUnique({ where: { id: taxon.id } })
  if (existing) return existing

  const ontologyResults = await searchSpecies(taxon.label)
  const match = ontologyResults.find((r) => r.id === taxon.id)
  if (!match) {
    throw new Error(`Species ${taxon.id} (${taxon.label}) not found in NCBI Taxonomy`)
  }
  return { id: match.id, label: match.label }
}

async function validateAndResolveTissue(tissue: OntologyValue): Promise<OntologyValue> {
  const existing = await prisma.tissue.findUnique({ where: { id: tissue.id } })
  if (existing) return existing

  const ontologyResults = await searchUberon(tissue.label)
  const match = ontologyResults.find((r) => r.id === tissue.id)
  if (!match) {
    throw new Error(`Tissue ${tissue.id} (${tissue.label}) not found in UBERON`)
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
  if (!registryResult) {
    const searchResults = await searchAntibodyRegistry(ab.name || ab.target, 1)
    if (searchResults.length === 0) {
      throw new Error(`Antibody with RRID ${rrid} not found in Antibody Registry`)
    }
  }
}

export async function resolveAndCreateReport(data: CreateReportData, submitterId: string): Promise<ReportRow> {
  const resolvedCellTypes: OntologyValue[] = []
  for (const ct of data.cellTypes ?? []) {
    resolvedCellTypes.push(await validateAndResolveCellType(ct))
  }
  const resolvedSpecies = data.species ? await validateAndResolveTaxon(data.species) : undefined
  const resolvedHostTaxon = data.hostSpecies ? await validateAndResolveTaxon(data.hostSpecies) : undefined
  const resolvedTissue = data.tissue ? await validateAndResolveTissue(data.tissue) : undefined
  const resolvedSubcellular = data.subcellularLocation
    ? await validateAndResolveCellularComponent(data.subcellularLocation)
    : undefined
  const resolvedCondition = data.condition ? await validateAndResolveCondition(data.condition) : undefined

  await validateAntibody(data)

  return prisma.$transaction(async (tx) => {
    const proteinId = await resolveProtein(tx, data)

    for (const taxon of [resolvedSpecies, resolvedHostTaxon]) {
      if (taxon && !(await tx.taxon.findUnique({ where: { id: taxon.id }, select: { id: true } }))) {
        await tx.taxon.create({ data: taxon })
      }
    }
    if (resolvedTissue && !(await tx.tissue.findUnique({ where: { id: resolvedTissue.id }, select: { id: true } }))) {
      await tx.tissue.create({ data: resolvedTissue })
    }
    if (
      resolvedSubcellular &&
      !(await tx.cellularComponent.findUnique({ where: { id: resolvedSubcellular.id }, select: { id: true } }))
    ) {
      await tx.cellularComponent.create({ data: resolvedSubcellular })
    }
    if (
      resolvedCondition &&
      !(await tx.diseaseCondition.findUnique({ where: { id: resolvedCondition.id }, select: { id: true } }))
    ) {
      await tx.diseaseCondition.create({ data: resolvedCondition })
    }
    for (const ct of resolvedCellTypes) {
      if (!(await tx.cellType.findUnique({ where: { id: ct.id }, select: { id: true } }))) {
        await tx.cellType.create({ data: ct })
      }
    }

    const antibodyId = await resolveAntibody(tx, data, proteinId, resolvedHostTaxon?.id)

    const report = await tx.experimentalReport.create({
      data: {
        antibodyId: antibodyId ?? data.antibodyId ?? null,
        speciesId: resolvedSpecies?.id ?? null,
        tissueId: resolvedTissue?.id ?? null,
        subcellularId: resolvedSubcellular?.id ?? null,
        conditionId: resolvedCondition?.id ?? null,
        fixation: data.fixation ?? null,
        method: data.method ?? null,
        fluorophoreId: data.fluorophoreId ?? null,
        metalTag: data.metalTag ?? null,
        cycleNumber: data.cycleNumber ?? null,
        dilution: data.dilution ?? null,
        incubation: data.incubation ?? null,
        antigenRetrieval: data.antigenRetrieval ?? null,
        works: data.works ?? null,
        signalQuality: data.signalQuality ?? null,
        specificity: data.specificity ?? null,
        notes: data.notes ?? null,
        isPublic: data.isPublic ?? true,
        submitterId,
        imageUrls: JSON.stringify(data.imageUrls ?? []),
      },
      select: { id: true },
    })

    if (resolvedCellTypes.length > 0) {
      await tx.reportCellType.createMany({
        data: resolvedCellTypes.map((ct) => ({ reportId: report.id, cellTypeId: ct.id })),
        skipDuplicates: true,
      })
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

  for (let index = 0; index < antibodies.length; index++) {
    const item = antibodies[index]
    const reportData: CreateReportData = {
      species: context.species ?? null,
      tissue: context.tissue ?? null,
      fixation: context.fixation,
      method: context.method,
      antigenRetrieval: context.antigenRetrieval,
      condition: context.condition ?? null,
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
      imageUrls: item.imageUrls,
      antibodyData: item.antibodyData,
      proteinData: item.proteinData,
      isPublic: true,
    }

    try {
      created.push(await resolveAndCreateReport(reportData, submitterId))
    } catch (error) {
      failed.push({
        index,
        markerName: item.markerName,
        error: error instanceof Error ? error.message : "Failed to create report",
      })
    }
  }

  return { created, failed }
}

export async function createReport(data: CreateReportData, submitterId: string): Promise<ReportRow> {
  return resolveAndCreateReport(data, submitterId)
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
