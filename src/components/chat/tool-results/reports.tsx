"use client"

import { Badge } from "@/components/ui/badge"
import { antibodyHref } from "@/lib/routes"
import type { EvidenceReport } from "@/models/evidence"
import { Check, FlaskConical, Sparkles, X } from "lucide-react"
import Link from "next/link"
import { joinPresent, OrEmpty, pct, RowStack, ToolAccordion } from "./primitives"

interface FindReportsOutput {
  count?: number
  reports?: EvidenceReport[]
}

interface AggregateReportsOutput {
  groups?: {
    key: string
    label: string
    count: number
    recommendedCount: number
    withCaveatsCount: number
    notRecommendedCount: number
    usableRate: number
    validatedCount: number
    topIssues: { label: string; count: number }[]
  }[]
}

function RecommendationIcon({ recommendation }: { recommendation: EvidenceReport["recommendation"] }) {
  if (recommendation === "RECOMMENDED") return <Check className="size-3 shrink-0 text-success" />
  if (recommendation === "WITH_CAVEATS") return <Check className="size-3 shrink-0 text-warning" />
  if (recommendation === "NOT_RECOMMENDED") return <X className="size-3 shrink-0 text-destructive" />
  return null
}

function ReportRow({ report }: { report: EvidenceReport }) {
  const ab = report.antibody
  const href = antibodyHref(ab?.rrid ?? null)
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      <RecommendationIcon recommendation={report.recommendation} />
      <Link href={report.reportUrl} className="shrink-0 font-medium text-primary hover:underline">
        #{report.id.slice(0, 6)}
      </Link>
      {ab &&
        (href ? (
          <Link href={href} className="truncate text-primary hover:underline">
            {ab.name}
          </Link>
        ) : (
          <span className="truncate text-muted-foreground">{ab.name}</span>
        ))}
      {report.method && (
        <Badge variant="secondary" className="h-4 shrink-0 px-1 text-[10px] font-normal" title={report.method}>
          {report.method}
        </Badge>
      )}
      <span className="ml-auto shrink-0 truncate text-[10px] text-muted-foreground">
        {joinPresent([report.species, report.tissue])}
      </span>
    </div>
  )
}

export function ReportList({ reports, max = 6 }: { reports: EvidenceReport[]; max?: number }) {
  return (
    <RowStack>
      {reports.slice(0, max).map((r) => (
        <ReportRow key={r.id} report={r} />
      ))}
      {reports.length > max && (
        <p className="text-[10px] text-muted-foreground">+{reports.length - max} more reports</p>
      )}
    </RowStack>
  )
}

export function FindReportsCard({ output }: { output: FindReportsOutput }) {
  const reports = output.reports ?? []
  return (
    <ToolAccordion icon={FlaskConical} title="Reports" count={output.count ?? reports.length}>
      <OrEmpty count={reports.length} empty="No reports matched these filters.">
        <ReportList reports={reports} max={8} />
      </OrEmpty>
    </ToolAccordion>
  )
}

export function AggregateReportsCard({ output }: { output: AggregateReportsOutput }) {
  const groups = output.groups ?? []
  return (
    <ToolAccordion icon={Sparkles} title="Ranked reports" count={groups.length}>
      <OrEmpty count={groups.length} empty="Nothing to aggregate.">
        <RowStack>
          {groups.map((g) => (
            <div key={g.key} className="flex items-center gap-2 rounded-md border bg-popover px-2 py-1 text-[11px]">
              <span className="min-w-0 flex-1 truncate font-medium">{g.label}</span>
              <span className="shrink-0 text-muted-foreground">{g.count}×</span>
              <Badge variant="secondary" className="h-4 shrink-0 px-1 text-[10px] font-normal">
                {pct(g.usableRate)} usable
              </Badge>
              <span className="shrink-0 text-[10px] text-muted-foreground">{g.recommendedCount} recommended</span>
              {g.validatedCount > 0 && (
                <span className="shrink-0 text-[10px] text-muted-foreground">{g.validatedCount} with controls</span>
              )}
            </div>
          ))}
        </RowStack>
      </OrEmpty>
    </ToolAccordion>
  )
}
