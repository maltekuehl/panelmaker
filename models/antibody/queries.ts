import "server-only"

import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

export type AntibodyQueryParams = {
  q?: string
  species?: string
  limit?: number
  cursor?: number
}

const antibodySelect = {
  id: true,
  rrid: true,
  name: true,
  catalogNumber: true,
  cloneId: true,
  clonality: true,
  sourceOrganism: true,
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

export async function getAntibodyById(id: number): Promise<AntibodyRow | null> {
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
