import { createAuthHandler } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { getRequestContext, logger } from "@/lib/monitoring"
import { getPendingReports } from "@/models/experimental-report"
import { toReportUsage } from "@/models/experimental-report/transforms"
import { connection, NextRequest } from "next/server"

export const GET = createAuthHandler(async (request: NextRequest, user) => {
  await connection()
  const context = getRequestContext(request)
  logger.apiRequest("GET", "/api/admin/reports", { ...context, userId: user.id })

  try {
    const reports = await getPendingReports()
    return createSuccessResponse({ reports: reports.map(toReportUsage) })
  } catch (error) {
    logger.error("Failed to fetch pending reports", error as Error, { userId: user.id })
    return createErrorResponse(error, "Failed to fetch pending reports")
  }
}, true)
