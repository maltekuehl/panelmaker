import { requireAuth } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { deletePanel, getPanelById, toPanelResponse, updatePanel, updatePanelSchema } from "@/models/panel"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

async function resolvePanelId(params: Promise<{ id: string }>): Promise<number | null> {
  const { id } = await params
  const numericId = parseInt(id, 10)
  return isNaN(numericId) ? null : numericId
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const panelId = await resolvePanelId(params)

    if (panelId === null) {
      return NextResponse.json({ error: "Invalid panel ID" }, { status: 400 })
    }

    const user = await requireAuth(request)
    const panel = await getPanelById(panelId)

    if (!panel) {
      return NextResponse.json({ error: "Panel not found" }, { status: 404 })
    }

    if (panel.ownerId !== user.id && !panel.isPublic) {
      return NextResponse.json({ error: "Panel not found" }, { status: 404 })
    }

    return createSuccessResponse({ panel: toPanelResponse(panel) })
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    return createErrorResponse(error, "Failed to fetch panel")
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const panelId = await resolvePanelId(params)

    if (panelId === null) {
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
    const validated = updatePanelSchema.parse(body)

    const updated = await updatePanel(panelId, validated)

    return createSuccessResponse({ panel: toPanelResponse(updated) })
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    if (error instanceof z.ZodError) {
      return createErrorResponse(error, "Validation error")
    }
    return createErrorResponse(error, "Failed to update panel")
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return PUT(request, { params })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const panelId = await resolvePanelId(params)

    if (panelId === null) {
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

    await deletePanel(panelId)

    return createSuccessResponse({ message: "Panel deleted successfully" })
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    return createErrorResponse(error, "Failed to delete panel")
  }
}
