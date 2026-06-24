import { requireAuth } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { getPanelById, reorderMarkers, reorderMarkersSchema } from "@/models/panel"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: panelId } = await params

    if (!panelId) {
      return NextResponse.json({ error: "Invalid panel ID" }, { status: 400 })
    }

    const user = await requireAuth(request)
    const panel = await getPanelById(panelId)

    if (!panel) {
      return NextResponse.json({ error: "Panel not found" }, { status: 404 })
    }

    if (panel.ownerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { items } = reorderMarkersSchema.parse(body)

    const allMarkerIds = new Set(panel.cycles.flatMap((c) => c.markers.map((m) => m.id)))
    const allCycleIds = new Set(panel.cycles.map((c) => c.id))

    for (const item of items) {
      if (!allMarkerIds.has(item.markerId)) {
        return NextResponse.json({ error: `Marker ${item.markerId} not found in this panel` }, { status: 404 })
      }
      if (!allCycleIds.has(item.cycleId)) {
        return NextResponse.json({ error: `Cycle ${item.cycleId} not found in this panel` }, { status: 404 })
      }
    }

    await reorderMarkers(items)

    return createSuccessResponse({ message: "Markers reordered successfully" })
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    if (error instanceof z.ZodError) {
      return createErrorResponse(error, "Validation error")
    }
    return createErrorResponse(error, "Failed to reorder markers")
  }
}
