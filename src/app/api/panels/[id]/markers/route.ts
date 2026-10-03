import { authErrorResponse, requireAuth, resolveViewerContext } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { prisma } from "@/lib/prisma"
import { fluorophoreExists } from "@/models/fluorophore"
import { canEditPanel } from "@/models/lab"
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

const addMarkerBodySchema = addMarkerSchema.extend({ cycleId: z.string().min(1) })

const removeMarkerSchema = z.object({ markerId: z.string().min(1) }).strict()

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

    const { cycleId, ...validated } = addMarkerBodySchema.parse(await request.json())

    const validCycle = panel.cycles.find((c) => c.id === cycleId)
    if (!validCycle) {
      return NextResponse.json({ error: "Cycle not found in this panel" }, { status: 404 })
    }

    if (validated.fluorophoreId && !(await fluorophoreExists(validated.fluorophoreId))) {
      return NextResponse.json({ error: "Unknown fluorophore" }, { status: 400 })
    }

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
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to add marker")
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const { markerId } = removeMarkerSchema.parse(body)

    const markerExists = panel.cycles.some((c) => c.markers.some((m) => m.id === markerId))
    if (!markerExists) {
      return NextResponse.json({ error: "Marker not found in this panel" }, { status: 404 })
    }

    await removeMarker(markerId)

    return createSuccessResponse({ message: "Marker removed successfully" })
  } catch (error) {
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to remove marker")
  }
}

const updateMarkerSchema = z
  .object({
    markerId: z.string().min(1),
    antibodyId: z.string().min(1).nullable().optional(),
    fluorophoreId: z.string().min(1).nullable().optional(),
    metalTag: z.string().max(100).nullable().optional(),
  })
  .strict()

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const { markerId, ...updateData } = updateMarkerSchema.parse(body)

    const markerExists = panel.cycles.some((c) => c.markers.some((m) => m.id === markerId))
    if (!markerExists) {
      return NextResponse.json({ error: "Marker not found in this panel" }, { status: 404 })
    }

    if (updateData.fluorophoreId && !(await fluorophoreExists(updateData.fluorophoreId))) {
      return NextResponse.json({ error: "Unknown fluorophore" }, { status: 400 })
    }

    const marker = await updateMarker(markerId, updateData)

    return createSuccessResponse({ marker: toPanelMarkerResponse(marker) })
  } catch (error) {
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to update marker")
  }
}
