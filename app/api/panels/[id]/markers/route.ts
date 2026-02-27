import { requireAuth } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { prisma } from "@/lib/prisma"
import {
  addMarker,
  addMarkerSchema,
  getPanelById,
  removeMarker,
  toPanelMarkerResponse,
  updateMarker,
} from "@/models/panel"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const removeMarkerSchema = z.object({ markerId: z.number().int().positive() }).strict()

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

    const cycleIdSchema = z.object({ cycleId: z.number().int().positive() })
    const { cycleId } = cycleIdSchema.parse(body)

    const validCycle = panel.cycles.find((c) => c.id === cycleId)
    if (!validCycle) {
      return NextResponse.json({ error: "Cycle not found in this panel" }, { status: 404 })
    }

    const { cycleId: _cycleId, ...markerBody } = body
    const validated = addMarkerSchema.parse(markerBody)

    if (validated.proteinId) {
      await prisma.protein.upsert({
        where: { id: validated.proteinId },
        update: {
          ...(validated.ensemblGeneId ? { ensemblGeneId: validated.ensemblGeneId } : {}),
        },
        create: {
          id: validated.proteinId,
          label: validated.proteinLabel ?? validated.proteinId,
          geneSymbol: validated.geneSymbol ?? null,
          ensemblGeneId: validated.ensemblGeneId ?? null,
        },
      })
    }

    const marker = await addMarker(cycleId, validated)

    return createSuccessResponse({ marker: toPanelMarkerResponse(marker) }, 201)
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    if (error instanceof z.ZodError) {
      return createErrorResponse(error, "Validation error")
    }
    return createErrorResponse(error, "Failed to add marker")
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const { markerId } = removeMarkerSchema.parse(body)

    const markerExists = panel.cycles.some((c) => c.markers.some((m) => m.id === markerId))
    if (!markerExists) {
      return NextResponse.json({ error: "Marker not found in this panel" }, { status: 404 })
    }

    await removeMarker(markerId)

    return createSuccessResponse({ message: "Marker removed successfully" })
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    if (error instanceof z.ZodError) {
      return createErrorResponse(error, "Validation error")
    }
    return createErrorResponse(error, "Failed to remove marker")
  }
}

const updateMarkerSchema = z
  .object({
    markerId: z.number().int().positive(),
    antibodyId: z.number().int().positive().nullable().optional(),
    fluorophore: z.string().max(100).nullable().optional(),
    metalTag: z.string().max(100).nullable().optional(),
  })
  .strict()

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const { markerId, ...updateData } = updateMarkerSchema.parse(body)

    const markerExists = panel.cycles.some((c) => c.markers.some((m) => m.id === markerId))
    if (!markerExists) {
      return NextResponse.json({ error: "Marker not found in this panel" }, { status: 404 })
    }

    const marker = await updateMarker(markerId, updateData)

    return createSuccessResponse({ marker: toPanelMarkerResponse(marker) })
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    if (error instanceof z.ZodError) {
      return createErrorResponse(error, "Validation error")
    }
    return createErrorResponse(error, "Failed to update marker")
  }
}
