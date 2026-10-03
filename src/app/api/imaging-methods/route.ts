import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { getStoredImagingMethods, imagingMethodQuerySchema, toImagingMethodResponse } from "@/models/imaging-method"
import { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { q } = imagingMethodQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams))
    const methods = await getStoredImagingMethods(q)
    return createSuccessResponse({ imagingMethods: methods.map(toImagingMethodResponse) })
  } catch (error) {
    return createErrorResponse(error, "Failed to fetch imaging methods")
  }
}
