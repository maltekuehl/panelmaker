"use client"

import { ReportUsagesTable } from "@/components/browse/report-usages-table"
import { PaginationControls } from "@/components/data-table/pagination"
import { Button } from "@/components/ui/button"
import type { ReportUsage } from "@/models/experimental-report"
import { CheckCircle, Loader2, XCircle } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

const PAGE_SIZE = 25

export default function AdminReportsList() {
  const [reports, setReports] = useState<ReportUsage[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await fetch("/api/admin/reports")
        if (!response.ok) throw new Error("Failed to fetch reports")
        const data = (await response.json()) as { reports: ReportUsage[] }
        setReports(data.reports ?? [])
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to fetch reports")
        setReports([])
      } finally {
        setLoading(false)
      }
    }
    fetchReports()
  }, [])

  const handleAction = async (reportId: string, action: "approve" | "dismiss") => {
    setActionLoading(reportId)
    try {
      const response = await fetch(`/api/admin/reports/${reportId}/${action}`, { method: "POST" })
      if (!response.ok) throw new Error(`Failed to ${action === "approve" ? "approve" : "reject"} report`)
      toast.success(action === "approve" ? "Report approved" : "Report rejected")
      setReports((prev) => prev.filter((r) => r.id !== reportId))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed")
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="size-8 animate-spin" />
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <div className="rounded-md border border-dashed px-6 py-12 text-center">
        <CheckCircle className="mx-auto size-8 text-muted-foreground/50" />
        <p className="mt-3 text-sm text-muted-foreground">No pending reports. All caught up!</p>
      </div>
    )
  }

  const pageCount = Math.max(Math.ceil(reports.length / PAGE_SIZE), 1)
  const currentPage = Math.min(page, pageCount)

  return (
    <div className="space-y-4">
      <ReportUsagesTable
        lead="marker"
        data={reports.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)}
        actions={(report) => {
          const isLoading = actionLoading === report.id
          return (
            <div className="flex justify-end gap-1">
              <Button size="sm" className="h-7" onClick={() => handleAction(report.id, "approve")} disabled={isLoading}>
                {isLoading ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7"
                onClick={() => handleAction(report.id, "dismiss")}
                disabled={isLoading}
              >
                <XCircle className="size-4" />
                Reject
              </Button>
            </div>
          )
        }}
      />
      <PaginationControls page={currentPage} pageCount={pageCount} total={reports.length} onPageChange={setPage} />
    </div>
  )
}
