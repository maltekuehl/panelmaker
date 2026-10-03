import { requireAuth, resolveViewerContext } from "@/lib/auth"
import { ForbiddenError, NotFoundError, createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import {
  canUseLabCredential,
  conversationBelongsToUser,
  deleteConversation,
  getConversation,
  updateConversation,
  updateConversationSchema,
} from "@/models/chat"
import { NextRequest } from "next/server"

type Context = { params: Promise<{ id: string }> }

// GET /api/chat/conversations/[id] - Conversation with messages. Owner only; non-owner gets 404.
export async function GET(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const user = await requireAuth(request)
    const conversation = await getConversation(user.id, id)
    if (!conversation) throw new NotFoundError("Resource not found")
    return createSuccessResponse({ conversation })
  } catch (error) {
    return createErrorResponse(error, "Failed to fetch conversation")
  }
}

// PATCH /api/chat/conversations/[id] - Rename / set model / set lab context / pin (owner only)
export async function PATCH(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const user = await requireAuth(request)
    if (!(await conversationBelongsToUser(user.id, id))) throw new NotFoundError("Resource not found")
    const data = updateConversationSchema.parse(await request.json())
    if (data.labId) {
      const viewer = await resolveViewerContext(user.id)
      if (!canUseLabCredential(viewer, data.labId))
        throw new ForbiddenError("Lab membership required", "LAB_ACCESS_DENIED")
    }
    await updateConversation(user.id, id, data)
    return createSuccessResponse({ success: true })
  } catch (error) {
    return createErrorResponse(error, "Failed to update conversation")
  }
}

// DELETE /api/chat/conversations/[id] - Delete the conversation and its messages (owner only; the
// scoped deleteMany is a no-op for anyone else)
export async function DELETE(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const user = await requireAuth(request)
    await deleteConversation(user.id, id)
    return createSuccessResponse({ success: true })
  } catch (error) {
    return createErrorResponse(error, "Failed to delete conversation")
  }
}
