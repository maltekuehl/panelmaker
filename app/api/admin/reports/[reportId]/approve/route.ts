import { createAuthHandler } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { getRequestContext, logger } from "@/lib/monitoring"
import { updateReportStatus } from "@/models/experimental-report"
import { revalidateTag } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

export const POST = createAuthHandler(
  async (request: NextRequest, user, { params }: { params: Promise<{ reportId: string }> }) => {
    const { reportId } = await params
    const context = getRequestContext(request)
    logger.apiRequest("POST", `/api/admin/reports/${reportId}/approve`, { ...context, userId: user.id })

    if (!reportId) {
      return NextResponse.json({ error: "Invalid report ID" }, { status: 400 })
    }

    try {
      await updateReportStatus(reportId, "PUBLISHED")
      revalidateTag("browse-markers", "max")
      logger.info("Report approved by admin", { reportId, adminId: user.id })
      return createSuccessResponse({ message: "Report approved successfully" })
    } catch (error) {
      logger.error("Failed to approve report", error as Error, { reportId, userId: user.id })
      return createErrorResponse(error, "Failed to approve report")
    }
  },
  true,
)
