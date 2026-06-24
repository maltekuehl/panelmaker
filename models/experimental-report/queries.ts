import "server-only"

import type { Clonality, Prisma, SourceOrganism, ValidationStatus } from "@/lib/generated/prisma/client"
import { lookupAntibodyByRrid, searchAntibodyRegistry } from "@/lib/integrations/antibody-registry"
import { searchCellOntology, searchDiseaseOntology, searchGoCellularComponent } from "@/lib/ontology"
import { prisma } from "@/lib/prisma"
import type { CreateReportBatchData, CreateReportData } from "./schema"

export type ReportQueryParams = {
  q?: string
  method?: string
  fixation?: string
  species?: string
  limit?: number
  cursor?: string
}

const reportSelect = {
  id: true,
  antibodyId: true,
  cellTypeId: true,
  structureId: true,
  species: true,
  tissueType: true,
  fixation: true,
  method: true,
  fluorophore: true,
  metalTag: true,
  cycleNumber: true,
  dilution: true,
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
      sourceOrganism: true,
      conjugate: true,
      targetProteinId: true,
    },
  },
  cellType: {
    select: {
      id: true,
      label: true,
    },
  },
  structure: {
    select: {
      id: true,
      label: true,
    },
  },
  condition: {
    select: {
      id: true,
      label: true,
    },
  },
  submitter: {
    select: {
      id: true,
      name: true,
      institution: true,
    },
  },
} satisfies Prisma.ExperimentalReportSelect

export type ReportRow = Prisma.ExperimentalReportGetPayload<{ select: typeof reportSelect }>

function buildReportWhere(params: ReportQueryParams): Prisma.ExperimentalReportWhereInput {
  const conditions: Prisma.ExperimentalReportWhereInput[] = [{ isPublic: true, status: "PUBLISHED" }]

  if (params.q) {
    conditions.push({
      OR: [
        { antibody: { name: { contains: params.q } } },
        { antibody: { targetName: { contains: params.q } } },
        { cellType: { label: { contains: params.q } } },
        { tissueType: { contains: params.q } },
        { notes: { contains: params.q } },
      ],
    })
  }

  if (params.method) {
    conditions.push({ method: params.method as Prisma.EnumMultiplexMethodNullableFilter["equals"] })
  }

  if (params.fixation) {
    conditions.push({ fixation: params.fixation as Prisma.EnumFixationNullableFilter["equals"] })
  }

  if (params.species) {
    conditions.push({ species: params.species as Prisma.EnumSpeciesNullableFilter["equals"] })
  }

  return { AND: conditions }
}

