import { authErrorResponse, requireAuth } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { createConversation, createConversationSchema, getConversationsForUser } from "@/models/chat"
import { NextRequest } from "next/server"
import { z } from "zod"

// GET /api/chat/conversations - List the current user's conversations
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const conversations = await getConversationsForUser(user.id)
    return createSuccessResponse({ conversations })
  } catch (error) {
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to fetch conversations")
  }
}

// POST /api/chat/conversations - Create a new conversation
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json().catch(() => ({}))
    const validated = createConversationSchema.parse(body ?? {})
    const conversation = await createConversation(user.id, validated)
    return createSuccessResponse({ conversation }, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error, "Validation error")
    }
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to create conversation")
  }
}
