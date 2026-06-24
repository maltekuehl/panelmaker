import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import type { Clonality } from "@/lib/generated/prisma/client"
import {
  type AntibodyRegistryResult,
  searchAntibodyRegistry,
  searchAntibodyRegistryByTarget,
} from "@/lib/integrations/antibody-registry"
import { prisma } from "@/lib/prisma"
import {
  getAllAntibodies,
  getAntibodiesForProtein,
  getAntibodyById,
  searchParamsSchema,
  toAntibodyResponse,
} from "@/models/antibody"
import { resolveTaxonByName } from "@/models/taxon"
import { NextRequest } from "next/server"
import { z } from "zod"

const CLONALITY_MAP: Record<string, Clonality> = {
  monoclonal: "MONOCLONAL",
  polyclonal: "POLYCLONAL",
  recombinant: "RECOMBINANT",
  oligoclonal: "OLIGOCLONAL",
}

function mapClonality(raw: string): Clonality | null {
  return CLONALITY_MAP[raw.toLowerCase()] ?? null
}

async function upsertRegistryResults(registryResults: AntibodyRegistryResult[]) {
  const upsertedIds: string[] = []

  for (const r of registryResults) {
    if (!r.citation) continue

    let targetProteinId: string | null = null
    if (r.uniprotId) {
      await prisma.protein.upsert({
        where: { id: r.uniprotId },
        update: {},
        create: { id: r.uniprotId, label: r.target || r.uniprotId, geneSymbol: null },
      })
      targetProteinId = r.uniprotId
    }

    const hostTaxonId = r.sourceOrganism ? await resolveTaxonByName(r.sourceOrganism) : null

    const upserted = await prisma.antibody.upsert({
      where: { rrid: r.citation },
      update: {},
      create: {
        rrid: r.citation,
        name: r.name,
        catalogNumber: r.catalogNumber || null,
        cloneId: r.cloneId || null,
        clonality: mapClonality(r.clonality),
        hostTaxonId,
        targetSpecies: JSON.stringify(r.targetSpecies),
        targetName: r.target || null,
        targetProteinId,
        applications: JSON.stringify(r.applications),
        conjugate: r.conjugate || null,
        vendorName: r.vendor !== "Unknown" ? r.vendor : null,
        vendorUrl: r.url || null,
      },
      select: { id: true },
    })
    upsertedIds.push(upserted.id)
  }

  const freshAntibodies = await Promise.all(upsertedIds.map((id) => getAntibodyById(id)))
  return freshAntibodies.filter((a) => a !== null).map(toAntibodyResponse)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const validated = searchParamsSchema.parse(Object.fromEntries(searchParams))

    if (validated.proteinId) {
      const local = await getAntibodiesForProtein(validated.proteinId)
      if (local.length > 0) {
        return createSuccessResponse({ antibodies: local.map(toAntibodyResponse) })
      }

      const registryResults = await searchAntibodyRegistryByTarget(validated.proteinId, validated.limit)
      if (registryResults.length > 0) {
        const results = await upsertRegistryResults(registryResults)
        return createSuccessResponse({ antibodies: results, source: "antibody_registry" })
      }

      return createSuccessResponse({ antibodies: [] })
    }

    const antibodies = await getAllAntibodies(validated)
    const data = antibodies.map(toAntibodyResponse)

    if (data.length > 0) {
      const nextCursor = data.length === validated.limit ? data[data.length - 1]?.id : undefined
      return createSuccessResponse({ antibodies: data, nextCursor })
    }

    if (!validated.q) {
      return createSuccessResponse({ antibodies: [], nextCursor: undefined })
    }

    const registryResults = await searchAntibodyRegistry(validated.q, validated.limit)
    if (registryResults.length === 0) {
      return createSuccessResponse({ antibodies: [], nextCursor: undefined, source: "antibody_registry" })
    }

    const results = await upsertRegistryResults(registryResults)
    return createSuccessResponse({ antibodies: results, nextCursor: undefined, source: "antibody_registry" })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error, "Validation error")
    }
    return createErrorResponse(error, "Failed to fetch antibodies")
  }
}
