import { NotFoundError, createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { getPublicReportById, toReportResponse } from "@/models/experimental-report"
import { NextRequest } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const report = await getPublicReportById(id)

    if (!report) throw new NotFoundError("Report not found")

    return createSuccessResponse({ report: toReportResponse(report) })
  } catch (error) {
    return createErrorResponse(error, "Failed to fetch report")
  }
}
