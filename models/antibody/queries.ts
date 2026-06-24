import "server-only"

import type { Clonality, Prisma } from "@/lib/generated/prisma/client"
import { lookupAntibodyByRrid } from "@/lib/integrations/antibody-registry"
import { prisma } from "@/lib/prisma"
import { resolveTaxonByName } from "@/models/taxon"

export type AntibodyQueryParams = {
  q?: string
  species?: string
  limit?: number
  cursor?: string
}

const antibodySelect = {
  id: true,
  rrid: true,
  name: true,
  catalogNumber: true,
  cloneId: true,
  clonality: true,
  hostTaxon: { select: { id: true, label: true } },
  targetSpecies: true,
  targetProteinId: true,
  targetName: true,
  applications: true,
  conjugate: true,
  vendorName: true,
  vendorUrl: true,
  citationCount: true,
  targetProtein: {
    select: {
      id: true,
      label: true,
      geneSymbol: true,
    },
  },
} satisfies Prisma.AntibodySelect

export type AntibodyRow = Prisma.AntibodyGetPayload<{ select: typeof antibodySelect }>

function buildAntibodyWhere(params: AntibodyQueryParams): Prisma.AntibodyWhereInput {
  const conditions: Prisma.AntibodyWhereInput[] = []

  if (params.q) {
    conditions.push({
      OR: [
        { name: { contains: params.q } },
        { rrid: { contains: params.q } },
        { targetName: { contains: params.q } },
        { cloneId: { contains: params.q } },
      ],
    })
  }

  if (params.species) {
    conditions.push({ targetSpecies: { contains: params.species } })
  }

  return conditions.length > 0 ? { AND: conditions } : {}
}

export async function getAllAntibodies(params: AntibodyQueryParams): Promise<AntibodyRow[]> {
  const { limit = 20, cursor } = params

  return prisma.antibody.findMany({
    select: antibodySelect,
    where: buildAntibodyWhere(params),
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { id: "asc" },
  })
}

export async function getAntibodyById(id: string): Promise<AntibodyRow | null> {
  return prisma.antibody.findUnique({
    where: { id },
    select: antibodySelect,
  })
}

export async function searchAntibodies(query: string): Promise<AntibodyRow[]> {
  return prisma.antibody.findMany({
    select: antibodySelect,
    where: {
      OR: [
        { name: { contains: query } },
        { rrid: { contains: query } },
        { targetName: { contains: query } },
        { cloneId: { contains: query } },
      ],
    },
    take: 20,
    orderBy: { name: "asc" },
  })
}

export async function getAntibodiesForProtein(proteinId: string): Promise<AntibodyRow[]> {
  return prisma.antibody.findMany({
    select: antibodySelect,
    where: { targetProteinId: proteinId },
    orderBy: { citationCount: "desc" },
  })
}

export async function lookupByRrid(rrid: string): Promise<AntibodyRow | null> {
  return prisma.antibody.findUnique({
    where: { rrid },
    select: antibodySelect,
  })
}

const CLONALITY_MAP: Record<string, Clonality> = {
  monoclonal: "MONOCLONAL",
  polyclonal: "POLYCLONAL",
  recombinant: "RECOMBINANT",
  oligoclonal: "OLIGOCLONAL",
}

function cleanValue(value: string | undefined | null): string | null {
  const trimmed = value?.trim()
  return trimmed && trimmed.toLowerCase() !== "unknown" ? trimmed : null
}

export async function resolveAntibodyByRrid(rrid: string): Promise<AntibodyRow | null> {
  const existing = await lookupByRrid(rrid)
  if (existing) return existing

  const registry = await lookupAntibodyByRrid(rrid)
  if (!registry) return null

  const clonality = CLONALITY_MAP[registry.clonality.toLowerCase()] ?? null
  const hostTaxonId = await resolveTaxonByName(registry.sourceOrganism)

  try {
    return await prisma.antibody.create({
      data: {
        rrid,
        name: cleanValue(registry.name) ?? "Unknown",
        catalogNumber: cleanValue(registry.catalogNumber),
        cloneId: cleanValue(registry.cloneId),
        clonality,
        hostTaxonId,
        targetSpecies: JSON.stringify(registry.targetSpecies ?? []),
        targetName: cleanValue(registry.target),
        applications: JSON.stringify(registry.applications ?? []),
        conjugate: cleanValue(registry.conjugate),
        vendorName: cleanValue(registry.vendor),
        vendorUrl: cleanValue(registry.url),
      },
      select: antibodySelect,
    })
  } catch {
    return lookupByRrid(rrid)
  }
}
