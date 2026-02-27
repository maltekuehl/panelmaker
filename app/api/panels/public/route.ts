import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { getPublicPanels, toPanelResponse } from "@/models/panel"
import { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100)
    const cursorParam = searchParams.get("cursor")
    const cursor = cursorParam ? parseInt(cursorParam, 10) : undefined

    const panels = await getPublicPanels({ limit, cursor })

    return createSuccessResponse({ panels: panels.map(toPanelResponse) })
  } catch (error) {
    return createErrorResponse(error, "Failed to fetch public panels")
  }
}
