import { getChatSetup } from "@/lib/ai/models"
import { requireAuth, resolveViewerContext } from "@/lib/auth"
import { BadRequestError, ForbiddenError, createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { getLastChatSettings, getOwnedConversation, resolveLabContext } from "@/models/chat"
import { NextRequest } from "next/server"
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
    if (!query.success) throw new BadRequestError("Invalid query")

    const [viewer, conversation, last] = await Promise.all([
      resolveViewerContext(user.id),
      query.data.conversationId ? getOwnedConversation(user.id, query.data.conversationId) : Promise.resolve(null),
      getLastChatSettings(user.id),
    ])
    const labContext = resolveLabContext(viewer, query.data.labId, conversation?.labId ?? last.labId)
    if (!labContext.ok) throw new ForbiddenError("Lab membership required", labContext.code)
    const setup = await getChatSetup(viewer, {
      labContextId: labContext.labId,
      preferredModels: [conversation?.model, last.model],
    })
    return createSuccessResponse(setup)
  } catch (error) {
    return createErrorResponse(error, "Failed to load chat setup")
  }
}
