import { authErrorResponse, getOptionalAuth, requireAuth, resolveViewerContext } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { canEditPanel, canViewPanel } from "@/models/lab"
import { deletePanel, getPanelById, toPanelResponse, updatePanel, updatePanelSchema } from "@/models/panel"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: panelId } = await params

    const user = await getOptionalAuth(request)
    const panel = await getPanelById(panelId)

    if (!panel) {
      return NextResponse.json({ error: "Panel not found" }, { status: 404 })
    }

    const viewer = await resolveViewerContext(user?.id ?? null)
    if (!canViewPanel(viewer, panel)) {
      return NextResponse.json({ error: "Panel not found" }, { status: 404 })
    }

    return createSuccessResponse({ panel: toPanelResponse(panel) })
  } catch (error) {
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to fetch panel")
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: panelId } = await params

    const user = await requireAuth(request)
    const panel = await getPanelById(panelId)

    if (!panel) {
      return NextResponse.json({ error: "Panel not found" }, { status: 404 })
    }

    const viewer = await resolveViewerContext(user.id)
    if (!canEditPanel(viewer, panel)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const validated = updatePanelSchema.parse(body)

    const updated = await updatePanel(panelId, validated)

    return createSuccessResponse({ panel: toPanelResponse(updated) })
  } catch (error) {
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to update panel")
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return PUT(request, { params })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: panelId } = await params

    const user = await requireAuth(request)
    const panel = await getPanelById(panelId)

    if (!panel) {
      return NextResponse.json({ error: "Panel not found" }, { status: 404 })
    }

    const viewer = await resolveViewerContext(user.id)
    if (!canEditPanel(viewer, panel)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await deletePanel(panelId)

    return createSuccessResponse({ message: "Panel deleted successfully" })
  } catch (error) {
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to delete panel")
  }
}
