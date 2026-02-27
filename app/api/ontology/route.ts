import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import {
  searchCellOntology,
  searchDiseaseOntology,
  searchGoCellularComponent,
  searchSpecies,
  searchUberon,
  type OntologyType,
} from "@/lib/ontology"
import { NextRequest } from "next/server"
import { z } from "zod"

const querySchema = z
  .object({
    type: z.enum(["cl", "uberon", "ncbi_taxonomy", "go_cc", "doid"]),
    q: z.string().min(1).max(200),
  })
  .strict()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const validated = querySchema.parse(Object.fromEntries(searchParams))

    const searchFn: Record<OntologyType, (query: string) => Promise<unknown[]>> = {
      cl: searchCellOntology,
      uberon: searchUberon,
      ncbi_taxonomy: searchSpecies,
      go_cc: searchGoCellularComponent,
      doid: searchDiseaseOntology,
    }

    const results = await searchFn[validated.type](validated.q)

    return createSuccessResponse({ results })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error, "Validation error")
    }
    return createErrorResponse(error, "Failed to search ontology")
  }
}
