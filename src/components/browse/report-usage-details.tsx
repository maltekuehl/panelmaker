"use client"

import { IssueBadges, ValidationList } from "@/components/browse/report-badges"
import { AddToPanelButton } from "@/components/panel/add-to-panel-button"
import { NotAvailable, ValueOrNotAvailable } from "@/components/shared/not-available"
import { antibodyHref, cellTypeHref, conditionHref } from "@/lib/routes"
import type { ReportUsage } from "@/models/experimental-report"
import Link from "next/link"

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="block text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}

function TextDetail({ label, value }: { label: string; value: string | null }) {
  return (
    <DetailField label={label}>
      <ValueOrNotAvailable value={value} className="font-medium" />
    </DetailField>
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

export function ReportUsageDetails({ usage, lead }: { usage: ReportUsage; lead: "antibody" | "marker" }) {
  return (
    <div className="space-y-3 p-4 text-xs">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {lead === "antibody" && (
          <DetailField label="Antibody">
            <AntibodyDetailLink usage={usage} />
          </DetailField>
        )}
        <TextDetail label="Clone" value={usage.clone} />
        <TextDetail label="Catalog #" value={usage.catalogNumber} />
        <TextDetail label="Host Species" value={usage.hostSpecies} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <TextDetail label="Preservation" value={usage.preservation} />
        <TextDetail label="Fixative" value={usage.fixative} />
        <TextDetail label="Antigen Retrieval" value={usage.antigenRetrieval} />
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
        <TextDetail label="Subcellular Location" value={usage.subcellularLabel} />
        <DetailField label="Condition">
          {usage.conditionId ? (
            <Link href={conditionHref(usage.conditionId)} className="font-medium text-primary hover:underline">
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
          <p className="break-words whitespace-pre-line italic text-muted-foreground">{usage.notes}</p>
        </div>
      )}

      <div className="flex items-center justify-between border-t pt-2">
        <Link href={`/report/${usage.id}`} className="text-xs font-medium text-primary hover:underline">
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
  )
}
