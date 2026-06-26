import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import type { Clonality } from "@/lib/generated/prisma/client"
import { type AntibodyRegistryResult, searchAntibodyRegistry } from "@/lib/integrations/antibody-registry"
import { prisma } from "@/lib/prisma"
import {
  getAllAntibodies,
  getAntibodiesForProtein,
  getAntibodyById,
  searchParamsSchema,
  toAntibodyResponse,
} from "@/models/antibody"
import { getProteinById } from "@/models/protein"
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

// SciCrunch antibody records carry no UniProt, so we never create a Protein from the registry. The
// target protein is linked only when the caller already knows it (the ?proteinId= branch, where we
// searched the registry by that protein's own gene name); otherwise it stays unlinked, keeping just
// the target name for the user to resolve later.
async function upsertRegistryResults(registryResults: AntibodyRegistryResult[], targetProteinId: string | null = null) {
  const upsertedIds: string[] = []

  for (const r of registryResults) {
    if (!r.citation) continue

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
        citationCount: r.citationCount,
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

      // SciCrunch has no UniProt-keyed search, so look up the protein's own gene name/label and
      // search the registry by target name. Results link back to this known protein.
      const protein = await getProteinById(validated.proteinId)
      const term = protein?.geneSymbol || protein?.label
      if (term) {
        const registryResults = await searchAntibodyRegistry(term, validated.limit)
        if (registryResults.length > 0) {
          const results = await upsertRegistryResults(registryResults, validated.proteinId)
          return createSuccessResponse({ antibodies: results, source: "antibody_registry" })
        }
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
