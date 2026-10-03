import { authErrorResponse, requireLabRole } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { checkUserRateLimit, createRateLimitError, RATE_LIMITS } from "@/lib/rate-limiting"
import { removeLabAntibody, toLabAntibodyResponse, updateLabAntibody, updateLabAntibodySchema } from "@/models/lab"
import { NextRequest, NextResponse } from "next/server"

type Context = { params: Promise<{ id: string; itemId: string }> }

// PATCH /api/labs/[id]/inventory/[itemId] - Update operational metadata (MEMBER and up; not VIEWER)
export async function PATCH(request: NextRequest, context: Context) {
  try {
    const { id: labId, itemId } = await context.params
    const { user } = await requireLabRole(request, labId, "MEMBER")

    const rateLimitResult = await checkUserRateLimit(user.id, RATE_LIMITS.INVENTORY_MUTATE)
    if (!rateLimitResult.allowed) {
      return createRateLimitError(rateLimitResult) as NextResponse
    }

    const body = await request.json()
    const data = updateLabAntibodySchema.parse(body)
    const item = await updateLabAntibody(labId, itemId, data)
    return createSuccessResponse({ item: toLabAntibodyResponse(item) })
  } catch (error) {
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to update antibody")
  }
}

// DELETE /api/labs/[id]/inventory/[itemId] - Remove an antibody from the inventory (MEMBER and up)
export async function DELETE(request: NextRequest, context: Context) {
  try {
    const { id: labId, itemId } = await context.params
    const { user } = await requireLabRole(request, labId, "MEMBER")

    const rateLimitResult = await checkUserRateLimit(user.id, RATE_LIMITS.INVENTORY_MUTATE)
    if (!rateLimitResult.allowed) {
      return createRateLimitError(rateLimitResult) as NextResponse
    }

    await removeLabAntibody(labId, itemId)
    return createSuccessResponse({ success: true })
  } catch (error) {
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to remove antibody")
  }
}
