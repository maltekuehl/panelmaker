import "server-only"

import { Prisma } from "@/lib/generated/prisma/client"
import { lookupAntibodyByRrid } from "@/lib/integrations/antibody-registry"
import { prisma } from "@/lib/prisma"
import { resolveTaxonByName } from "@/models/taxon"
import { type RegistryAntibodyInput, registryToAntibodyCreate } from "./transforms"

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
        { name: { contains: params.q, mode: "insensitive" } },
        { rrid: { contains: params.q, mode: "insensitive" } },
        { targetName: { contains: params.q, mode: "insensitive" } },
        { cloneId: { contains: params.q, mode: "insensitive" } },
      ],
    })
  }

  if (params.species) {
    conditions.push({ targetSpecies: { has: params.species } })
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
    where: buildAntibodyWhere({ q: query }),
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

export async function resolveAntibodyByRrid(rrid: string): Promise<AntibodyRow | null> {
  const existing = await lookupByRrid(rrid)
  if (existing) return existing

  const registry = await lookupAntibodyByRrid(rrid)
  if (!registry) return null

  const hostTaxonId = await resolveTaxonByName(registry.sourceOrganism)

  try {
    return await prisma.antibody.create({
      data: registryToAntibodyCreate(registry, { rrid, hostTaxonId }),
      select: antibodySelect,
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return lookupByRrid(rrid)
    throw error
  }
}

// Catalogues registry search hits so they are linkable and searchable locally. Existing rows are
// left untouched: the registry is the source of first import, not an authority over later curation.
export async function upsertAntibodiesFromRegistry(
  results: RegistryAntibodyInput[],
  targetProteinId: string | null = null,
): Promise<AntibodyRow[]> {
  const rows: AntibodyRow[] = []

  for (const result of results) {
    if (!result.citation) continue
    const hostTaxonId = result.sourceOrganism ? await resolveTaxonByName(result.sourceOrganism) : null

    rows.push(
      await prisma.antibody.upsert({
        where: { rrid: result.citation },
        update: {},
        create: registryToAntibodyCreate(result, { rrid: result.citation, hostTaxonId, targetProteinId }),
        select: antibodySelect,
      }),
    )
  }

  return rows
}
