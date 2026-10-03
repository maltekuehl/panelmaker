import { createAuthHandler } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { searchAntibodyRegistry } from "@/lib/integrations/antibody-registry"
import { NextRequest } from "next/server"
import { z } from "zod"

const querySchema = z.object({
  q: z.string().trim().max(200).default(""),
  limit: z.coerce.number().int().min(1).max(25).default(10),
})

// GET /api/antibody-registry - Typeahead over the Antibody Registry. Signed in only, so an anonymous
// client cannot fan out unlimited upstream searches on the shared SciCrunch quota.
export const GET = createAuthHandler(async (request: NextRequest) => {
  try {
    const { q, limit } = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams))

    if (q.length < 2) {
      return createSuccessResponse({ results: [] })
    }

    const results = await searchAntibodyRegistry(q, limit)

    return createSuccessResponse({ results })
  } catch (error) {
    return createErrorResponse(error, "Failed to search antibody registry")
  }
})
