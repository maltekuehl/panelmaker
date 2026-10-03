import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import "server-only"

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  resourceType: string // Type of resource being rate limited
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetTime: Date
  totalRequests: number
}

// Predefined rate limit configurations
export const RATE_LIMITS = {
  // Chat turns that run on an operator-configured instance key. maxRequests is the default; the chat
  // route overrides it with AI_INSTANCE_DAILY_LIMIT (0 disables the limit).
  CHAT_INSTANCE_KEY: {
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    maxRequests: 200,
    resourceType: "chat_instance_key",
  },
  REPORTS_SUBMIT: {
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    maxRequests: 50,
    resourceType: "reports_submit",
  },
  PANELS_CREATE: {
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    maxRequests: 50,
    resourceType: "panels_create",
  },
  UPLOADS: {
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    maxRequests: 200,
    resourceType: "uploads",
  },
  // Charged in whole megabytes: pass Math.ceil(file.size / 1_048_576) as the count.
  UPLOAD_BYTES: {
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    maxRequests: 2048,
    resourceType: "upload_bytes",
  },
  LABS_CREATE: {
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    maxRequests: 10,
    resourceType: "labs_create",
  },
  LAB_INVITATIONS_SEND: {
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    maxRequests: 50,
    resourceType: "lab_invitations_send",
  },
  INVENTORY_MUTATE: {
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    maxRequests: 300,
    resourceType: "inventory_mutate",
  },
} as const

type RateLimitSubject = { userId: string }

/**
 * Consumes `count` units of a rate-limit budget.
 *
 * Every write is a conditional statement evaluated by Postgres under the row lock, so concurrent
 * requests cannot overshoot the limit and a first-ever request cannot lose an insert race:
 *   1. INSERT ... ON CONFLICT DO NOTHING creates the counter row if it is missing.
 *   2. A conditional UPDATE restarts the window when the previous one has expired.
 *   3. A conditional UPDATE increments only while the budget still has room, so a denied request
 *      does not consume any of it.
 */
async function consumeRateLimit(
  subject: RateLimitSubject,
  config: RateLimitConfig,
  count = 1,
): Promise<RateLimitResult> {
  const now = new Date()
  const windowStart = new Date(now.getTime() - config.windowMs)
  const where = { ...subject, resourceType: config.resourceType }

  if (count > config.maxRequests) {
    return {
      allowed: false,
      limit: config.maxRequests,
      remaining: 0,
      resetTime: new Date(now.getTime() + config.windowMs),
      totalRequests: 0,
    }
  }

  await prisma.rateLimit.createMany({
    data: [{ ...where, requestCount: 0, windowStartTime: now, lastRequestTime: now }],
    skipDuplicates: true,
  })

  const restarted = await prisma.rateLimit.updateMany({
    where: { ...where, windowStartTime: { lt: windowStart } },
    data: { requestCount: count, windowStartTime: now, lastRequestTime: now },
  })

  if (restarted.count > 0) {
    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - count,
      resetTime: new Date(now.getTime() + config.windowMs),
      totalRequests: count,
    }
  }

  const consumed = await prisma.rateLimit.updateMany({
    where: { ...where, requestCount: { lte: config.maxRequests - count } },
    data: { requestCount: { increment: count }, lastRequestTime: now },
  })

  const row = await prisma.rateLimit.findFirst({
    where,
    select: { requestCount: true, windowStartTime: true },
  })

  const totalRequests = row?.requestCount ?? count
  const resetTime = new Date((row?.windowStartTime ?? now).getTime() + config.windowMs)

  return {
    allowed: consumed.count > 0,
    limit: config.maxRequests,
    remaining: consumed.count > 0 ? Math.max(config.maxRequests - totalRequests, 0) : 0,
    resetTime,
    totalRequests,
  }
}

/**
 * Check rate limit for authenticated users (user ID based)
 */
export async function checkUserRateLimit(userId: string, config: RateLimitConfig, count = 1): Promise<RateLimitResult> {
  return consumeRateLimit({ userId }, config, count)
}

/**
 * Create a rate limit error response with appropriate headers
 */
export function createRateLimitError(result: RateLimitResult): NextResponse {
  const retryAfter = Math.max(Math.ceil((result.resetTime.getTime() - Date.now()) / 1000), 1)

  return NextResponse.json(
    {
      error: "Rate limit exceeded",
      message: "Too many requests. Please try again later.",
      resetTime: result.resetTime.toISOString(),
      retryAfter,
    },
    {
      status: 429,
      headers: {
        "Retry-After": retryAfter.toString(),
        "X-RateLimit-Limit": result.limit.toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": result.resetTime.toISOString(),
      },
    },
  )
}
