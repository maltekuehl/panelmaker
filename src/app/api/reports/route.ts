import { requireAuth } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { checkUserRateLimit, createRateLimitError, RATE_LIMITS } from "@/lib/rate-limiting"
import {
  createReport,
  createReportSchema,
  getAllReports,
  searchParamsSchema,
  toReportResponse,
} from "@/models/experimental-report"
import { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const validated = searchParamsSchema.parse(Object.fromEntries(searchParams))

    const reports = await getAllReports(validated)
    const data = reports.map(toReportResponse)

    const nextCursor = data.length === validated.limit ? data[data.length - 1]?.id : undefined

    return createSuccessResponse({ reports: data, nextCursor })
  } catch (error) {
    return createErrorResponse(error, "Failed to fetch reports")
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)

    const validated = createReportSchema.parse(await request.json())

    const rateLimitResult = await checkUserRateLimit(user.id, RATE_LIMITS.REPORTS_SUBMIT)
    if (!rateLimitResult.allowed) return createRateLimitError(rateLimitResult)

    const report = await createReport(validated, user.id)

    return createSuccessResponse({ report: toReportResponse(report) }, 201)
  } catch (error) {
    return createErrorResponse(error, "Failed to create report")
  }
}
