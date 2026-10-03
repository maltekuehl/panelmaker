import { requireLabMember, requireLabRole } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse, NotFoundError } from "@/lib/error-handling"
import { logSecurityEventFromRequest, SecurityEventType } from "@/lib/security-events"
import {
  deleteLab,
  getLabById,
  getLabMembers,
  toLabMemberResponse,
  toLabResponse,
  updateLab,
  updateLabSchema,
} from "@/models/lab"
import { NextRequest } from "next/server"

type Context = { params: Promise<{ id: string }> }

// GET /api/labs/[id] - Lab detail with members. Members only; non-members get 403 like every sibling route.
export async function GET(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const { role } = await requireLabMember(request, id)
    const lab = await getLabById(id)
    if (!lab) throw new NotFoundError("Resource not found")
    const members = await getLabMembers(id)
    return createSuccessResponse({
      lab: toLabResponse(lab, role),
      members: members.map(toLabMemberResponse),
    })
  } catch (error) {
    return createErrorResponse(error, "Failed to fetch lab")
  }
}

// PATCH /api/labs/[id] - Update lab settings (ADMIN or OWNER)
export async function PATCH(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    await requireLabRole(request, id, "ADMIN")
    const data = updateLabSchema.parse(await request.json())
    const lab = await updateLab(id, data)
    return createSuccessResponse({ lab: toLabResponse(lab) })
  } catch (error) {
    return createErrorResponse(error, "Failed to update lab")
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
    return createErrorResponse(error, "Failed to delete lab")
  }
}
