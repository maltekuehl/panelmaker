import { authErrorResponse, requireLabMember, requireLabRole } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { checkUserRateLimit, createRateLimitError, RATE_LIMITS } from "@/lib/rate-limiting"
import { addLabAntibodySchema, getLabInventory, toLabAntibodyResponse, upsertLabAntibody } from "@/models/lab"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

type Context = { params: Promise<{ id: string }> }

// GET /api/labs/[id]/inventory - The lab's antibody inventory (members only)
export async function GET(request: NextRequest, context: Context) {
  try {
    const { id: labId } = await context.params
    await requireLabMember(request, labId)
    const inventory = await getLabInventory(labId)
    return createSuccessResponse({ inventory: inventory.map(toLabAntibodyResponse) })
  } catch (error) {
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to fetch inventory")
  }
}

// POST /api/labs/[id]/inventory - Add (or refresh) an antibody in the inventory (MEMBER and up)
export async function POST(request: NextRequest, context: Context) {
  try {
    const { id: labId } = await context.params
    const { user } = await requireLabRole(request, labId, "MEMBER")

    const rateLimitResult = await checkUserRateLimit(user.id, RATE_LIMITS.INVENTORY_MUTATE)
    if (!rateLimitResult.allowed) {
      return createRateLimitError(rateLimitResult) as NextResponse
    }

    const body = await request.json()
    const data = addLabAntibodySchema.parse(body)
    const item = await upsertLabAntibody(labId, data, user.id)
    return createSuccessResponse({ item: toLabAntibodyResponse(item) }, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error, "Validation error")
    }
    if (error instanceof Error && error.message.includes("No antibody found")) {
      return NextResponse.json({ error: error.message }, { status: 422 })
    }
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to add antibody")
  }
}
