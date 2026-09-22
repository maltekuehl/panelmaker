"use client"

import { WorksBadge } from "@/components/browse/report-badges"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatLongDate } from "@/lib/format"
import { CheckCircle, ChevronDown, ChevronUp, Loader2, XCircle } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

type ReportItem = {
  id: string
  antibodyName: string
  markerName: string | null
  antibodyId: string
  antibodyVendor: string
  catalogNumber: string | null
  clone: string
  hostSpecies: string | null
  species: string
  tissueLabel: string
  method: string
  fixation: string
  works: boolean | null
  signalQuality: string | null
  specificity: string | null
  notes: string | null
  cellTypes: { id: string; label: string }[]
  subcellularLabel: string | null
  submitter: string
  submitterInstitution: string | null
  createdAt: string
  status: string
}

function ReportCard({
  report,
  onApprove,
  onReject,
  actionLoading,
}: {
  report: ReportItem
  onApprove: (id: string) => void
  onReject: (id: string) => void
  actionLoading: string | null
}) {
  const [notesExpanded, setNotesExpanded] = useState(false)
  const isLoading = actionLoading === report.id
  const notesTooLong = (report.notes?.length ?? 0) > 200

  return (
    <div className="space-y-4 border-t py-6 first:border-t-0 first:pt-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold">{report.markerName ?? report.antibodyName}</h3>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
            <span>{report.antibodyName}</span>
            <span className="font-mono">{report.antibodyId}</span>
            {report.catalogNumber && <span>Cat. {report.catalogNumber}</span>}
          </p>
        </div>
        <p className="whitespace-nowrap text-xs text-muted-foreground">{formatLongDate(report.createdAt)}</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <span className="font-medium text-muted-foreground">Vendor</span>
            <p>{report.antibodyVendor}</p>
          </div>
          <div>
            <span className="font-medium text-muted-foreground">Clone</span>
            <p>{report.clone}</p>
          </div>
          {report.hostSpecies && (
            <div>
              <span className="font-medium text-muted-foreground">Host species</span>
              <p>{report.hostSpecies}</p>
            </div>
          )}
          <div>
            <span className="font-medium text-muted-foreground">Species</span>
            <p>{report.species}</p>
          </div>
          <div>
            <span className="font-medium text-muted-foreground">Tissue</span>
            <p>{report.tissueLabel}</p>
          </div>
          {report.cellTypes.length > 0 && (
            <div>
              <span className="font-medium text-muted-foreground">Cell types</span>
              <p>{report.cellTypes.map((ct) => ct.label).join(", ")}</p>
            </div>
          )}
          {report.subcellularLabel && (
            <div>
              <span className="font-medium text-muted-foreground">Subcellular</span>
              <p>{report.subcellularLabel}</p>
            </div>
          )}
          <div>
            <span className="font-medium text-muted-foreground">Method</span>
            <p>{report.method}</p>
          </div>
          <div>
            <span className="font-medium text-muted-foreground">Fixation</span>
            <p>{report.fixation}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <WorksBadge works={report.works} />
          {report.signalQuality && <Badge variant="secondary">Signal: {report.signalQuality}</Badge>}
          {report.specificity && <Badge variant="secondary">Specificity: {report.specificity}</Badge>}
        </div>

        {report.notes && (
          <div className="text-sm">
            <span className="font-medium text-muted-foreground">Notes</span>
            <p className="mt-1 text-foreground leading-relaxed">
              {notesExpanded || !notesTooLong ? report.notes : `${report.notes.slice(0, 200)}…`}
            </p>
            {notesTooLong && (
              <button
                onClick={() => setNotesExpanded(!notesExpanded)}
                className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                {notesExpanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" /> Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" /> Show more
                  </>
                )}
              </button>
            )}
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          Submitted by <span className="font-medium text-foreground">{report.submitter}</span>
          {report.submitterInstitution && <span>, {report.submitterInstitution}</span>}
        </div>

        <div className="flex gap-2 pt-2">
          <Button size="sm" onClick={() => onApprove(report.id)} disabled={isLoading}>
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
            Approve
          </Button>
          <Button size="sm" variant="destructive" onClick={() => onReject(report.id)} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            Reject
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function AdminReportsList() {
  const [reports, setReports] = useState<ReportItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchReports = async () => {
    try {
      const response = await fetch("/api/admin/reports")
      if (!response.ok) throw new Error("Failed to fetch reports")
      const data = (await response.json()) as { reports: ReportItem[] }
      setReports(data.reports ?? [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch reports")
      setReports([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
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
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="mx-auto mb-3 size-10 text-muted-foreground" />
        <p className="text-muted-foreground">No pending reports. All caught up!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {reports.length} pending report{reports.length !== 1 ? "s" : ""}
      </p>
      {reports.map((report) => (
        <ReportCard
          key={report.id}
          report={report}
          actionLoading={actionLoading}
          onApprove={(id) => handleAction(id, "approve")}
          onReject={(id) => handleAction(id, "dismiss")}
        />
      ))}
    </div>
  )
}
