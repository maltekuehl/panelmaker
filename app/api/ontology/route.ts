import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import {
  searchCellOntology,
  searchChebi,
  searchDiseaseOntology,
  searchGoCellularComponent,
  searchHsapDv,
  searchMmusDv,
  searchRor,
  searchSpecies,
  searchUberon,
  type OntologyType,
} from "@/lib/ontology"
import { searchImagingMethods } from "@/models/imaging-method"
import { NextRequest } from "next/server"
import { z } from "zod"

const querySchema = z.object({
  type: z.enum([
    "cl",
    "uberon",
    "ncbi_taxonomy",
    "go_cc",
    "doid",
    "ror",
    "chebi",
    "hsapdv",
    "mmusdv",
    "imaging_method",
  ]),
  q: z.string().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(50).optional(),
})

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
      ror: searchRor,
      chebi: searchChebi,
      hsapdv: searchHsapDv,
      mmusdv: searchMmusDv,
      imaging_method: searchImagingMethods,
    }

    const found = await searchFn[validated.type](validated.q)
    const results = validated.limit ? found.slice(0, validated.limit) : found

    return createSuccessResponse({ results })
  } catch (error) {
    return createErrorResponse(error, "Failed to search ontology")
  }
}