export async function getAllReports(params: ReportQueryParams): Promise<ReportRow[]> {
  const { limit = 20, cursor } = params

  return prisma.experimentalReport.findMany({
    select: reportSelect,
    where: buildReportWhere(params),
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
  })
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
    where: { cellTypeId, isPublic: true, status: "PUBLISHED" },
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

export async function getCellTypesFromReports(proteinId: string): Promise<{ id: string; label: string }[]> {
  const reports = await prisma.experimentalReport.findMany({
    where: {
      antibody: { targetProteinId: proteinId },
      isPublic: true,
      status: "PUBLISHED",
      cellTypeId: { not: null },
    },
    select: {
      cellType: { select: { id: true, label: true } },
    },
    distinct: ["cellTypeId"],
  })

  return reports.filter((r) => r.cellType !== null).map((r) => r.cellType!)
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

const SOURCE_ORGANISM_MAP: Record<string, SourceOrganism> = {
  "mouse": "MOUSE",
  "rabbit": "RABBIT",
  "goat": "GOAT",
  "rat": "RAT",
  "donkey": "DONKEY",
  "chicken": "CHICKEN",
  "sheep": "SHEEP",
  "hamster": "HAMSTER",
  "guinea pig": "GUINEA_PIG",
  "camelid": "CAMELID",
}

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

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
  const sourceOrganism = SOURCE_ORGANISM_MAP[(ab.sourceOrganism || data.hostSpecies || "").toLowerCase()] ?? null

  return (
    await tx.antibody.create({
      data: {
        rrid: rrid || null,
        name: ab.name || data.markerName || "Unknown",
        catalogNumber: ab.catalogNumber || data.catalogNumber || null,
        cloneId: ab.cloneId || data.cloneId || null,
        clonality,
        sourceOrganism,
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

async function validateAndResolveCellType(cellType: {
  id: string
  label: string
}): Promise<{ id: string; label: string }> {
  const existing = await prisma.cellType.findUnique({ where: { id: cellType.id } })
  if (existing) return existing

  const ontologyResults = await searchCellOntology(cellType.label)
  const match = ontologyResults.find((r) => r.id === cellType.id)
  if (!match) {
    throw new Error(`Cell type ${cellType.id} (${cellType.label}) not found in Cell Ontology`)
  }
  return { id: match.id, label: match.label }
}

async function validateAndResolveStructure(structure: {
  id: string
  label: string
}): Promise<{ id: string; label: string }> {
  const existing = await prisma.anatomicalStructure.findUnique({ where: { id: structure.id } })
  if (existing) return existing

  const ontologyResults = await searchGoCellularComponent(structure.label)
  const match = ontologyResults.find((r) => r.id === structure.id)
  if (!match) {
    throw new Error(`Subcellular location ${structure.id} (${structure.label}) not found in GO Cellular Component`)
  }
  return { id: match.id, label: match.label }
}

async function validateAndResolveCondition(condition: {
  id: string
  label: string
}): Promise<{ id: string; label: string }> {
  const existing = await prisma.diseaseCondition.findUnique({ where: { id: condition.id } })
  if (existing) return existing

  const ontologyResults = await searchDiseaseOntology(condition.label)
  const match = ontologyResults.find((r) => r.id === condition.id)
  if (!match) {
    throw new Error(`Disease condition ${condition.id} (${condition.label}) not found in Disease Ontology`)
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
  let resolvedCellType: { id: string; label: string } | undefined
  if (!data.cellTypeId && data.cellTypes && data.cellTypes.length > 0) {
    resolvedCellType = await validateAndResolveCellType(data.cellTypes[0])
  }

  let resolvedStructure: { id: string; label: string } | undefined
  if (!data.structureId && data.subcellularLocation) {
    resolvedStructure = await validateAndResolveStructure(data.subcellularLocation)
  }

  let resolvedCondition: { id: string; label: string } | undefined
  if (data.condition) {
    resolvedCondition = await validateAndResolveCondition(data.condition)
  }

  await validateAntibody(data)

  return prisma.$transaction(async (tx) => {
    const proteinId = await resolveProtein(tx, data)
    const antibodyId = await resolveAntibody(tx, data, proteinId)

    let cellTypeId = data.cellTypeId
    if (!cellTypeId && resolvedCellType) {
      const existing = await tx.cellType.findUnique({ where: { id: resolvedCellType.id } })
      if (!existing) {
        await tx.cellType.create({ data: resolvedCellType })
      }
      cellTypeId = resolvedCellType.id
    }

    let structureId = data.structureId
    if (!structureId && resolvedStructure) {
      const existing = await tx.anatomicalStructure.findUnique({ where: { id: resolvedStructure.id } })
      if (!existing) {
        await tx.anatomicalStructure.create({ data: resolvedStructure })
      }
      structureId = resolvedStructure.id
    }

    let conditionId: string | undefined
    if (resolvedCondition) {
      const existing = await tx.diseaseCondition.findUnique({ where: { id: resolvedCondition.id } })
      if (!existing) {
        await tx.diseaseCondition.create({ data: resolvedCondition })
      }
      conditionId = resolvedCondition.id
    }

    const {
      antibodyData: _ab,
      proteinData: _pd,
      cellTypes: _cts,
      subcellularLocation: _sl,
      condition: _cond,
      markerName: _mn,
      rrid: _rrid,
      hostSpecies: _hs,
      antibodyVendor: _av,
      catalogNumber: _cn,
      cloneId: _ci,
      ...reportFields
    } = data

    return tx.experimentalReport.create({
      data: {
        ...reportFields,
        antibodyId: antibodyId ?? reportFields.antibodyId,
        cellTypeId,
        structureId,
        conditionId,
        submitterId,
        imageUrls: JSON.stringify(data.imageUrls ?? []),
      },
      select: reportSelect,
    })
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
      species: context.species,
      tissueType: context.tissueType,
      fixation: context.fixation,
      method: context.method,
      antigenRetrieval: context.antigenRetrieval,
      condition: context.condition ?? null,
      markerName: item.markerName,
      rrid: item.rrid,
      antibodyVendor: item.antibodyVendor,
      catalogNumber: item.catalogNumber,
      cloneId: item.cloneId,
      hostSpecies: item.hostSpecies,
      cellTypes: item.cellTypes,
      dilution: item.dilution,
      fluorophore: item.fluorophore,
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
  const {
    antibodyData: _ab,
    proteinData: _pd,
    cellTypes: _cts,
    subcellularLocation: _sl,
    condition: _cond,
    markerName: _mn,
    rrid: _rrid,
    hostSpecies: _hs,
    antibodyVendor: _av,
    catalogNumber: _cn,
    cloneId: _ci,
    ...reportFields
  } = data

  return prisma.experimentalReport.create({
    data: {
      ...reportFields,
      submitterId,
      imageUrls: JSON.stringify(data.imageUrls ?? []),
    },
    select: reportSelect,
  })
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
