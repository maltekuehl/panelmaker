import { requireAuth } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { addCycle, addCycleSchema, getPanelById, toPanelCycleResponse } from "@/models/panel"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const panelId = parseInt(id, 10)

    if (isNaN(panelId)) {
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
    const validated = addCycleSchema.parse(body)

    const cycle = await addCycle(panelId, validated)

    return createSuccessResponse({ cycle: toPanelCycleResponse(cycle) }, 201)
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    if (error instanceof z.ZodError) {
      return createErrorResponse(error, "Validation error")
    }
    return createErrorResponse(error, "Failed to add cycle")
  }
}
