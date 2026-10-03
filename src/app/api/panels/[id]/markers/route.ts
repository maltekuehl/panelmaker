import { requireViewer } from "@/lib/auth"
import { BadRequestError, createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { fluorophoreExists } from "@/models/fluorophore"
import {
  addMarker,
  addMarkerSchema,
  removeMarker,
  requireEditablePanel,
  requirePanelCycle,
  requirePanelMarker,
  toPanelMarkerResponse,
  updateMarker,
} from "@/models/panel"
import { ensureProtein } from "@/models/protein"
import { NextRequest } from "next/server"
import { z } from "zod"

type Context = { params: Promise<{ id: string }> }

const addMarkerBodySchema = addMarkerSchema.extend({ cycleId: z.string().min(1) })

const removeMarkerSchema = z.object({ markerId: z.string().min(1) }).strict()

const updateMarkerSchema = z
  .object({
    markerId: z.string().min(1),
    antibodyId: z.string().min(1).nullable().optional(),
    fluorophoreId: z.string().min(1).nullable().optional(),
    metalTag: z.string().max(100).nullable().optional(),
  })
  .strict()

async function loadPanel(request: NextRequest, context: Context) {
  const { id } = await context.params
  return requireEditablePanel(id, await requireViewer(request))
}

async function assertFluorophore(fluorophoreId: string | null | undefined): Promise<void> {
  if (fluorophoreId && !(await fluorophoreExists(fluorophoreId))) throw new BadRequestError("Unknown fluorophore")
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const panel = await loadPanel(request, context)
    const { cycleId, ...validated } = addMarkerBodySchema.parse(await request.json())
    requirePanelCycle(panel, cycleId)
    await assertFluorophore(validated.fluorophoreId)

    if (validated.proteinId) {
      await ensureProtein({
        id: validated.proteinId,
        label: validated.proteinLabel,
        geneSymbol: validated.geneSymbol,
        ensemblGeneId: validated.ensemblGeneId,
      })
    }

    const marker = await addMarker(cycleId, validated)
    return createSuccessResponse({ marker: toPanelMarkerResponse(marker) }, 201)
  } catch (error) {
    return createErrorResponse(error, "Failed to add marker")
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const panel = await loadPanel(request, context)
    const { markerId } = removeMarkerSchema.parse(await request.json())
    requirePanelMarker(panel, markerId)

    await removeMarker(markerId)
    return createSuccessResponse({ message: "Marker removed successfully" })
  } catch (error) {
    return createErrorResponse(error, "Failed to remove marker")
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const panel = await loadPanel(request, context)
    const { markerId, ...updateData } = updateMarkerSchema.parse(await request.json())
    requirePanelMarker(panel, markerId)
    await assertFluorophore(updateData.fluorophoreId)

    const marker = await updateMarker(markerId, updateData)
    return createSuccessResponse({ marker: toPanelMarkerResponse(marker) })
  } catch (error) {
    return createErrorResponse(error, "Failed to update marker")
  }
}
