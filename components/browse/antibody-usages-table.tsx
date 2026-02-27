"use client"

import { AddToPanelButton } from "@/components/panel/add-to-panel-button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { ReportUsage } from "@/models/experimental-report"
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react"
import Link from "next/link"
import { Fragment, useState } from "react"

interface AntibodyUsagesTableProps {
  data: ReportUsage[]
}

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

function QualityBadge({ label }: { label: string | null }) {
  if (!label) return null
  const styles: Record<string, string> = {
    EXCELLENT: "bg-green-100 text-green-700",
    GOOD: "bg-blue-100 text-blue-700",
    MODERATE: "bg-amber-100 text-amber-700",
    POOR: "bg-red-100 text-red-700",
    HIGH: "bg-green-100 text-green-700",
    LOW: "bg-red-100 text-red-700",
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${styles[label] ?? "bg-zinc-100 text-zinc-700"}`}
    >
      {label.charAt(0) + label.slice(1).toLowerCase()}
    </span>
  )
}

function ReportTooltipContent({ usage }: { usage: ReportUsage }) {
  return (
    <div className="space-y-1.5 text-xs max-w-[280px]">
      <div className="font-semibold">{usage.markerName ?? "Unknown marker"}</div>
      <div className="grid grid-cols-[80px_1fr] gap-x-2 gap-y-0.5">
        <span className="text-muted-foreground">Method:</span>
        <span>{usage.method}</span>
        <span className="text-muted-foreground">Species:</span>
        <span>{usage.species}</span>
        <span className="text-muted-foreground">Tissue:</span>
        <span>{usage.tissueType}</span>
        <span className="text-muted-foreground">Fixation:</span>
        <span>{usage.fixation}</span>
        {usage.fluorophore && (
          <>
            <span className="text-muted-foreground">Fluorophore:</span>
            <span>{usage.fluorophore}</span>
          </>
        )}
        {usage.metalTag && (
          <>
            <span className="text-muted-foreground">Metal Tag:</span>
            <span>{usage.metalTag}</span>
          </>
        )}
        <span className="text-muted-foreground">Signal:</span>
        <span>{usage.signalQuality ?? "N/A"}</span>
        <span className="text-muted-foreground">Specificity:</span>
        <span>{usage.specificity ?? "N/A"}</span>
      </div>
      <div className="text-[10px] text-muted-foreground pt-1 border-t">
        {usage.submitter} {usage.submitterInstitution ? `(${usage.submitterInstitution})` : ""}
      </div>
    </div>
  )
}

export function AntibodyUsagesTable({ data }: AntibodyUsagesTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  if (data.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        No experimental usage reports available for this antibody.
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[30px] h-8 py-1"></TableHead>
              <TableHead className="h-8 py-1 text-xs">Marker</TableHead>
              <TableHead className="h-8 py-1 text-xs">Method</TableHead>
              <TableHead className="h-8 py-1 text-xs">Sample</TableHead>
              <TableHead className="h-8 py-1 text-xs">Dilution</TableHead>
              <TableHead className="h-8 py-1 text-xs">Result</TableHead>
              <TableHead className="h-8 py-1 text-xs">Submitter</TableHead>
              <TableHead className="h-8 py-1 text-xs"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((usage) => (
              <Fragment key={usage.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TableRow className="text-xs cursor-pointer hover:bg-muted/50" onClick={() => toggleRow(usage.id)}>
                      <TableCell className="py-1.5 pl-2 pr-0">
                        {expandedRows.has(usage.id) ? (
                          <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="py-1.5">
                        {usage.markerName && usage.proteinId ? (
                          <Link
                            href={`/marker/${usage.proteinId}`}
                            className="font-medium hover:underline text-primary"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {usage.markerName}
                          </Link>
                        ) : (
                          <span className="font-medium">{usage.markerName ?? "Unknown"}</span>
                        )}
                      </TableCell>
                      <TableCell className="py-1.5">
                        <div className="flex flex-col">
                          <span className="font-medium">{usage.method}</span>
                          {usage.fluorophore && (
                            <span className="text-[10px] text-muted-foreground">{usage.fluorophore}</span>
                          )}
                          {usage.metalTag && (
                            <span className="text-[10px] text-muted-foreground">{usage.metalTag}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <div className="flex flex-col">
                          <span className="font-medium">{usage.species}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {usage.tissueType} &middot; {usage.fixation}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-1.5">{usage.dilution}</TableCell>
                      <TableCell className="py-1.5">
                        <div className="flex flex-col gap-0.5">
                          <WorksBadge works={usage.works} />
                          <div className="flex gap-1">
                            <QualityBadge label={usage.signalQuality} />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-1.5">
                        {usage.submitterId ? (
                          <Link
                            href={`/profile/${usage.submitterId}`}
                            className="hover:underline hover:text-primary"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {usage.submitter}
                          </Link>
                        ) : (
                          usage.submitter
                        )}
                      </TableCell>
                      <TableCell className="py-1.5">
                        <Link
                          href={`/report/${usage.id}`}
                          className="text-muted-foreground hover:text-primary"
                          onClick={(e) => e.stopPropagation()}
                          title="View full report"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="p-3">
                    <ReportTooltipContent usage={usage} />
                  </TooltipContent>
                </Tooltip>
                {expandedRows.has(usage.id) && (
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableCell colSpan={8} className="p-0">
                      <div className="p-4 space-y-3 text-xs">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <span className="text-muted-foreground block">Clone</span>
                            <span className="font-medium">{usage.clone}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Catalog #</span>
                            <span className="font-medium">{usage.catalogNumber ?? "N/A"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Host Species</span>
                            <span className="font-medium">{usage.hostSpecies ?? "N/A"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Conjugate</span>
                            <span className="font-medium">
                              {usage.conjugate ?? usage.fluorophore ?? usage.metalTag ?? "N/A"}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <span className="text-muted-foreground block">Fixation</span>
                            <span className="font-medium">{usage.fixation}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Antigen Retrieval</span>
                            <span className="font-medium">{usage.antigenRetrieval}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Signal Quality</span>
                            <QualityBadge label={usage.signalQuality} />
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Specificity</span>
                            <QualityBadge label={usage.specificity} />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {usage.cycleNumber !== null && (
                            <div>
                              <span className="text-muted-foreground block">Cycle</span>
                              <span className="font-medium">{usage.cycleNumber}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-muted-foreground block">Cell Type</span>
                            {usage.cellTypeId ? (
                              <Link
                                href={`/celltype/${usage.cellTypeId}`}
                                className="text-primary hover:underline font-medium"
                              >
                                {usage.cellTypeLabel}
                              </Link>
                            ) : (
                              <span className="font-medium">N/A</span>
                            )}
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Structure</span>
                            <span className="font-medium">{usage.structureLabel ?? "N/A"}</span>
                          </div>
                        </div>

                        {usage.notes && (
                          <div className="pt-2 border-t">
                            <span className="text-muted-foreground block mb-1">Notes</span>
                            <p className="text-muted-foreground italic">{usage.notes}</p>
                          </div>
                        )}

                        <div className="pt-2 border-t flex items-center justify-between">
                          <Link
                            href={`/report/${usage.id}`}
                            className="text-primary hover:underline text-xs font-medium"
                          >
                            View full report
                          </Link>
                          {usage.antibodyDbId && (
                            <AddToPanelButton
                              antibodyId={usage.antibodyDbId}
                              proteinId={usage.proteinId ?? undefined}
                              label={usage.markerName ?? usage.clone}
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                            />
                          )}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  )
}
