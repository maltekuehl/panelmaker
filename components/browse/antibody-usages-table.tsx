"use client"

import { ReportUsagesTable } from "@/components/browse/report-usages-table"
import type { ReportUsage } from "@/models/experimental-report"

interface AntibodyUsagesTableProps {
  data: ReportUsage[]
}

export function AntibodyUsagesTable({ data }: AntibodyUsagesTableProps) {
  return <ReportUsagesTable data={data} lead="marker" />
}
