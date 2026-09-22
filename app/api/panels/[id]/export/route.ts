import { getOptionalAuth, resolveViewerContext } from "@/lib/auth"
import { createErrorResponse } from "@/lib/error-handling"
import { canViewPanel } from "@/models/lab"
import { exportPanelCsv, exportPanelJson, exportPanelOrderCsv, getPanelById, type PanelRow } from "@/models/panel"
import { NextRequest, NextResponse } from "next/server"

const EXPORTERS = {
  csv: { build: exportPanelCsv, contentType: "text/csv; charset=utf-8", suffix: ".csv" },
  order: { build: exportPanelOrderCsv, contentType: "text/csv; charset=utf-8", suffix: "_order.csv" },
  json: {
    build: (panel: PanelRow) => JSON.stringify(exportPanelJson(panel), null, 2),
    contentType: "application/json; charset=utf-8",
    suffix: ".json",
  },
} as const

type ExportFormat = keyof typeof EXPORTERS

function isExportFormat(value: string): value is ExportFormat {
  return value in EXPORTERS
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: panelId } = await params

    const format = request.nextUrl.searchParams.get("format") ?? "json"
    if (!isExportFormat(format)) {
      return NextResponse.json(
        { error: "Invalid format. Use ?format=csv, ?format=order, or ?format=json" },
        { status: 400 },
      )
    }

    const user = await getOptionalAuth(request)
    const panel = await getPanelById(panelId)

    if (!panel) {
      return NextResponse.json({ error: "Panel not found" }, { status: 404 })
    }

    if (!canViewPanel(await resolveViewerContext(user?.id ?? null), panel)) {
      return NextResponse.json({ error: "Panel not found" }, { status: 404 })
    }

    const exporter = EXPORTERS[format]
    const safeName = panel.name.replace(/[^a-z0-9_-]/gi, "_")

    return new NextResponse(exporter.build(panel), {
      status: 200,
      headers: {
        "Content-Type": exporter.contentType,
        "Content-Disposition": `attachment; filename="${safeName}${exporter.suffix}"`,
      },
    })
  } catch (error) {
    return createErrorResponse(error, "Failed to export panel")
  }
}
