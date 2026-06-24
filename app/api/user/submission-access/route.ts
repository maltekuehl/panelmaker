import { createAuthHandler, getSubmissionAccessState, requestSubmissionAccess } from "@/lib/auth"
import { logger } from "@/lib/monitoring"
import { NextRequest, NextResponse } from "next/server"

// GET /api/user/submission-access - Current user's submission access state
export const GET = createAuthHandler(async (_request: NextRequest, user) => {
  try {
    const state = await getSubmissionAccessState(user.id)
    return NextResponse.json(state)
  } catch (error) {
    logger.error("Error fetching submission access", error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: "Failed to fetch submission access" }, { status: 500 })
  }
})

// POST /api/user/submission-access - Request submission access
export const POST = createAuthHandler(async (_request: NextRequest, user) => {
  try {
    await requestSubmissionAccess(user.id)
    const state = await getSubmissionAccessState(user.id)
    return NextResponse.json(state)
  } catch (error) {
    logger.error("Error requesting submission access", error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: "Failed to request submission access" }, { status: 500 })
  }
})
