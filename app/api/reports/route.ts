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
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const validated = searchParamsSchema.parse(Object.fromEntries(searchParams))

    const reports = await getAllReports(validated)
    const data = reports.map(toReportResponse)

    const nextCursor = data.length === validated.limit ? data[data.length - 1]?.id : undefined

    return createSuccessResponse({ reports: data, nextCursor })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error, "Validation error")
    }
    return createErrorResponse(error, "Failed to fetch reports")
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)

    const rateLimitResult = await checkUserRateLimit(user.id, RATE_LIMITS.REPORTS_SUBMIT)
    if (!rateLimitResult.allowed) {
      return createRateLimitError(rateLimitResult) as NextResponse
    }

    const body = await request.json()
    const validated = createReportSchema.parse(body)

    const report = await createReport(validated, user.id)

    return createSuccessResponse({ report: toReportResponse(report) }, 201)
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    if (error instanceof z.ZodError) {
      return createErrorResponse(error, "Validation error")
    }
    return createErrorResponse(error, "Failed to create report")
  }
}
