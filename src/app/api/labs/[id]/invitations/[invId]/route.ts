import { authErrorResponse, requireLabRole } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { logSecurityEventFromRequest, SecurityEventType } from "@/lib/security-events"
import { revokeInvitation } from "@/models/lab"
import { NextRequest } from "next/server"

type Context = { params: Promise<{ id: string; invId: string }> }

// DELETE /api/labs/[id]/invitations/[invId] - Revoke a pending invitation (ADMIN or OWNER)
export async function DELETE(request: NextRequest, context: Context) {
  try {
    const { id: labId, invId } = await context.params
    const { user } = await requireLabRole(request, labId, "ADMIN")
    await revokeInvitation(labId, invId)
    await logSecurityEventFromRequest(request, SecurityEventType.LAB_INVITE_REVOKED, {
      userId: user.id,
      action: "lab_invite_revoke",
      success: true,
      metadata: { labId, invitationId: invId },
    })
    return createSuccessResponse({ success: true })
  } catch (error) {
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to revoke invitation")
  }
}
