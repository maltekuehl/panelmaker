import { getChatSetup } from "@/lib/ai/models"
import { authErrorResponse, requireAuth, resolveViewerContext } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { getLastChatSettings, getOwnedConversation, resolveLabContext } from "@/models/chat"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const querySchema = z.object({
  conversationId: z.string().trim().min(1).max(64).optional(),
  labId: z.string().trim().min(1).max(64).optional(),
})

// GET /api/chat/setup - Models (annotated with the key each would run on), the viewer's labs and the
// selected model for a conversation. Lets the floating widget explain a missing key before sending.
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const query = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
    if (!query.success) return NextResponse.json({ error: "Invalid query" }, { status: 400 })

    const [viewer, conversation, last] = await Promise.all([
      resolveViewerContext(user.id),
      query.data.conversationId ? getOwnedConversation(user.id, query.data.conversationId) : Promise.resolve(null),
      getLastChatSettings(user.id),
    ])
    const labContext = resolveLabContext(viewer, query.data.labId, conversation?.labId ?? last.labId)
    if (!labContext.ok) {
      return NextResponse.json({ error: "Lab membership required", code: labContext.code }, { status: 403 })
    }
    const setup = await getChatSetup(viewer, {
      labContextId: labContext.labId,
      preferredModels: [conversation?.model, last.model],
    })
    return createSuccessResponse(setup)
  } catch (error) {
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to load chat setup")
  }
}
