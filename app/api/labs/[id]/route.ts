import { authErrorResponse, requireAuth, requireLabRole } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { logSecurityEventFromRequest, SecurityEventType } from "@/lib/security-events"
import {
  deleteLab,
  getLabById,
  getLabMembers,
  getUserLabRole,
  toLabMemberResponse,
  toLabResponse,
  updateLab,
  updateLabSchema,
} from "@/models/lab"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

type Context = { params: Promise<{ id: string }> }

// GET /api/labs/[id] - Lab detail with members. Members only; non-members get 404 (no existence leak).
export async function GET(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const user = await requireAuth(request)
    const role = await getUserLabRole(user.id, id)
    if (!role) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 })
    }
    const lab = await getLabById(id)
    if (!lab) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 })
    }
    const members = await getLabMembers(id)
    return createSuccessResponse({
      lab: toLabResponse(lab, role),
      members: members.map(toLabMemberResponse),
    })
  } catch (error) {
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to fetch lab")
  }
}

// PATCH /api/labs/[id] - Update lab settings (ADMIN or OWNER)
export async function PATCH(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    await requireLabRole(request, id, "ADMIN")
    const body = await request.json()
    const data = updateLabSchema.parse(body)
    const lab = await updateLab(id, data)
    return createSuccessResponse({ lab: toLabResponse(lab) })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error, "Validation error")
    }
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to update lab")
  }
}

// DELETE /api/labs/[id] - Delete a lab (OWNER only)
export async function DELETE(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const { user } = await requireLabRole(request, id, "OWNER")
    await deleteLab(id)
    await logSecurityEventFromRequest(request, SecurityEventType.LAB_DELETED, {
      userId: user.id,
      action: "lab_delete",
      success: true,
      metadata: { labId: id },
    })
    return createSuccessResponse({ success: true })
  } catch (error) {
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to delete lab")
  }
}
