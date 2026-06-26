import { authErrorResponse, requireAuth, requireLabRole } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { logSecurityEventFromRequest, SecurityEventType } from "@/lib/security-events"
import { changeMemberRole, changeMemberRoleSchema, getUserLabRole, removeMember, ROLE_RANK } from "@/models/lab"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

type Context = { params: Promise<{ id: string; userId: string }> }

// PATCH /api/labs/[id]/members/[userId] - Change a member's role (ADMIN or OWNER).
// Only an OWNER may change an OWNER's role. Demoting the last OWNER is blocked downstream.
export async function PATCH(request: NextRequest, context: Context) {
  try {
    const { id: labId, userId: targetUserId } = await context.params
    const { user, role: actorRole } = await requireLabRole(request, labId, "ADMIN")

    const body = await request.json()
    const { role } = changeMemberRoleSchema.parse(body)

    const targetRole = await getUserLabRole(targetUserId, labId)
    if (!targetRole) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 })
    }
    if (targetRole === "OWNER" && actorRole !== "OWNER") {
      return NextResponse.json({ error: "Only an owner can change an owner's role" }, { status: 403 })
    }

    await changeMemberRole(labId, targetUserId, role)
    await logSecurityEventFromRequest(request, SecurityEventType.LAB_ROLE_CHANGED, {
      userId: user.id,
      action: "lab_role_change",
      success: true,
      metadata: { labId, targetUserId, role },
    })
    return createSuccessResponse({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error, "Validation error")
    }
    if (error instanceof Error && error.message === "Cannot demote the last owner") {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to change member role")
  }
}

// DELETE /api/labs/[id]/members/[userId] - Remove a member, or leave the lab (self).
// Members may remove themselves; otherwise ADMIN is required. Only an OWNER may remove an OWNER.
export async function DELETE(request: NextRequest, context: Context) {
  try {
    const { id: labId, userId: targetUserId } = await context.params
    const user = await requireAuth(request)

    const actorRole = await getUserLabRole(user.id, labId)
    if (!actorRole) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 })
    }

    const isSelf = targetUserId === user.id
    if (!isSelf && ROLE_RANK[actorRole] < ROLE_RANK.ADMIN) {
      return NextResponse.json({ error: "Insufficient lab role" }, { status: 403 })
    }

    const targetRole = await getUserLabRole(targetUserId, labId)
    if (!targetRole) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 })
    }
    if (!isSelf && targetRole === "OWNER" && actorRole !== "OWNER") {
      return NextResponse.json({ error: "Only an owner can remove an owner" }, { status: 403 })
    }

    await removeMember(labId, targetUserId)
    await logSecurityEventFromRequest(request, SecurityEventType.LAB_MEMBER_REMOVED, {
      userId: user.id,
      action: isSelf ? "lab_leave" : "lab_member_remove",
      success: true,
      metadata: { labId, targetUserId },
    })
    return createSuccessResponse({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === "Cannot remove the last owner") {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to remove member")
  }
}
