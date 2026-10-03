"use client"

import { RecommendationBadge } from "@/components/browse/report-badges"
import { ReportUsageDetails } from "@/components/browse/report-usage-details"
import { NotAvailable, ValueOrNotAvailable } from "@/components/shared/not-available"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatConcentration } from "@/lib/format"
import { antibodyHref, conditionHref, markerHref, profileHref } from "@/lib/routes"
import type { ReportUsage } from "@/models/experimental-report"
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react"
import Link from "next/link"
import { Fragment, useState } from "react"

export interface ReportUsagesTableProps {
  data: ReportUsage[]
  lead: "antibody" | "marker"
  actions?: (usage: ReportUsage) => React.ReactNode
}

function stopPropagation(event: React.MouseEvent) {
  event.stopPropagation()
}

function AntibodyLeadCell({ usage }: { usage: ReportUsage }) {
  const href = antibodyHref(usage.antibodyId)
  return (
    <div className="flex flex-col">
      <span className="font-medium">
        {usage.antibodyVendor}
        {usage.clone ? <span className="font-normal text-muted-foreground"> ({usage.clone})</span> : null}
      </span>
      {href ? (
        <Link
          href={href}
          className="w-fit text-xs text-muted-foreground hover:text-primary hover:underline"
          onClick={stopPropagation}
        >
          {usage.antibodyId}
        </Link>
      ) : (
        <span className="text-xs text-muted-foreground">No RRID</span>
      )}
    </div>
  )
}

function MarkerLeadCell({ usage }: { usage: ReportUsage }) {
  if (usage.markerName && usage.proteinId) {
    return (
      <Link
        href={markerHref(usage.proteinId)}
        className="font-medium text-primary hover:underline"
        onClick={stopPropagation}
      >
        {usage.markerName}
      </Link>
    )
  }
  return <span className="font-medium">{usage.markerName ?? "Unknown"}</span>
}

function WorkingAmount({ usage }: { usage: ReportUsage }) {
  if (!usage.dilution && usage.concentrationUgPerMl === null) return <NotAvailable />
  return (
    <div className="flex flex-col">
      {usage.dilution && <span>{usage.dilution}</span>}
      {usage.concentrationUgPerMl !== null && (
        <span className="text-muted-foreground">{formatConcentration(usage.concentrationUgPerMl)}</span>
      )}
    </div>
  )
}

export function ReportUsagesTable({ data, lead, actions }: ReportUsagesTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (data.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        No experimental usage reports available for this {lead === "antibody" ? "marker" : "antibody"}.
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-8 w-[30px] py-1"></TableHead>
            <TableHead className="h-8 py-1 text-xs">{lead === "antibody" ? "Antibody" : "Marker"}</TableHead>
            <TableHead className="h-8 py-1 text-xs">Method</TableHead>
            <TableHead className="h-8 py-1 text-xs">Sample</TableHead>
            <TableHead className="h-8 py-1 text-xs">Dilution</TableHead>
            <TableHead className="h-8 py-1 text-xs">Verdict</TableHead>
            <TableHead className="h-8 py-1 text-xs">Submitter</TableHead>
            <TableHead className="h-8 py-1 text-xs"></TableHead>
            {actions && <TableHead className="h-8 py-1 text-xs"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((usage) => {
            const expanded = expandedRows.has(usage.id)
            return (
              <Fragment key={usage.id}>
                <TableRow className="cursor-pointer text-xs hover:bg-muted/50" onClick={() => toggleRow(usage.id)}>
                  <TableCell className="py-1.5 pl-2 pr-0">
                    <button
                      type="button"
                      aria-expanded={expanded}
                      className="flex items-center rounded-sm p-0.5 text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleRow(usage.id)
                      }}
                    >
                      {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                      <span className="sr-only">{expanded ? "Hide report details" : "Show report details"}</span>
                    </button>
                  </TableCell>
                  <TableCell className="py-1.5">
                    {lead === "antibody" ? <AntibodyLeadCell usage={usage} /> : <MarkerLeadCell usage={usage} />}
                  </TableCell>
                  <TableCell className="py-1.5">
                    <div className="flex flex-col">
                      <span className="font-medium" title={usage.method}>
                        {usage.method}
                      </span>
                      {usage.fluorophore && <span className="text-xs text-muted-foreground">{usage.fluorophore}</span>}
                      {usage.metalTag && <span className="text-xs text-muted-foreground">{usage.metalTag}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="py-1.5">
                    <div className="flex flex-col">
                      <span className="font-medium">{usage.species}</span>
                      <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        <ValueOrNotAvailable value={usage.tissueLabel} />
                        <ValueOrNotAvailable value={usage.preservation} />
                      </span>
                      {usage.conditionId && (
                        <Link
                          href={conditionHref(usage.conditionId)}
                          className="w-fit text-xs text-primary hover:underline"
                          onClick={stopPropagation}
                        >
                          {usage.conditionLabel}
                        </Link>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-1.5">
                    <WorkingAmount usage={usage} />
                  </TableCell>
                  <TableCell className="py-1.5">
                    <RecommendationBadge recommendation={usage.recommendation} className="text-xs" />
                  </TableCell>
                  <TableCell className="py-1.5">
                    <div className="flex flex-col">
                      {usage.submitterId ? (
                        <Link
                          href={profileHref(usage.submitterId)}
                          className="hover:text-primary hover:underline"
                          onClick={stopPropagation}
                        >
                          {usage.submitter}
                        </Link>
                      ) : (
                        <span>{usage.submitter}</span>
                      )}
                      {usage.submitterInstitution && (
                        <span className="text-xs text-muted-foreground">{usage.submitterInstitution}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-1.5">
                    <Link
                      href={`/report/${usage.id}`}
                      className="text-muted-foreground hover:text-primary"
                      onClick={stopPropagation}
                    >
                      <ExternalLink className="size-3.5" />
                      <span className="sr-only">View full report</span>
                    </Link>
                  </TableCell>
                  {actions && (
                    <TableCell className="py-1.5" onClick={stopPropagation}>
                      {actions(usage)}
                    </TableCell>
                  )}
                </TableRow>
                {expanded && (
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableCell colSpan={actions ? 9 : 8} className="p-0 whitespace-normal">
                      <ReportUsageDetails usage={usage} lead={lead} />
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
