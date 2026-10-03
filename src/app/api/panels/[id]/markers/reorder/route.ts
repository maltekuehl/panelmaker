import { requireViewer } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import {
  reorderMarkers,
  reorderMarkersSchema,
  requireEditablePanel,
  requirePanelCycle,
  requirePanelMarker,
} from "@/models/panel"
import { NextRequest } from "next/server"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const panel = await requireEditablePanel(id, await requireViewer(request))

    const { items } = reorderMarkersSchema.parse(await request.json())
    for (const item of items) {
      requirePanelMarker(panel, item.markerId)
      requirePanelCycle(panel, item.cycleId)
    }

    await reorderMarkers(items)
    return createSuccessResponse({ message: "Markers reordered successfully" })
  } catch (error) {
    return createErrorResponse(error, "Failed to reorder markers")
  }
}
