import "server-only"

import type { Prisma } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"

const fluorophoreSelect = {
  id: true,
  name: true,
  excitation: true,
  emission: true,
  fpbaseId: true,
  chebiId: true,
  aliases: true,
} satisfies Prisma.FluorophoreSelect

export type FluorophoreRow = Prisma.FluorophoreGetPayload<{ select: typeof fluorophoreSelect }>

export async function getAllFluorophores(): Promise<FluorophoreRow[]> {
  return prisma.fluorophore.findMany({ select: fluorophoreSelect, orderBy: { emission: "asc" } })
}

export async function searchFluorophores(query: string): Promise<FluorophoreRow[]> {
  return prisma.fluorophore.findMany({
    select: fluorophoreSelect,
    where: {
      OR: [{ name: { contains: query, mode: "insensitive" } }, { aliases: { has: query } }],
    },
    orderBy: { emission: "asc" },
  })
}

export async function getFluorophoreById(id: string): Promise<FluorophoreRow | null> {
  return prisma.fluorophore.findUnique({ where: { id }, select: fluorophoreSelect })
}

export async function fluorophoreExists(id: string): Promise<boolean> {
  const found = await prisma.fluorophore.findUnique({ where: { id }, select: { id: true } })
  return found !== null
}
