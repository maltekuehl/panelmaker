"use client"

import type { MarkerReport } from "@/components/browse/columns"
import { WorksBadge } from "@/components/browse/report-badges"
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { doiUrl, pubmedUrl, type PublicationRef } from "@/lib/publication"
import { profileHref } from "@/lib/routes"
import { ExternalLink } from "lucide-react"
import Link from "next/link"

function shortCitation(citation: string): string {
  const firstSentence = citation.split(". ")[0]
  return firstSentence.length > 0 ? firstSentence : citation
}

function publicationHref(publication: PublicationRef): string | null {
  if (publication.doi) return doiUrl(publication.doi)
  if (publication.pmid) return pubmedUrl(publication.pmid)
  return null
}

function PublicationSource({ publication }: { publication: PublicationRef }) {
  const href = publicationHref(publication)
  const label = publication.citation
    ? shortCitation(publication.citation)
    : publication.doi
      ? `DOI ${publication.doi}`
      : `PMID ${publication.pmid}`
  const text = href ? (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="block max-w-[220px] truncate text-primary hover:underline"
    >
      {label}
    </a>
  ) : (
    <span className="block max-w-[220px] truncate">{label}</span>
  )
  if (!publication.citation) return text
  return (
    <Tooltip>
      <TooltipTrigger asChild>{text}</TooltipTrigger>
      <TooltipContent className="max-w-sm">{publication.citation}</TooltipContent>
    </Tooltip>
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
      ) : (
        <NotAvailable />
      )}
      {report.lab && <TruncatedText text={report.lab} className="max-w-[220px] text-xs text-muted-foreground" />}
    </div>
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
        <DialogHeader className="min-w-0 pr-8">
          <DialogTitle className="min-w-0">
            <TruncatedText text={`Experimental reports for ${marker}`} />
          </DialogTitle>
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
                <TableHead>Sample species</TableHead>
                <TableHead>Result</TableHead>
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
