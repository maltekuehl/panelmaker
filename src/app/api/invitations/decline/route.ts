import { requireAuth } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { acceptInvitationSchema, declineInvitation } from "@/models/lab"
import { NextRequest } from "next/server"

// POST /api/invitations/decline - Decline an email-restricted lab invitation by token
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const { token } = acceptInvitationSchema.parse(await request.json())

    await declineInvitation(token, user.email ?? null)

    return createSuccessResponse({ success: true })
  } catch (error) {
    return createErrorResponse(error, "Failed to decline invitation")
  }
}
