import "server-only"

import type { Prisma } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import type { ImagingMethodQuery } from "./schema"

const imagingMethodSelect = {
  id: true,
  label: true,
  shortLabel: true,
  efoId: true,
  detection: true,
  cyclic: true,
  aliases: true,
  sortOrder: true,
} satisfies Prisma.ImagingMethodSelect

export type ImagingMethodRow = Prisma.ImagingMethodGetPayload<{ select: typeof imagingMethodSelect }>

export async function getAllImagingMethods(): Promise<ImagingMethodRow[]> {
  return prisma.imagingMethod.findMany({ select: imagingMethodSelect, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] })
}

export async function imagingMethodExists(id: string): Promise<boolean> {
  const found = await prisma.imagingMethod.findUnique({ where: { id }, select: { id: true } })
  return found !== null
}

// `aliases` is a string[] column, so Prisma can only match a whole element. The table has 21 rows, so
// the search normalizes case and separators in memory: "phenocycler", "PhenoCycler" and "pheno cycler"
// all reach the same row.
const normalizeMethodTerm = (value: string): string => value.toLowerCase().replace(/[\s_-]/g, "")

export async function searchImagingMethods(query: string): Promise<ImagingMethodRow[]> {
  const term = normalizeMethodTerm(query)
  if (!term) return getAllImagingMethods()

  const all = await getAllImagingMethods()
  return all.filter(
    (method) =>
      normalizeMethodTerm(method.label).includes(term) ||
      normalizeMethodTerm(method.id).includes(term) ||
      method.aliases.some((alias) => normalizeMethodTerm(alias).includes(term)),
  )
}

export async function findImagingMethods(params: ImagingMethodQuery): Promise<ImagingMethodRow[]> {
  const rows = params.q ? await searchImagingMethods(params.q) : await getAllImagingMethods()
  return params.detection ? rows.filter((method) => method.detection === params.detection) : rows
}
