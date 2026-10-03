import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { getAllFluorophores, searchFluorophores, toFluorophoreResponse } from "@/models/fluorophore"
import { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q")?.trim()
    const rows = query ? await searchFluorophores(query) : await getAllFluorophores()
    return createSuccessResponse({ fluorophores: rows.map(toFluorophoreResponse) })
  } catch (error) {
    return createErrorResponse(error, "Failed to load fluorophores")
  }
}
