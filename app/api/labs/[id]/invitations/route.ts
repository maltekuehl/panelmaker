import { authErrorResponse, requireLabRole } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { checkUserRateLimit, createRateLimitError, RATE_LIMITS } from "@/lib/rate-limiting"
import { logSecurityEventFromRequest, SecurityEventType } from "@/lib/security-events"
import { createInvitation, inviteToLabSchema, listLabInvitations, toLabInvitationResponse } from "@/models/lab"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

type Context = { params: Promise<{ id: string }> }

// GET /api/labs/[id]/invitations - Pending invitations for the lab (ADMIN or OWNER)
export async function GET(request: NextRequest, context: Context) {
  try {
    const { id: labId } = await context.params
    await requireLabRole(request, labId, "ADMIN")
    const invitations = await listLabInvitations(labId)
    return createSuccessResponse({ invitations: invitations.map(toLabInvitationResponse) })
  } catch (error) {
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to fetch invitations")
  }
}

// POST /api/labs/[id]/invitations - Create an invitation. Returns the accept URL once.
export async function POST(request: NextRequest, context: Context) {
  try {
    const { id: labId } = await context.params
    const { user } = await requireLabRole(request, labId, "ADMIN")

    const rateLimitResult = await checkUserRateLimit(user.id, RATE_LIMITS.LAB_INVITATIONS_SEND)
    if (!rateLimitResult.allowed) {
      return createRateLimitError(rateLimitResult) as NextResponse
    }

    const body = await request.json()
    const data = inviteToLabSchema.parse(body)
    const email = data.email && data.email.length > 0 ? data.email : null

    const { invitation, token } = await createInvitation({
      labId,
      email,
      role: data.role,
      maxUses: data.maxUses,
      invitedById: user.id,
    })

    await logSecurityEventFromRequest(request, SecurityEventType.LAB_INVITE_CREATED, {
      userId: user.id,
      action: "lab_invite_create",
      success: true,
      metadata: { labId, role: data.role, email },
    })

    const acceptUrl = `${new URL(request.url).origin}/lab/join/${token}`
    return createSuccessResponse({ invitation: toLabInvitationResponse(invitation), token, acceptUrl }, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error, "Validation error")
    }
    if (
      error instanceof Error &&
      (error.message.includes("Invite links") ||
        error.message.includes("Admin invitations") ||
        error.message.includes("as an owner"))
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to create invitation")
  }
}
