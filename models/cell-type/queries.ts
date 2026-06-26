import "server-only"

import type { Prisma } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { cache } from "react"

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
} satisfies Prisma.CellTypeSelect

export type CellTypeWithRelations = Prisma.CellTypeGetPayload<{ select: typeof cellTypeWithMarkersSelect }>

export async function getAllCellTypes(params: CellTypeQueryParams): Promise<CellTypeRow[]> {
  const { limit = 20, cursor, q } = params

  return prisma.cellType.findMany({
    select: cellTypeSelect,
    where: q ? { label: { contains: q, mode: "insensitive" } } : undefined,
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
    where: { label: { contains: query, mode: "insensitive" } },
    take: 20,
    orderBy: { label: "asc" },
  })
}

// `parentIds` is a JSON string of a cell type's DIRECT parents only. To answer "T cell" with CD4/CD8
// reports we need the whole subtree, so we load every cell type once, invert parent->child, and walk.
const loadParentEdges = cache(
  async (): Promise<{ id: string; parentIds: string }[]> =>
    prisma.cellType.findMany({ select: { id: true, parentIds: true } }),
)

function parseParentIds(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : []
  } catch {
    return []
  }
}

// Returns the root id plus every descendant id (transitive children). Memoized per request.
export async function getCellTypeDescendantIds(rootId: string): Promise<string[]> {
  const all = await loadParentEdges()
  const childrenByParent = new Map<string, string[]>()
  for (const cellType of all) {
    for (const parentId of parseParentIds(cellType.parentIds)) {
      const children = childrenByParent.get(parentId)
      if (children) children.push(cellType.id)
      else childrenByParent.set(parentId, [cellType.id])
    }
  }

  const result = new Set<string>([rootId])
  const queue = [rootId]
  while (queue.length > 0) {
    const current = queue.shift() as string
    for (const child of childrenByParent.get(current) ?? []) {
      if (!result.has(child)) {
        result.add(child)
        queue.push(child)
      }
    }
  }
  return [...result]
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
