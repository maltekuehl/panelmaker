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
          OR: [{ label: { contains: q, mode: "insensitive" } }, { geneSymbol: { contains: q, mode: "insensitive" } }],
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
      OR: [
        { label: { contains: query, mode: "insensitive" } },
        { geneSymbol: { contains: query, mode: "insensitive" } },
      ],
    },
    take: 20,
    orderBy: { label: "asc" },
  })
}

export type ProteinSeed = {
  id: string
  label?: string | null
  geneSymbol?: string | null
  ensemblGeneId?: string | null
}

export async function ensureProtein(seed: ProteinSeed, db: Prisma.TransactionClient = prisma): Promise<string> {
  const protein = await db.protein.upsert({
    where: { id: seed.id },
    update: seed.ensemblGeneId ? { ensemblGeneId: seed.ensemblGeneId } : {},
    create: {
      id: seed.id,
      label: seed.label ?? seed.id,
      geneSymbol: seed.geneSymbol ?? null,
      ensemblGeneId: seed.ensemblGeneId ?? null,
    },
    select: { id: true },
  })
  return protein.id
}
