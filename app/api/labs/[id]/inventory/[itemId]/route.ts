import { authErrorResponse, requireLabRole } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { removeLabAntibody, toLabAntibodyResponse, updateLabAntibody, updateLabAntibodySchema } from "@/models/lab"
import { NextRequest } from "next/server"
import { z } from "zod"

type Context = { params: Promise<{ id: string; itemId: string }> }

// PATCH /api/labs/[id]/inventory/[itemId] - Update operational metadata (MEMBER and up; not VIEWER)
export async function PATCH(request: NextRequest, context: Context) {
  try {
    const { id: labId, itemId } = await context.params
    await requireLabRole(request, labId, "MEMBER")
    const body = await request.json()
    const data = updateLabAntibodySchema.parse(body)
    const item = await updateLabAntibody(labId, itemId, data)
    return createSuccessResponse({ item: toLabAntibodyResponse(item) })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error, "Validation error")
    }
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to update antibody")
  }
}

// DELETE /api/labs/[id]/inventory/[itemId] - Remove an antibody from the inventory (MEMBER and up)
export async function DELETE(request: NextRequest, context: Context) {
  try {
    const { id: labId, itemId } = await context.params
    await requireLabRole(request, labId, "MEMBER")
    await removeLabAntibody(labId, itemId)
    return createSuccessResponse({ success: true })
  } catch (error) {
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to remove antibody")
  }
}
