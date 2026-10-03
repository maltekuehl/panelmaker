import { getOptionalViewer } from "@/lib/auth"
import { BadRequestError, createErrorResponse } from "@/lib/error-handling"
import {
  exportPanelCsv,
  exportPanelJson,
  exportPanelOrderCsv,
  type PanelRow,
  requireVisiblePanel,
} from "@/models/panel"
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
      throw new BadRequestError("Invalid format. Use ?format=csv, ?format=order, or ?format=json")
    }

    const panel = await requireVisiblePanel(panelId, await getOptionalViewer(request))

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
