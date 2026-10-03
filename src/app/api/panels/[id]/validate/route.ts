import { getOptionalViewer } from "@/lib/auth"
import { createErrorResponse } from "@/lib/error-handling"
import { requireVisiblePanel, validatePanelWithSpectra } from "@/models/panel"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const panel = await requireVisiblePanel(id, await getOptionalViewer(request))
    return NextResponse.json(await validatePanelWithSpectra(panel))
  } catch (error) {
    return createErrorResponse(error, "Failed to validate panel")
  }
}
