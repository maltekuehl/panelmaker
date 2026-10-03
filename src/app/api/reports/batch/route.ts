import { requireAuth } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { checkUserRateLimit, createRateLimitError, RATE_LIMITS } from "@/lib/rate-limiting"
import { createReportBatchSchema, resolveAndCreateReports, toReportResponse } from "@/models/experimental-report"
import { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)

    const validated = createReportBatchSchema.parse(await request.json())

    const rateLimitResult = await checkUserRateLimit(user.id, RATE_LIMITS.REPORTS_SUBMIT, validated.antibodies.length)
    if (!rateLimitResult.allowed) return createRateLimitError(rateLimitResult)

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
    return createErrorResponse(error, "Failed to create reports")
  }
}
