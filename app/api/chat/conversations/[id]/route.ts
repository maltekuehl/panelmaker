import { authErrorResponse, requireAuth } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import {
  conversationBelongsToUser,
  getConversation,
  softDeleteConversation,
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

// PATCH /api/chat/conversations/[id] - Rename / set model / pin (owner only)
export async function PATCH(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const user = await requireAuth(request)
    if (!(await conversationBelongsToUser(user.id, id))) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 })
    }
    const data = updateConversationSchema.parse(await request.json())
    await updateConversation(user.id, id, data)
    return createSuccessResponse({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error, "Validation error")
    }
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to update conversation")
  }
}

// DELETE /api/chat/conversations/[id] - Soft delete (owner only; scoped updateMany is a no-op otherwise)
export async function DELETE(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const user = await requireAuth(request)
    await softDeleteConversation(user.id, id)
    return createSuccessResponse({ success: true })
  } catch (error) {
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to delete conversation")
  }
}
