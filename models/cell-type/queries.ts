import "server-only"

import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

export type CellTypeQueryParams = {
  q?: string
  limit?: number
  cursor?: string
}

const cellTypeSelect = {
  id: true,
  label: true,
  parentIds: true,
} satisfies Prisma.CellTypeSelect

export type CellTypeRow = Prisma.CellTypeGetPayload<{ select: typeof cellTypeSelect }>

const cellTypeWithMarkersSelect = {
  id: true,
  label: true,
  parentIds: true,
  markers: {
    select: {
      proteinId: true,
      isCanonical: true,
      source: true,
      protein: {
        select: {
          id: true,
          label: true,
          geneSymbol: true,
        },
      },
    },
  },
  structures: {
    select: {
      structureId: true,
      source: true,
    },
  },
} satisfies Prisma.CellTypeSelect

export type CellTypeWithRelations = Prisma.CellTypeGetPayload<{ select: typeof cellTypeWithMarkersSelect }>

export async function getAllCellTypes(params: CellTypeQueryParams): Promise<CellTypeRow[]> {
  const { limit = 20, cursor, q } = params

  return prisma.cellType.findMany({
    select: cellTypeSelect,
    where: q ? { label: { contains: q } } : undefined,
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { id: "asc" },
  })
}

export async function getCellTypeById(id: string): Promise<CellTypeWithRelations | null> {
  return prisma.cellType.findUnique({
    where: { id },
    select: cellTypeWithMarkersSelect,
  })
}

export async function searchCellTypes(query: string): Promise<CellTypeRow[]> {
  return prisma.cellType.findMany({
    select: cellTypeSelect,
    where: { label: { contains: query } },
    take: 20,
    orderBy: { label: "asc" },
  })
}

export async function getCellTypesForProtein(proteinId: string): Promise<CellTypeRow[]> {
  const markers = await prisma.cellTypeMarker.findMany({
    where: { proteinId },
    select: {
      cellType: { select: cellTypeSelect },
    },
    orderBy: { isCanonical: "desc" },
  })

  return markers.map((m) => m.cellType)
}

export async function getCellTypesForStructure(structureId: string): Promise<CellTypeRow[]> {
  const relations = await prisma.cellTypeStructure.findMany({
    where: { structureId },
    select: {
      cellType: { select: cellTypeSelect },
    },
  })

  return relations.map((r) => r.cellType)
}
