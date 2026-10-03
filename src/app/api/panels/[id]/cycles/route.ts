import { authErrorResponse, requireAuth, resolveViewerContext } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { canEditPanel } from "@/models/lab"
import { addCycle, addCycleSchema, getPanelById, toPanelCycleResponse } from "@/models/panel"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: panelId } = await params

    const user = await requireAuth(request)
    const panel = await getPanelById(panelId)

    if (!panel) {
      return NextResponse.json({ error: "Panel not found" }, { status: 404 })
    }

    if (!canEditPanel(await resolveViewerContext(user.id), panel)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const validated = addCycleSchema.parse(body)

    const cycle = await addCycle(panelId, validated)

    return createSuccessResponse({ cycle: toPanelCycleResponse(cycle) }, 201)
  } catch (error) {
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to add cycle")
  }
}
