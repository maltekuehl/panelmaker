import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { getProteinById, toProteinResponse } from "@/models/protein"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const protein = await getProteinById(id)

    if (!protein) {
      return NextResponse.json({ error: "Protein not found" }, { status: 404 })
    }

    return createSuccessResponse({ protein: toProteinResponse(protein) })
  } catch (error) {
    return createErrorResponse(error, "Failed to fetch protein")
  }
}
