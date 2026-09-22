import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { findImagingMethods, imagingMethodQuerySchema, toImagingMethodResponse } from "@/models/imaging-method"
import { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const validated = imagingMethodQuerySchema.parse(Object.fromEntries(searchParams))

    const methods = await findImagingMethods(validated)

    return createSuccessResponse({ imagingMethods: methods.map(toImagingMethodResponse) })
  } catch (error) {
    return createErrorResponse(error, "Failed to fetch imaging methods")
  }
}
