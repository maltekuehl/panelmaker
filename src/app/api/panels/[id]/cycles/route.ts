import { requireViewer } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { addCycle, addCycleSchema, requireEditablePanel, toPanelCycleResponse } from "@/models/panel"
import { NextRequest } from "next/server"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await requireEditablePanel(id, await requireViewer(request))

    const validated = addCycleSchema.parse(await request.json())
    const cycle = await addCycle(id, validated)
    return createSuccessResponse({ cycle: toPanelCycleResponse(cycle) }, 201)
  } catch (error) {
    return createErrorResponse(error, "Failed to add cycle")
  }
}
