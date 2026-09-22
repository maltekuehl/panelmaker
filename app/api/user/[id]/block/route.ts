import { blockUser, createAuthHandler, unblockUser } from "@/lib/auth"
import { createErrorResponse } from "@/lib/error-handling"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const blockUserSchema = z.object({ action: z.enum(["block", "unblock"]) }).strict()

// PATCH /api/user/[id]/block - Block a user (admin only)
export const PATCH = createAuthHandler(
  async (request: NextRequest, user, context: { params: Promise<{ id: string }> }) => {
    try {
      const { action } = blockUserSchema.parse(await request.json())
      const userId = (await context.params).id

      // Prevent admin from blocking themselves
      if (userId === user.id) {
        return NextResponse.json({ error: "You cannot block yourself" }, { status: 400 })
      }

      if (action === "block") {
        await blockUser(userId)
        return NextResponse.json({ message: "User blocked successfully" })
      }

      await unblockUser(userId)
      return NextResponse.json({ message: "User unblocked successfully" })
    } catch (error) {
      return createErrorResponse(error, "Failed to update user status")
    }
  },
  true, // Require admin access
)
