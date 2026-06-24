import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { getAntibodyById, toAntibodyResponse } from "@/models/antibody"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: "Invalid antibody ID" }, { status: 400 })
    }

    const antibody = await getAntibodyById(id)

    if (!antibody) {
      return NextResponse.json({ error: "Antibody not found" }, { status: 404 })
    }

    return createSuccessResponse({ antibody: toAntibodyResponse(antibody) })
  } catch (error) {
    return createErrorResponse(error, "Failed to fetch antibody")
  }
}
