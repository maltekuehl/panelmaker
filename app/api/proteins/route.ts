import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { searchProteinsByGene, type UniProtResult } from "@/lib/integrations/uniprot"
import type { ProteinResponse } from "@/models/protein"
import { getAllProteins, searchParamsSchema, toProteinResponse } from "@/models/protein"
import { NextRequest } from "next/server"

function fromUniProt(result: UniProtResult): ProteinResponse {
  return {
    id: result.id,
    label: result.name || result.geneName,
    geneSymbol: result.geneName || null,
    ensemblGeneId: result.ensemblGeneId ?? null,
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const validated = searchParamsSchema.parse(Object.fromEntries(searchParams))

    // Species-scoped searches must go to UniProt: local Protein rows carry no organism.
    const uniprotResults =
      validated.organismId && validated.q ? await searchProteinsByGene(validated.q, validated.organismId) : null

    if (uniprotResults && uniprotResults.length > 0) {
      return createSuccessResponse({
        proteins: uniprotResults.map(fromUniProt),
        nextCursor: undefined,
        source: "uniprot",
      })
    }

    const proteins = await getAllProteins({ q: validated.q, limit: validated.limit, cursor: validated.cursor })
    const data = proteins.map(toProteinResponse)

    if (data.length === 0 && validated.q) {
      const fallback = uniprotResults ?? (await searchProteinsByGene(validated.q, validated.organismId))
      return createSuccessResponse({ proteins: fallback.map(fromUniProt), nextCursor: undefined, source: "uniprot" })
    }

    const nextCursor = data.length === validated.limit ? data[data.length - 1]?.id : undefined

    return createSuccessResponse({ proteins: data, nextCursor })
  } catch (error) {
    return createErrorResponse(error, "Failed to fetch proteins")
  }
}
