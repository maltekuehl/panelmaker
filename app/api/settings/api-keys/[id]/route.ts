import { authErrorResponse, requireAuth } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { deleteUserApiCredential } from "@/models/chat"
import { NextRequest } from "next/server"

type Context = { params: Promise<{ id: string }> }

// DELETE /api/settings/api-keys/[id] - Remove one of the current user's provider keys
export async function DELETE(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const user = await requireAuth(request)
    await deleteUserApiCredential(user.id, id)
    return createSuccessResponse({ success: true })
  } catch (error) {
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to delete API key")
  }
}
