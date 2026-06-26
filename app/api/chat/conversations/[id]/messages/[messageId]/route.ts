import { authErrorResponse, requireAuth } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { deleteMessageAndAfter } from "@/models/chat"
import { NextRequest } from "next/server"

type Context = { params: Promise<{ id: string; messageId: string }> }

// DELETE /api/chat/conversations/[id]/messages/[messageId]
// Removes the message (matched by its UIMessage id) and every message after it. Owner only.
export async function DELETE(request: NextRequest, context: Context) {
  try {
    const { id, messageId } = await context.params
    const user = await requireAuth(request)
    await deleteMessageAndAfter(user.id, id, messageId)
    return createSuccessResponse({ success: true })
  } catch (error) {
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to delete message")
  }
}
