"use client"

import type { MarkerReport } from "@/components/browse/columns"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ExternalLink } from "lucide-react"
import Link from "next/link"

function WorksBadge({ works }: { works: boolean | null }) {
  if (works === null)
    return (
      <Badge variant="outline" className="text-[10px]">
        Unknown
      </Badge>
    )
  return works ? (
    <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">Works</Badge>
  ) : (
    <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">Failed</Badge>
  )
}

interface ReportsDialogProps {
  marker: string
  cellType: string
  reports: MarkerReport[]
}

export function ReportsDialog({ marker, cellType, reports }: ReportsDialogProps) {
  const label = `${reports.length} ${reports.length === 1 ? "report" : "reports"}`

  if (reports.length === 0) {
    return (
      <Badge variant="secondary" className="bg-muted text-muted-foreground border-transparent">
        {label}
      </Badge>
    )
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" aria-label={`View ${label} for ${marker}`}>
          <Badge
            variant="secondary"
            className="cursor-pointer bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
          >
            {label}
          </Badge>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Experimental reports for {marker}</DialogTitle>
          <DialogDescription>
            {label} validating {marker} in {cellType}. Open a report for the full protocol and images.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Author</TableHead>
                <TableHead>Technology</TableHead>
                <TableHead>Species</TableHead>
                <TableHead>Result</TableHead>
                <TableHead className="text-right">Report</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>
                    {report.submitterId ? (
                      <Link href={`/profile/${report.submitterId}`} className="text-primary hover:underline">
                        {report.submitter}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">{report.submitter}</span>
                    )}
                  </TableCell>
                  <TableCell>{report.method}</TableCell>
                  <TableCell className="text-muted-foreground">{report.species}</TableCell>
                  <TableCell>
                    <WorksBadge works={report.works} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/report/${report.id}`}
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      Open
                      <ExternalLink className="size-3.5" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
