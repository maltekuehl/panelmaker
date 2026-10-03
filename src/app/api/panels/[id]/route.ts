import { getOptionalViewer, requireViewer } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import {
  deletePanel,
  requireEditablePanel,
  requireVisiblePanel,
  toPanelResponse,
  updatePanel,
  updatePanelSchema,
} from "@/models/panel"
import { NextRequest } from "next/server"

type Context = { params: Promise<{ id: string }> }

async function loadEditable(request: NextRequest, context: Context): Promise<string> {
  const { id } = await context.params
  return (await requireEditablePanel(id, await requireViewer(request))).id
}

export async function GET(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const panel = await requireVisiblePanel(id, await getOptionalViewer(request))
    return createSuccessResponse({ panel: toPanelResponse(panel) })
  } catch (error) {
    return createErrorResponse(error, "Failed to fetch panel")
  }
}

export async function PUT(request: NextRequest, context: Context) {
  try {
    const id = await loadEditable(request, context)
    const validated = updatePanelSchema.parse(await request.json())
    const updated = await updatePanel(id, validated)
    return createSuccessResponse({ panel: toPanelResponse(updated) })
  } catch (error) {
    return createErrorResponse(error, "Failed to update panel")
  }
}

export const PATCH = PUT

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const id = await loadEditable(request, context)
    await deletePanel(id)
    return createSuccessResponse({ message: "Panel deleted successfully" })
  } catch (error) {
    return createErrorResponse(error, "Failed to delete panel")
  }
}
