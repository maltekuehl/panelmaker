import { authErrorResponse, requireAuth } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { acceptInvitationSchema, declineInvitation } from "@/models/lab"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

// POST /api/invitations/decline - Decline an emailed lab invitation by token
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    const { token } = acceptInvitationSchema.parse(body)

    await declineInvitation(token, user.email ?? null)

    return createSuccessResponse({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error, "Validation error")
    }
    if (
      error instanceof Error &&
      (error.message.includes("no longer valid") ||
        error.message.includes("cannot be declined") ||
        error.message.includes("different email address"))
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to decline invitation")
  }
}
