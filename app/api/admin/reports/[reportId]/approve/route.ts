import { createAuthHandler } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { getRequestContext, logger } from "@/lib/monitoring"
import { updateReportStatus } from "@/models/experimental-report"
import { NextRequest, NextResponse } from "next/server"

export const POST = createAuthHandler(
  async (request: NextRequest, user, { params }: { params: Promise<{ reportId: string }> }) => {
    const { reportId } = await params
    const context = getRequestContext(request)
    logger.apiRequest("POST", `/api/admin/reports/${reportId}/approve`, { ...context, userId: user.id })

    const id = parseInt(reportId, 10)
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid report ID" }, { status: 400 })
    }

    try {
      await updateReportStatus(id, "VALIDATED")
      logger.info("Report approved by admin", { reportId: id, adminId: user.id })
      return createSuccessResponse({ message: "Report approved successfully" })
    } catch (error) {
      logger.error("Failed to approve report", error as Error, { reportId: id, userId: user.id })
      return createErrorResponse(error, "Failed to approve report")
    }
  },
  true,
)
