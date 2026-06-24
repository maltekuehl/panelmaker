import "server-only"

import type { Prisma } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"

export type ProteinQueryParams = {
  q?: string
  limit?: number
  cursor?: string
  organismId?: number
}

const proteinSelect = {
  id: true,
  label: true,
  geneSymbol: true,
  ensemblGeneId: true,
} satisfies Prisma.ProteinSelect

export type ProteinRow = Prisma.ProteinGetPayload<{ select: typeof proteinSelect }>

export async function getAllProteins(params: ProteinQueryParams): Promise<ProteinRow[]> {
  const { limit = 20, cursor, q } = params

  return prisma.protein.findMany({
    select: proteinSelect,
    where: q
      ? {
          OR: [{ label: { contains: q } }, { geneSymbol: { contains: q } }],
        }
      : undefined,
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { id: "asc" },
  })
}

export async function getProteinById(id: string): Promise<ProteinRow | null> {
  return prisma.protein.findUnique({
    where: { id },
    select: proteinSelect,
  })
}

export async function searchProteins(query: string): Promise<ProteinRow[]> {
  return prisma.protein.findMany({
    select: proteinSelect,
    where: {
      OR: [{ label: { contains: query } }, { geneSymbol: { contains: query } }],
    },
    take: 20,
    orderBy: { label: "asc" },
  })
}

export async function getProteinsForCellType(cellTypeId: string): Promise<ProteinRow[]> {
  const markers = await prisma.cellTypeMarker.findMany({
    where: { cellTypeId },
    select: {
      protein: { select: proteinSelect },
    },
    orderBy: { isCanonical: "desc" },
  })

  return markers.map((m) => m.protein)
}
