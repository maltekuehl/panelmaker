"use client"

import { IssueBadges, RecommendationBadge, ValidationList } from "@/components/browse/report-badges"
import { AddToPanelButton } from "@/components/panel/add-to-panel-button"
import { NotAvailable, ValueOrNotAvailable } from "@/components/shared/not-available"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatConcentration } from "@/lib/format"
import { antibodyHref, cellTypeHref, conditionHref, markerHref, profileHref } from "@/lib/routes"
import type { ReportUsage } from "@/models/experimental-report"
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react"
import Link from "next/link"
import { Fragment, useState } from "react"

export interface ReportUsagesTableProps {
  data: ReportUsage[]
  lead: "antibody" | "marker"
  actions?: (usage: ReportUsage) => React.ReactNode
}

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="block text-muted-foreground">{label}</span>
      {children}
    </div>
  )
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
          onClick={(e) => e.stopPropagation()}
        >
          {usage.antibodyId}
        </Link>
      ) : (
        <span className="text-xs text-muted-foreground">No RRID</span>
      )}
    </div>
  )
}

function AntibodyDetailLink({ usage }: { usage: ReportUsage }) {
  const href = antibodyHref(usage.antibodyId)
  if (!href) return <span className="font-medium">{usage.antibodyName}</span>
  return (
    <Link href={href} className="font-medium text-primary hover:underline">
      {usage.antibodyName}
    </Link>
  )
}

function MarkerLeadCell({ usage }: { usage: ReportUsage }) {
  if (usage.markerName && usage.proteinId) {
    return (
      <Link
        href={markerHref(usage.proteinId)}
        className="font-medium text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
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
                          onClick={(e) => e.stopPropagation()}
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
                          onClick={(e) => e.stopPropagation()}
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
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="size-3.5" />
                      <span className="sr-only">View full report</span>
                    </Link>
                  </TableCell>
                  {actions && (
                    <TableCell className="py-1.5" onClick={(e) => e.stopPropagation()}>
                      {actions(usage)}
                    </TableCell>
                  )}
                </TableRow>
                {expanded && (
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableCell colSpan={actions ? 9 : 8} className="p-0 whitespace-normal">
                      <div className="space-y-3 p-4 text-xs">
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                          {lead === "antibody" && (
                            <DetailField label="Antibody">
                              <AntibodyDetailLink usage={usage} />
                            </DetailField>
                          )}
                          <DetailField label="Clone">
                            <ValueOrNotAvailable value={usage.clone} className="font-medium" />
                          </DetailField>
                          <DetailField label="Catalog #">
                            <ValueOrNotAvailable value={usage.catalogNumber} className="font-medium" />
                          </DetailField>
                          <DetailField label="Host Species">
                            <ValueOrNotAvailable value={usage.hostSpecies} className="font-medium" />
                          </DetailField>
                        </div>

                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                          <DetailField label="Preservation">
                            <ValueOrNotAvailable value={usage.preservation} className="font-medium" />
                          </DetailField>
                          <DetailField label="Fixative">
                            <ValueOrNotAvailable value={usage.fixative} className="font-medium" />
                          </DetailField>
                          <DetailField label="Antigen Retrieval">
                            <ValueOrNotAvailable value={usage.antigenRetrieval} className="font-medium" />
                          </DetailField>
                          <DetailField label="Conjugate">
                            <span className="font-medium">
                              {usage.conjugate ?? usage.fluorophore ?? usage.metalTag ?? <NotAvailable />}
                            </span>
                          </DetailField>
                          {usage.cycleNumber !== null && (
                            <DetailField label="Cycle">
                              <span className="font-medium">{usage.cycleNumber}</span>
                            </DetailField>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                          <DetailField label="Issues">
                            <IssueBadges issues={usage.issues} />
                          </DetailField>
                          <DetailField label="Specificity controls">
                            <ValidationList validations={usage.validations} />
                          </DetailField>
                          <DetailField label="Cell Types">
                            {usage.cellTypes.length > 0 ? (
                              <span className="flex flex-wrap gap-x-1 font-medium">
                                {usage.cellTypes.map((ct, idx) => (
                                  <span key={ct.id}>
                                    <Link href={cellTypeHref(ct.id)} className="text-primary hover:underline">
                                      {ct.label}
                                    </Link>
                                    {idx < usage.cellTypes.length - 1 && ", "}
                                  </span>
                                ))}
                              </span>
                            ) : (
                              <NotAvailable />
                            )}
                          </DetailField>
                          <DetailField label="Subcellular Location">
                            <ValueOrNotAvailable value={usage.subcellularLabel} className="font-medium" />
                          </DetailField>
                          <DetailField label="Condition">
                            {usage.conditionId ? (
                              <Link
                                href={conditionHref(usage.conditionId)}
                                className="font-medium text-primary hover:underline"
                              >
                                {usage.conditionLabel}
                              </Link>
                            ) : (
                              <NotAvailable />
                            )}
                          </DetailField>
                        </div>

                        {usage.notes && (
                          <div className="border-t pt-2">
                            <span className="mb-1 block text-muted-foreground">Notes</span>
                            <p className="break-words whitespace-pre-line italic text-muted-foreground">
                              {usage.notes}
                            </p>
                          </div>
                        )}

                        <div className="flex items-center justify-between border-t pt-2">
                          <Link
                            href={`/report/${usage.id}`}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            View full report
                          </Link>
                          {usage.antibodyDbId && (
                            <AddToPanelButton
                              antibodyId={usage.antibodyDbId}
                              proteinId={usage.proteinId ?? undefined}
                              label={usage.markerName ?? usage.clone ?? usage.antibodyName}
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
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
