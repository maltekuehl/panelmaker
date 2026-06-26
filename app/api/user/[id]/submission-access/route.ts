import { createAuthHandler, grantAccess, revokeAccess } from "@/lib/auth"
import { logger } from "@/lib/monitoring"
import { NextRequest, NextResponse } from "next/server"

// PATCH /api/user/[id]/submission-access - Grant or revoke submission access (admin only)
export const PATCH = createAuthHandler(
  async (request: NextRequest, _user, context: { params: Promise<{ id: string }> }) => {
    try {
      const userId = (await context.params).id
      if (!userId) {
        return NextResponse.json({ error: "User ID is required" }, { status: 400 })
      }

      const body = await request.json().catch(() => null)
      const action = body && typeof body === "object" ? (body as { action?: unknown }).action : undefined

      if (action === "grant") {
        await grantAccess(userId)
        return NextResponse.json({ message: "Verified access granted" })
      } else if (action === "revoke") {
        await revokeAccess(userId)
        return NextResponse.json({ message: "Verified access revoked" })
      }

      return NextResponse.json({ error: "Invalid action. Use 'grant' or 'revoke'" }, { status: 400 })
    } catch (error) {
      logger.error("Error updating submission access", error instanceof Error ? error : new Error(String(error)))
      return NextResponse.json({ error: "Failed to update submission access" }, { status: 500 })
    }
  },
  true, // Require admin access
)
