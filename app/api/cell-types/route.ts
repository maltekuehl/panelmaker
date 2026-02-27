import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { getAllCellTypes, searchParamsSchema, toCellTypeResponse } from "@/models/cell-type"
import { NextRequest } from "next/server"
import { z } from "zod"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const validated = searchParamsSchema.parse(Object.fromEntries(searchParams))

    const cellTypes = await getAllCellTypes(validated)
    const data = cellTypes.map(toCellTypeResponse)

    const nextCursor = data.length === validated.limit ? data[data.length - 1]?.id : undefined

    return createSuccessResponse({ cellTypes: data, nextCursor })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error, "Validation error")
    }
    return createErrorResponse(error, "Failed to fetch cell types")
  }
}
