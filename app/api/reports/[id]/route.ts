import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { getReportById, toReportResponse } from "@/models/experimental-report"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: "Invalid report ID" }, { status: 400 })
    }

    const report = await getReportById(id)

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 })
    }

    if (!report.isPublic) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 })
    }

    return createSuccessResponse({ report: toReportResponse(report) })
  } catch (error) {
    return createErrorResponse(error, "Failed to fetch report")
  }
}
