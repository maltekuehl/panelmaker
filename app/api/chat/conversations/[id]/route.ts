import { authErrorResponse, requireAuth, resolveViewerContext } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import {
  canUseLabCredential,
  conversationBelongsToUser,
  deleteConversation,
  getConversation,
  updateConversation,
  updateConversationSchema,
} from "@/models/chat"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

type Context = { params: Promise<{ id: string }> }

// GET /api/chat/conversations/[id] - Conversation with messages. Owner only; non-owner gets 404.
export async function GET(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const user = await requireAuth(request)
    const conversation = await getConversation(user.id, id)
    if (!conversation) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 })
    }
    return createSuccessResponse({ conversation })
  } catch (error) {
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to fetch conversation")
  }
}

// PATCH /api/chat/conversations/[id] - Rename / set model / set lab context / pin (owner only)
export async function PATCH(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const user = await requireAuth(request)
    if (!(await conversationBelongsToUser(user.id, id))) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 })
    }
    const data = updateConversationSchema.parse(await request.json())
    if (data.labId) {
      const viewer = await resolveViewerContext(user.id)
      if (!canUseLabCredential(viewer, data.labId)) {
        return NextResponse.json({ error: "Lab membership required", code: "LAB_ACCESS_DENIED" }, { status: 403 })
      }
    }
    await updateConversation(user.id, id, data)
    return createSuccessResponse({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error, "Validation error")
    }
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to update conversation")
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
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to delete conversation")
  }
}
