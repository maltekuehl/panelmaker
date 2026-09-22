"use client"

import { ReportUsagesTable } from "@/components/browse/report-usages-table"
import type { ReportUsage } from "@/models/experimental-report"

interface MarkerUsagesTableProps {
  data: ReportUsage[]
}

export function MarkerUsagesTable({ data }: MarkerUsagesTableProps) {
  return <ReportUsagesTable data={data} lead="antibody" />
}
