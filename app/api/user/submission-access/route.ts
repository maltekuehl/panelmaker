import { createAuthHandler, getAccessState, requestAccess } from "@/lib/auth"
import { logger } from "@/lib/monitoring"
import { NextRequest, NextResponse } from "next/server"

// GET /api/user/submission-access - Current user's verified-access state
export const GET = createAuthHandler(async (_request: NextRequest, user) => {
  try {
    const state = await getAccessState(user.id)
    return NextResponse.json(state)
  } catch (error) {
    logger.error("Error fetching access state", error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: "Failed to fetch access state" }, { status: 500 })
  }
})

// POST /api/user/submission-access - Request verified access
export const POST = createAuthHandler(async (_request: NextRequest, user) => {
  try {
    await requestAccess(user.id)
    const state = await getAccessState(user.id)
    return NextResponse.json(state)
  } catch (error) {
    logger.error("Error requesting access", error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: "Failed to request access" }, { status: 500 })
  }
})
