import { requireAuth } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { getPanelById, removeCycle, toPanelCycleResponse, updateCycle, updateCycleSchema } from "@/models/panel"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; cycleId: string }> }) {
  try {
    const { id, cycleId } = await params
    const panelId = parseInt(id, 10)
    const cycleIdNum = parseInt(cycleId, 10)

    if (isNaN(panelId) || isNaN(cycleIdNum)) {
      return NextResponse.json({ error: "Invalid panel or cycle ID" }, { status: 400 })
    }

    const user = await requireAuth(request)
    const panel = await getPanelById(panelId)

    if (!panel) {
      return NextResponse.json({ error: "Panel not found" }, { status: 404 })
    }

    if (panel.ownerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const cycleExists = panel.cycles.some((c) => c.id === cycleIdNum)
    if (!cycleExists) {
      return NextResponse.json({ error: "Cycle not found in this panel" }, { status: 404 })
    }

    const body = await request.json()
    const validated = updateCycleSchema.parse(body)

    const updated = await updateCycle(cycleIdNum, validated)

    return createSuccessResponse({ cycle: toPanelCycleResponse(updated) })
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    if (error instanceof z.ZodError) {
      return createErrorResponse(error, "Validation error")
    }
    return createErrorResponse(error, "Failed to update cycle")
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; cycleId: string }> }) {
  try {
    const { id, cycleId } = await params
    const panelId = parseInt(id, 10)
    const cycleIdNum = parseInt(cycleId, 10)

    if (isNaN(panelId) || isNaN(cycleIdNum)) {
      return NextResponse.json({ error: "Invalid panel or cycle ID" }, { status: 400 })
    }

    const user = await requireAuth(request)
    const panel = await getPanelById(panelId)

    if (!panel) {
      return NextResponse.json({ error: "Panel not found" }, { status: 404 })
    }

    if (panel.ownerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const cycleExists = panel.cycles.some((c) => c.id === cycleIdNum)
    if (!cycleExists) {
      return NextResponse.json({ error: "Cycle not found in this panel" }, { status: 404 })
    }

    await removeCycle(cycleIdNum)

    return createSuccessResponse({ message: "Cycle removed successfully" })
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    return createErrorResponse(error, "Failed to remove cycle")
  }
}
