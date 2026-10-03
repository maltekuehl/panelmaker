import { requireAuth } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { logSecurityEventFromRequest, SecurityEventType } from "@/lib/security-events"
import { acceptInvitation, acceptInvitationSchema } from "@/models/lab"
import { NextRequest } from "next/server"

// POST /api/invitations/accept - Accept a lab invitation by token
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const { token } = acceptInvitationSchema.parse(await request.json())

    const result = await acceptInvitation(token, user.id, user.email ?? null)

    await logSecurityEventFromRequest(request, SecurityEventType.LAB_INVITE_ACCEPTED, {
      userId: user.id,
      action: "lab_invite_accept",
      success: true,
      metadata: { labId: result.labId, role: result.role },
    })

    return createSuccessResponse({
      lab: { id: result.labId, slug: result.slug, name: result.labName },
      role: result.role,
    })
  } catch (error) {
    return createErrorResponse(error, "Failed to accept invitation")
  }
}
