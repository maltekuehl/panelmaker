import { requireViewer } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import {
  removeCycle,
  requireEditablePanel,
  requirePanelCycle,
  toPanelCycleResponse,
  updateCycle,
  updateCycleSchema,
} from "@/models/panel"
import { NextRequest } from "next/server"

type Context = { params: Promise<{ id: string; cycleId: string }> }

async function loadCycle(request: NextRequest, context: Context): Promise<string> {
  const { id, cycleId } = await context.params
  const panel = await requireEditablePanel(id, await requireViewer(request))
  return requirePanelCycle(panel, cycleId).id
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const cycleId = await loadCycle(request, context)
    const validated = updateCycleSchema.parse(await request.json())
    const updated = await updateCycle(cycleId, validated)
    return createSuccessResponse({ cycle: toPanelCycleResponse(updated) })
  } catch (error) {
    return createErrorResponse(error, "Failed to update cycle")
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const cycleId = await loadCycle(request, context)
    await removeCycle(cycleId)
    return createSuccessResponse({ message: "Cycle removed successfully" })
  } catch (error) {
    return createErrorResponse(error, "Failed to remove cycle")
  }
}
