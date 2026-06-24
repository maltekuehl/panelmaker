import "server-only"

import type { Prisma } from "@/lib/generated/prisma/client"
import { searchSpecies } from "@/lib/ontology"
import { prisma } from "@/lib/prisma"

const taxonSelect = {
  id: true,
  label: true,
} satisfies Prisma.TaxonSelect

export type TaxonRow = Prisma.TaxonGetPayload<{ select: typeof taxonSelect }>

export async function getAllTaxa(): Promise<TaxonRow[]> {
  return prisma.taxon.findMany({ select: taxonSelect, orderBy: { label: "asc" } })
}

export async function searchTaxa(query: string): Promise<TaxonRow[]> {
  return prisma.taxon.findMany({
    select: taxonSelect,
    where: { label: { contains: query, mode: "insensitive" } },
    orderBy: { label: "asc" },
  })
}

export async function getTaxonById(id: string): Promise<TaxonRow | null> {
  return prisma.taxon.findUnique({ where: { id }, select: taxonSelect })
}

export async function taxonExists(id: string): Promise<boolean> {
  const found = await prisma.taxon.findUnique({ where: { id }, select: { id: true } })
  return found !== null
}

/**
 * Resolve a free-text organism name (e.g. a registry host species like "Mouse") to a Taxon id.
 * Reads the Taxon table first; falls back to the NCBI taxonomy lookup and upserts the row so every
 * referenced species ends up in the database. Returns null if it cannot be resolved.
 */
export async function resolveTaxonByName(name: string | null | undefined): Promise<string | null> {
  const trimmed = name?.trim()
  if (!trimmed || trimmed.toLowerCase() === "unknown") return null

  const existing = await prisma.taxon.findFirst({
    where: { label: { equals: trimmed, mode: "insensitive" } },
    select: { id: true },
  })
  if (existing) return existing.id

  const results = await searchSpecies(trimmed)
  const match = results[0]
  if (!match) return null

  await prisma.taxon.upsert({ where: { id: match.id }, update: {}, create: { id: match.id, label: match.label } })
  return match.id
}
