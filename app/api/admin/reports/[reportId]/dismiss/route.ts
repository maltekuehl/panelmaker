import { createAuthHandler } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { getRequestContext, logger } from "@/lib/monitoring"
import { updateReportStatus } from "@/models/experimental-report"
import { NextRequest, NextResponse } from "next/server"

export const POST = createAuthHandler(
  async (request: NextRequest, user, { params }: { params: Promise<{ reportId: string }> }) => {
    const { reportId } = await params
    const context = getRequestContext(request)
    logger.apiRequest("POST", `/api/admin/reports/${reportId}/dismiss`, { ...context, userId: user.id })

    if (!reportId) {
      return NextResponse.json({ error: "Invalid report ID" }, { status: 400 })
    }

    try {
      await updateReportStatus(reportId, "REJECTED")
      logger.info("Report rejected by admin", { reportId, adminId: user.id })
      return createSuccessResponse({ message: "Report rejected successfully" })
    } catch (error) {
      logger.error("Failed to reject report", error as Error, { reportId, userId: user.id })
      return createErrorResponse(error, "Failed to reject report")
    }
  },
  true,
)
