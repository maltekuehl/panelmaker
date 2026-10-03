import { NotFoundError, createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { getProteinById, toProteinResponse } from "@/models/protein"
import { NextRequest } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const protein = await getProteinById(id)

    if (!protein) throw new NotFoundError("Protein not found")

    return createSuccessResponse({ protein: toProteinResponse(protein) })
  } catch (error) {
    return createErrorResponse(error, "Failed to fetch protein")
  }
}
