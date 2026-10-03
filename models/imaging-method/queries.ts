import "server-only"

import type { Prisma } from "@/lib/generated/prisma/client"
import { searchEfoImagingMethods, type OntologyResult } from "@/lib/ontology"
import { prisma } from "@/lib/prisma"

export const imagingMethodSelect = {
  id: true,
  label: true,
  parent: { select: { id: true, label: true } },
} satisfies Prisma.ImagingMethodSelect

export type ImagingMethodRow = Prisma.ImagingMethodGetPayload<{ select: typeof imagingMethodSelect }>

// Local methods (rows filed under an EFO term) first, then the EFO spatial proteomics branch.
export async function searchImagingMethods(query: string): Promise<OntologyResult[]> {
  const [local, efo] = await Promise.all([
    prisma.imagingMethod.findMany({
      where: { parentId: { not: null }, label: { contains: query, mode: "insensitive" } },
      select: imagingMethodSelect,
      orderBy: { label: "asc" },
      take: 10,
    }),
    searchEfoImagingMethods(query),
  ])
  return [
    ...local.map((method) => ({
      id: method.id,
      label: method.label,
      description: method.parent ? `${method.parent.label} (${method.parent.id})` : undefined,
      ontology: "Local",
    })),
    ...efo,
  ]
}

export async function getStoredImagingMethods(query?: string): Promise<ImagingMethodRow[]> {
  return prisma.imagingMethod.findMany({
    where: query ? { label: { contains: query, mode: "insensitive" } } : undefined,
    select: imagingMethodSelect,
    orderBy: { label: "asc" },
  })
}
