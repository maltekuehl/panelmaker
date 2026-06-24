import { requireAuth } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { checkUserRateLimit, createRateLimitError, RATE_LIMITS } from "@/lib/rate-limiting"
import { createReportBatchSchema, resolveAndCreateReports, toReportResponse } from "@/models/experimental-report"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)

    const body = await request.json()
    const validated = createReportBatchSchema.parse(body)

    const rateLimitResult = await checkUserRateLimit(user.id, RATE_LIMITS.REPORTS_SUBMIT, validated.antibodies.length)
    if (!rateLimitResult.allowed) {
      return createRateLimitError(rateLimitResult) as NextResponse
    }

    const { created, failed } = await resolveAndCreateReports(validated, user.id)

    return createSuccessResponse(
      {
        created: created.map(toReportResponse),
        failed,
        createdCount: created.length,
        failedCount: failed.length,
      },
      201,
    )
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    if (error instanceof z.ZodError) {
      return createErrorResponse(error, "Validation error")
    }
    if (
      error instanceof Error &&
      (error.message.includes("not found in") || error.message.includes("not found in Antibody Registry"))
    ) {
      return NextResponse.json({ error: error.message }, { status: 422 })
    }
    return createErrorResponse(error, "Failed to create reports")
  }
}
