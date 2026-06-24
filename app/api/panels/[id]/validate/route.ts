import { getOptionalAuth } from "@/lib/auth"
import { createErrorResponse } from "@/lib/error-handling"
import { getPanelById, validatePanel } from "@/models/panel"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: panelId } = await params

    if (!panelId) {
      return NextResponse.json({ error: "Invalid panel ID" }, { status: 400 })
    }

    const user = await getOptionalAuth(request)
    const panel = await getPanelById(panelId)

    if (!panel) {
      return NextResponse.json({ error: "Panel not found" }, { status: 404 })
    }

    if (!panel.isPublic && panel.ownerId !== user?.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 })
    }

    const result = validatePanel(panel)
    return NextResponse.json(result)
  } catch (error) {
    return createErrorResponse(error, "Failed to validate panel")
  }
}
