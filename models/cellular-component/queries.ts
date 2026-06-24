import "server-only"

import type { Prisma } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"

const cellularComponentSelect = {
  id: true,
  label: true,
  partOfIds: true,
} satisfies Prisma.CellularComponentSelect

export type CellularComponentRow = Prisma.CellularComponentGetPayload<{ select: typeof cellularComponentSelect }>

export async function getAllCellularComponents(): Promise<CellularComponentRow[]> {
  return prisma.cellularComponent.findMany({ select: cellularComponentSelect, orderBy: { label: "asc" } })
}

export async function searchCellularComponents(query: string): Promise<CellularComponentRow[]> {
  return prisma.cellularComponent.findMany({
    select: cellularComponentSelect,
    where: { label: { contains: query, mode: "insensitive" } },
    orderBy: { label: "asc" },
  })
}

export async function getCellularComponentById(id: string): Promise<CellularComponentRow | null> {
  return prisma.cellularComponent.findUnique({ where: { id }, select: cellularComponentSelect })
}

export async function cellularComponentExists(id: string): Promise<boolean> {
  const found = await prisma.cellularComponent.findUnique({ where: { id }, select: { id: true } })
  return found !== null
}
