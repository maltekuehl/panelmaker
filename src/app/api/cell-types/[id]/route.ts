import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { getCellTypeById, toCellTypeDetailResponse } from "@/models/cell-type"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const cellType = await getCellTypeById(id)

    if (!cellType) {
      return NextResponse.json({ error: "Cell type not found" }, { status: 404 })
    }

    return createSuccessResponse({ cellType: toCellTypeDetailResponse(cellType) })
  } catch (error) {
    return createErrorResponse(error, "Failed to fetch cell type")
  }
}
