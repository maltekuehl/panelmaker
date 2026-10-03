import { requireAuth } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { checkUserRateLimit, createRateLimitError, RATE_LIMITS } from "@/lib/rate-limiting"
import { createPanel, createPanelSchema, getPanelsForUser, toPanelResponse } from "@/models/panel"
import { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)

    const panels = await getPanelsForUser(user.id)

    return createSuccessResponse({ panels: panels.map(toPanelResponse) })
  } catch (error) {
    return createErrorResponse(error, "Failed to fetch panels")
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)

    const rateLimitResult = await checkUserRateLimit(user.id, RATE_LIMITS.PANELS_CREATE)
    if (!rateLimitResult.allowed) return createRateLimitError(rateLimitResult)

    const validated = createPanelSchema.parse(await request.json())

    const panel = await createPanel(validated, user.id)

    return createSuccessResponse({ panel: toPanelResponse(panel) }, 201)
  } catch (error) {
    return createErrorResponse(error, "Failed to create panel")
  }
}
