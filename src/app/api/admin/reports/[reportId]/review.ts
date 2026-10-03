import { createAuthHandler } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { getRequestContext, logger } from "@/lib/monitoring"
import { updateReportStatus } from "@/models/experimental-report"
import { revalidateTag } from "next/cache"
import { NextRequest } from "next/server"

const REVIEW_ACTIONS = {
  approve: { status: "PUBLISHED", verb: "approve", past: "approved" },
  dismiss: { status: "REJECTED", verb: "reject", past: "rejected" },
} as const

export function createReviewHandler(action: keyof typeof REVIEW_ACTIONS) {
  const { status, verb, past } = REVIEW_ACTIONS[action]
  return createAuthHandler(
    async (request: NextRequest, user, { params }: { params: Promise<{ reportId: string }> }) => {
      const { reportId } = await params
      logger.apiRequest("POST", `/api/admin/reports/${reportId}/${action}`, {
        ...getRequestContext(request),
        userId: user.id,
      })

      try {
        await updateReportStatus(reportId, status)
        revalidateTag("browse", "max")
        revalidateTag("browse-facets", "max")
        logger.info(`Report ${past} by admin`, { reportId, adminId: user.id })
        return createSuccessResponse({ message: `Report ${past} successfully` })
      } catch (error) {
        return createErrorResponse(error, `Failed to ${verb} report`)
      }
    },
    true,
  )
}
