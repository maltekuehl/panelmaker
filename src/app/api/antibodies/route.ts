import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { searchAntibodyRegistry } from "@/lib/integrations/antibody-registry"
import {
  getAllAntibodies,
  getAntibodiesForProtein,
  searchParamsSchema,
  toAntibodyResponse,
  upsertAntibodiesFromRegistry,
} from "@/models/antibody"
import { getProteinById } from "@/models/protein"
import { NextRequest } from "next/server"

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
      // search the registry by target name. Only this branch links results back to a protein: a
      // registry record carries no UniProt, so the generic search below leaves the target unlinked.
      const protein = await getProteinById(validated.proteinId)
      const term = protein?.geneSymbol || protein?.label
      if (term) {
        const registryResults = await searchAntibodyRegistry(term, validated.limit)
        if (registryResults.length > 0) {
          const rows = await upsertAntibodiesFromRegistry(registryResults, validated.proteinId)
          return createSuccessResponse({ antibodies: rows.map(toAntibodyResponse), source: "antibody_registry" })
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

    const rows = await upsertAntibodiesFromRegistry(registryResults)
    return createSuccessResponse({
      antibodies: rows.map(toAntibodyResponse),
      nextCursor: undefined,
      source: "antibody_registry",
    })
  } catch (error) {
    return createErrorResponse(error, "Failed to fetch antibodies")
  }
}
