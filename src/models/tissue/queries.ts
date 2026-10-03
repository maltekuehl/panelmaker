import "server-only"

import type { Prisma } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"

const tissueSelect = {
  id: true,
  label: true,
  partOfIds: true,
} satisfies Prisma.TissueSelect

export type TissueRow = Prisma.TissueGetPayload<{ select: typeof tissueSelect }>

export async function searchTissues(query: string): Promise<TissueRow[]> {
  return prisma.tissue.findMany({
    select: tissueSelect,
    where: { label: { contains: query, mode: "insensitive" } },
    orderBy: { label: "asc" },
  })
}
