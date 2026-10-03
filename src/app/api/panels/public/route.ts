import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { getPublicPanels, panelQueryParamsSchema, toPanelResponse } from "@/models/panel"
import { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const params = panelQueryParamsSchema.parse(Object.fromEntries(request.nextUrl.searchParams))

    const panels = await getPublicPanels(params)
    const data = panels.map(toPanelResponse)

    const nextCursor = data.length === params.limit ? data[data.length - 1]?.id : undefined

    return createSuccessResponse({ panels: data, nextCursor })
  } catch (error) {
    return createErrorResponse(error, "Failed to fetch public panels")
  }
}
