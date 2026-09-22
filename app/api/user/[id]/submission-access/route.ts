import { createAuthHandler, grantAccess, revokeAccess } from "@/lib/auth"
import { createErrorResponse } from "@/lib/error-handling"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const submissionAccessSchema = z.object({ action: z.enum(["grant", "revoke"]) }).strict()

// PATCH /api/user/[id]/submission-access - Grant or revoke submission access (admin only)
export const PATCH = createAuthHandler(
  async (request: NextRequest, _user, context: { params: Promise<{ id: string }> }) => {
    try {
      const userId = (await context.params).id
      const { action } = submissionAccessSchema.parse(await request.json())

      if (action === "grant") {
        await grantAccess(userId)
        return NextResponse.json({ message: "Verified access granted" })
      }

      await revokeAccess(userId)
      return NextResponse.json({ message: "Verified access revoked" })
    } catch (error) {
      return createErrorResponse(error, "Failed to update submission access")
    }
  },
  true, // Require admin access
)
