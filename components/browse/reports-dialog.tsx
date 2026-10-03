"use client"

import type { MarkerReport } from "@/components/browse/columns"
import { RecommendationBadge } from "@/components/browse/report-badges"
import { NotAvailable } from "@/components/shared/not-available"
import { TruncatedText } from "@/components/shared/truncated-text"
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
import { doiUrl, pubmedUrl, type PublicationLink } from "@/lib/publication"
import { profileHref } from "@/lib/routes"
import { ExternalLink } from "lucide-react"
import Link from "next/link"

function PublicationSource({ publication }: { publication: PublicationLink }) {
  const [href, label] = publication.doi
    ? [doiUrl(publication.doi), `DOI ${publication.doi}`]
    : [pubmedUrl(publication.pmid ?? ""), `PMID ${publication.pmid}`]
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="block max-w-[220px] truncate text-primary hover:underline"
    >
      {label}
    </a>
  )
}

function DataSourceName({ source }: { source: NonNullable<MarkerReport["dataSource"]> }) {
  if (!source.url) return <TruncatedText text={source.name} className="max-w-[220px]" />
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      className="block max-w-[220px] truncate text-primary hover:underline"
    >
      {source.name}
    </a>
  )
}

function ReportSource({ report }: { report: MarkerReport }) {
  return (
    <div className="flex max-w-[240px] flex-col gap-0.5">
      {report.submitterId ? (
        <TruncatedText
          text={report.submitter ?? "Unnamed user"}
          href={profileHref(report.submitterId)}
          className="max-w-[220px]"
        />
      ) : report.publication ? (
        <PublicationSource publication={report.publication} />
      ) : report.dataSource ? (
        <DataSourceName source={report.dataSource} />
      ) : (
        <NotAvailable />
      )}
      {report.lab && <TruncatedText text={report.lab} className="max-w-[220px] text-xs text-muted-foreground" />}
    </div>
  )
}

interface ReportsDialogProps {
  title: string
  context?: string
  reports: MarkerReport[]
}

export function ReportsDialog({ title, context, reports }: ReportsDialogProps) {
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
        <button type="button" aria-label={`View ${label} for ${title}`}>
          <Badge
            variant="secondary"
            className="cursor-pointer bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
          >
            {label}
          </Badge>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader className="min-w-0 pr-8">
          <DialogTitle className="line-clamp-2 min-w-0 break-words">{title}</DialogTitle>
          <DialogDescription>
            {context ? `${label}, ${context}.` : `${label}.`} Open a report for the full protocol and images.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] min-w-0 overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Author</TableHead>
                <TableHead>Technology</TableHead>
                <TableHead>Sample species</TableHead>
                <TableHead>Verdict</TableHead>
                <TableHead className="text-right">Report</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>
                    <ReportSource report={report} />
                  </TableCell>
                  <TableCell>{report.method}</TableCell>
                  <TableCell className="text-muted-foreground">{report.species}</TableCell>
                  <TableCell>
                    <RecommendationBadge recommendation={report.recommendation} />
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
