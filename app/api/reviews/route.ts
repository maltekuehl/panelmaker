import { createAuthHandler } from "@/lib/auth"
import { getRequestContext, logger } from "@/lib/monitoring"
import { checkUserRateLimit, createRateLimitError, RATE_LIMITS } from "@/lib/rate-limiting"
import { NextRequest, NextResponse } from "next/server"

export const POST = createAuthHandler(async (request: NextRequest, user) => {
  const context = getRequestContext(request)
  logger.apiRequest("POST", "/api/reviews", { ...context, userId: user.id })

  const rateLimitResult = await checkUserRateLimit(user.id, RATE_LIMITS.REVIEWS)
  if (!rateLimitResult.allowed) {
    return createRateLimitError(rateLimitResult)
  }

  return NextResponse.json(
    { message: "Reviews are being migrated to experimental reports — coming soon" },
    { status: 501 },
  )
})

export const DELETE = createAuthHandler(async (request: NextRequest, user) => {
  const context = getRequestContext(request)
  logger.apiRequest("DELETE", "/api/reviews", { ...context, userId: user.id })

  return NextResponse.json(
    { message: "Reviews are being migrated to experimental reports — coming soon" },
    { status: 501 },
  )
})
