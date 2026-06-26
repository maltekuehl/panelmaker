import { authErrorResponse, requireAuth } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { logSecurityEventFromRequest, SecurityEventType } from "@/lib/security-events"
import { acceptInvitation, acceptInvitationSchema } from "@/models/lab"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

function invitationError(error: unknown): NextResponse | null {
  if (!(error instanceof Error)) return null
  if (error.message === "Invitation not found") {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }
  if (error.message.includes("different email address")) {
    return NextResponse.json({ error: error.message }, { status: 403 })
  }
  if (
    error.message.includes("no longer valid") ||
    error.message.includes("has expired") ||
    error.message.includes("already been used")
  ) {
    return NextResponse.json({ error: error.message }, { status: 409 })
  }
  return null
}

// POST /api/invitations/accept - Accept a lab invitation by token
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    const { token } = acceptInvitationSchema.parse(body)

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
    if (error instanceof z.ZodError) {
      return createErrorResponse(error, "Validation error")
    }
    return (
      invitationError(error) ?? authErrorResponse(error) ?? createErrorResponse(error, "Failed to accept invitation")
    )
  }
}
