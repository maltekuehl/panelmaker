import { requireAuth } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { checkUserRateLimit, createRateLimitError, RATE_LIMITS } from "@/lib/rate-limiting"
import { createPanel, createPanelSchema, getPanelsForUser, toPanelResponse } from "@/models/panel"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)

    const panels = await getPanelsForUser(user.id)

    return createSuccessResponse({ panels: panels.map(toPanelResponse) })
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    return createErrorResponse(error, "Failed to fetch panels")
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)

    const rateLimitResult = await checkUserRateLimit(user.id, RATE_LIMITS.PANELS_CREATE)
    if (!rateLimitResult.allowed) {
      return createRateLimitError(rateLimitResult) as NextResponse
    }

    const body = await request.json()
    const validated = createPanelSchema.parse(body)

    const panel = await createPanel(validated, user.id)

    return createSuccessResponse({ panel: toPanelResponse(panel) }, 201)
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    if (error instanceof z.ZodError) {
      return createErrorResponse(error, "Validation error")
    }
    return createErrorResponse(error, "Failed to create panel")
  }
}
