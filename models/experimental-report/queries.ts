import "server-only"

import { prisma } from "@/lib/prisma"
import type { Prisma, ValidationStatus } from "@prisma/client"
import type { CreateReportData } from "./schema"

export type ReportQueryParams = {
  q?: string
  method?: string
  fixation?: string
  species?: string
  limit?: number
  cursor?: number
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
  const conditions: Prisma.ExperimentalReportWhereInput[] = [{ isPublic: true, status: "VALIDATED" }]

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

export async function getReportById(id: number): Promise<ReportRow | null> {
  return prisma.experimentalReport.findUnique({
    where: { id },
    select: reportSelect,
  })
}

export async function getReportsForAntibody(antibodyId: number): Promise<ReportRow[]> {
  return prisma.experimentalReport.findMany({
    select: reportSelect,
    where: { antibodyId, isPublic: true, status: "VALIDATED" },
    orderBy: { createdAt: "desc" },
  })
}

export async function getReportsForCellType(cellTypeId: string): Promise<ReportRow[]> {
  return prisma.experimentalReport.findMany({
    select: reportSelect,
    where: { cellTypeId, isPublic: true, status: "VALIDATED" },
    orderBy: { createdAt: "desc" },
  })
}

export async function getCellTypesFromReports(proteinId: string): Promise<{ id: string; label: string }[]> {
  const reports = await prisma.experimentalReport.findMany({
    where: {
      antibody: { targetProteinId: proteinId },
      isPublic: true,
      status: "VALIDATED",
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
      status: "VALIDATED",
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function createReport(data: CreateReportData, submitterId: string): Promise<ReportRow> {
  return prisma.experimentalReport.create({
    data: {
      ...data,
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

export async function updateReportStatus(id: number, status: ValidationStatus): Promise<ReportRow> {
  return prisma.experimentalReport.update({
    where: { id },
    data: { status },
    select: reportSelect,
  })
}
