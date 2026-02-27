import "server-only"

import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

export type StructureQueryParams = {
  q?: string
  limit?: number
  cursor?: string
}

const structureSelect = {
  id: true,
  label: true,
  partOfIds: true,
} satisfies Prisma.AnatomicalStructureSelect

export type StructureRow = Prisma.AnatomicalStructureGetPayload<{ select: typeof structureSelect }>

const cellTypeSelect = {
  id: true,
  label: true,
  parentIds: true,
} satisfies Prisma.CellTypeSelect

export type StructureCellTypeRow = Prisma.CellTypeGetPayload<{ select: typeof cellTypeSelect }>

export async function getAllStructures(params: StructureQueryParams): Promise<StructureRow[]> {
  const { limit = 20, cursor, q } = params

  return prisma.anatomicalStructure.findMany({
    select: structureSelect,
    where: q ? { label: { contains: q } } : undefined,
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { id: "asc" },
  })
}

export async function getStructureById(id: string): Promise<StructureRow | null> {
  return prisma.anatomicalStructure.findUnique({
    where: { id },
    select: structureSelect,
  })
}

export async function getCellTypesForStructure(structureId: string): Promise<StructureCellTypeRow[]> {
  const relations = await prisma.cellTypeStructure.findMany({
    where: { structureId },
    select: {
      cellType: { select: cellTypeSelect },
    },
  })

  return relations.map((r) => r.cellType)
}
