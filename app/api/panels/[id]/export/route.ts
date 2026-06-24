import { getOptionalAuth } from "@/lib/auth"
import { createErrorResponse } from "@/lib/error-handling"
import { exportPanelCsv, exportPanelJson, exportPanelOrderCsv, getPanelById } from "@/models/panel"
import { NextRequest, NextResponse } from "next/server"

async function resolvePanelId(params: Promise<{ id: string }>): Promise<string | null> {
  const { id } = await params
  return id || null
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const panelId = await resolvePanelId(params)

    if (panelId === null) {
      return NextResponse.json({ error: "Invalid panel ID" }, { status: 400 })
    }

    const user = await getOptionalAuth(request)
    const panel = await getPanelById(panelId)

    if (!panel) {
      return NextResponse.json({ error: "Panel not found" }, { status: 404 })
    }

    if (!panel.isPublic && panel.ownerId !== user?.id) {
      return NextResponse.json({ error: "Panel not found" }, { status: 404 })
    }

    const { searchParams } = request.nextUrl
    const format = searchParams.get("format") ?? "json"

    if (format === "csv") {
      const csv = exportPanelCsv(panel)
      const filename = `${panel.name.replace(/[^a-z0-9_-]/gi, "_")}.csv`
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      })
    }

    if (format === "order") {
      const csv = exportPanelOrderCsv(panel)
      const filename = `${panel.name.replace(/[^a-z0-9_-]/gi, "_")}_order.csv`
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      })
    }

    if (format === "json") {
      const data = exportPanelJson(panel)
      const filename = `${panel.name.replace(/[^a-z0-9_-]/gi, "_")}.json`
      return new NextResponse(JSON.stringify(data, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      })
    }

    return NextResponse.json(
      { error: "Invalid format. Use ?format=csv, ?format=order, or ?format=json" },
      { status: 400 },
    )
  } catch (error) {
    return createErrorResponse(error, "Failed to export panel")
  }
}
