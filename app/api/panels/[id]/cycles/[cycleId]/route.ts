import { authErrorResponse, requireAuth, resolveViewerContext } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { canEditPanel } from "@/models/lab"
import { getPanelById, removeCycle, toPanelCycleResponse, updateCycle, updateCycleSchema } from "@/models/panel"
import { NextRequest, NextResponse } from "next/server"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; cycleId: string }> }) {
  try {
    const { id: panelId, cycleId } = await params

    if (!panelId || !cycleId) {
      return NextResponse.json({ error: "Invalid panel or cycle ID" }, { status: 400 })
    }

    const user = await requireAuth(request)
    const panel = await getPanelById(panelId)

    if (!panel) {
      return NextResponse.json({ error: "Panel not found" }, { status: 404 })
    }

    if (!canEditPanel(await resolveViewerContext(user.id), panel)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const cycleExists = panel.cycles.some((c) => c.id === cycleId)
    if (!cycleExists) {
      return NextResponse.json({ error: "Cycle not found in this panel" }, { status: 404 })
    }

    const body = await request.json()
    const validated = updateCycleSchema.parse(body)

    const updated = await updateCycle(cycleId, validated)

    return createSuccessResponse({ cycle: toPanelCycleResponse(updated) })
  } catch (error) {
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to update cycle")
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; cycleId: string }> }) {
  try {
    const { id: panelId, cycleId } = await params

    if (!panelId || !cycleId) {
      return NextResponse.json({ error: "Invalid panel or cycle ID" }, { status: 400 })
    }

    const user = await requireAuth(request)
    const panel = await getPanelById(panelId)

    if (!panel) {
      return NextResponse.json({ error: "Panel not found" }, { status: 404 })
    }

    if (!canEditPanel(await resolveViewerContext(user.id), panel)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const cycleExists = panel.cycles.some((c) => c.id === cycleId)
    if (!cycleExists) {
      return NextResponse.json({ error: "Cycle not found in this panel" }, { status: 404 })
    }

    await removeCycle(cycleId)

    return createSuccessResponse({ message: "Cycle removed successfully" })
  } catch (error) {
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to remove cycle")
  }
}
