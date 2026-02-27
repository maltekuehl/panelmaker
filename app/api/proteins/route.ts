import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { searchProteinsByGene } from "@/lib/integrations/uniprot"
import type { ProteinResponse } from "@/models/protein"
import { getAllProteins, searchParamsSchema, toProteinResponse } from "@/models/protein"
import { NextRequest } from "next/server"
import { z } from "zod"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const validated = searchParamsSchema.parse(Object.fromEntries(searchParams))

    if (validated.organismId && validated.q) {
      const uniprotResults = await searchProteinsByGene(validated.q, validated.organismId)
      if (uniprotResults.length > 0) {
        const externalProteins: ProteinResponse[] = uniprotResults.map((r) => ({
          id: r.id,
          label: r.name || r.geneName,
          geneSymbol: r.geneName || null,
          ensemblGeneId: r.ensemblGeneId ?? null,
        }))
        return createSuccessResponse({ proteins: externalProteins, nextCursor: undefined, source: "uniprot" })
      }
    }

    const proteins = await getAllProteins({ q: validated.q, limit: validated.limit, cursor: validated.cursor })
    const data = proteins.map(toProteinResponse)

    if (data.length === 0 && validated.q) {
      const uniprotResults = await searchProteinsByGene(validated.q, validated.organismId)
      const externalProteins: ProteinResponse[] = uniprotResults.map((r) => ({
        id: r.id,
        label: r.name || r.geneName,
        geneSymbol: r.geneName || null,
        ensemblGeneId: r.ensemblGeneId ?? null,
      }))

      return createSuccessResponse({ proteins: externalProteins, nextCursor: undefined, source: "uniprot" })
    }

    const nextCursor = data.length === validated.limit ? data[data.length - 1]?.id : undefined

    return createSuccessResponse({ proteins: data, nextCursor })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error, "Validation error")
    }
    return createErrorResponse(error, "Failed to fetch proteins")
  }
}
