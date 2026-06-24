import "server-only"

import type { Prisma } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"

const tissueSelect = {
  id: true,
  label: true,
  partOfIds: true,
} satisfies Prisma.TissueSelect

export type TissueRow = Prisma.TissueGetPayload<{ select: typeof tissueSelect }>

export async function getAllTissues(): Promise<TissueRow[]> {
  return prisma.tissue.findMany({ select: tissueSelect, orderBy: { label: "asc" } })
}

export async function searchTissues(query: string): Promise<TissueRow[]> {
  return prisma.tissue.findMany({
    select: tissueSelect,
    where: { label: { contains: query, mode: "insensitive" } },
    orderBy: { label: "asc" },
  })
}

export async function getTissueById(id: string): Promise<TissueRow | null> {
  return prisma.tissue.findUnique({ where: { id }, select: tissueSelect })
}

export async function tissueExists(id: string): Promise<boolean> {
  const found = await prisma.tissue.findUnique({ where: { id }, select: { id: true } })
  return found !== null
}
