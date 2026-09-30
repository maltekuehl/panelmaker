import { createAuthHandler, deleteUser } from "@/lib/auth"
import { createErrorResponse } from "@/lib/error-handling"
import { logSecurityEventFromRequest, SecurityEventType } from "@/lib/security-events"
import { NextRequest, NextResponse } from "next/server"

// DELETE /api/user/[id] - Delete a user (admin only)
export const DELETE = createAuthHandler(
  async (request: NextRequest, user, context: { params: Promise<{ id: string }> }) => {
    try {
      const userId = (await context.params).id

      // Prevent admin from deleting themselves
      if (userId === user.id) {
        return NextResponse.json({ error: "You cannot delete yourself" }, { status: 400 })
      }

      await deleteUser(userId)
      await logSecurityEventFromRequest(request, SecurityEventType.USER_DELETED, {
        userId: user.id,
        action: "user_delete",
        success: true,
        metadata: { targetUserId: userId },
      })
      return NextResponse.json({ message: "User deleted successfully" })
    } catch (error) {
      return createErrorResponse(error, "Failed to delete user")
    }
  },
  true, // Require admin access
)
