"use client"

import { Badge } from "@/components/ui/badge"
import { antibodyHref, markerHref } from "@/lib/routes"
import { usePanelsSignal } from "@/stores/panels"
import { Check, FlaskConical, Layers, Sparkles } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef } from "react"
import {
  CompactAddToPanelButton,
  EntityTitle,
  MetaLine,
  OrEmpty,
  pct,
  RowStack,
  ToolAccordion,
  ToolErrorRow,
  ToolRow,
} from "./primitives"

interface PanelWarning {
  type: string
  severity: "info" | "warning" | "error"
  message: string
  markers?: string[]
  cycleId?: string
}

interface AnalyzePanelOutput {
  valid?: boolean
  warnings?: PanelWarning[]
  errorCount?: number
  warningCount?: number
  error?: string
}

interface GetPanelLayoutSignalsOutput {
  signals?: {
    markerId: string
    marker: string
    likelyLabileOrPhospho: boolean
    hostSpeciesSeen: string[]
    usableReportCount: number
    totalReportCount: number
    reportedIssues: { issue: string; count: number }[]
    bestFluorophores: { fluorophore: string; usableRate: number; recommendedCount: number }[]
  }[]
}

type Recommendation =
  | { kind: "marker"; reason: string; markerId: string; label: string; sublabel: string | null }
  | {
      kind: "antibody"
      reason: string
      antibodyId: string
      rrid: string | null
      label: string
      sublabel: string | null
    }

interface RecommendForPanelOutput {
  summary?: string
  recommendations?: Recommendation[]
}

interface EditablePanel {
  id: string
  name: string
  visibility: string
  species: string | null
  cycles: {
    cycleId: string
    name: string
    sortOrder: number
    markers: { markerId: string; marker: string | null; antibody: string | null; fluorophore: string | null }[]
  }[]
}

interface ListMyPanelsOutput {
  panels?: {
    id: string
    name: string
    visibility: string
    species: string | null
    cycleCount: number
    markerCount: number
  }[]
  panel?: EditablePanel
  error?: string
}

interface PanelEditOutput {
  message?: string
  panel?: EditablePanel | null
  error?: string
}

const WARNING_CLASS: Record<PanelWarning["severity"], string> = {
  error: "text-[11px] text-destructive",
  warning: "text-[11px] text-warning",
  info: "text-[11px] text-muted-foreground",
}

export function AnalyzePanelCard({ output }: { output: AnalyzePanelOutput }) {
  if (output.error) {
    return <ToolErrorRow>{output.error}</ToolErrorRow>
  }
  const warnings = output.warnings ?? []
  return (
    <ToolAccordion
      icon={FlaskConical}
      title={`Panel check: ${output.valid ? "valid" : `${output.errorCount ?? 0} issue(s)`}`}
      count={output.warningCount}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
        <span className={output.valid ? "font-medium text-success" : "font-medium text-destructive"}>
          {output.valid ? "Valid" : "Invalid"}
        </span>
        <span className="text-muted-foreground">
          <span className="font-medium text-destructive">{output.errorCount ?? 0}</span> errors
        </span>
        <span className="text-muted-foreground">
          <span className="font-medium text-warning">{output.warningCount ?? 0}</span> warnings
        </span>
      </div>
      {warnings.length > 0 && (
        <div className="mt-1.5 space-y-1">
          {warnings.map((w, i) => (
            <p key={i} className={WARNING_CLASS[w.severity] ?? WARNING_CLASS.info}>
              {w.message}
              {w.markers && w.markers.length > 0 && (
                <span className="text-muted-foreground"> ({w.markers.join(", ")})</span>
              )}
            </p>
          ))}
        </div>
      )}
    </ToolAccordion>
  )
}

export function GetPanelLayoutSignalsCard({ output }: { output: GetPanelLayoutSignalsOutput }) {
  const signals = output.signals ?? []
  return (
    <ToolAccordion icon={Sparkles} title="Layout signals" count={signals.length}>
      <OrEmpty count={signals.length} empty="No signals.">
        <div className="space-y-1.5">
          {signals.map((s) => (
            <ToolRow key={s.markerId}>
              <div className="flex items-center gap-1.5">
                <Link href={markerHref(s.markerId)} className="text-xs font-semibold text-primary hover:underline">
                  {s.marker}
                </Link>
                {s.likelyLabileOrPhospho && (
                  <Badge variant="secondary" className="h-4 px-1 text-[10px] font-normal">
                    labile/phospho
                  </Badge>
                )}
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {s.usableReportCount}/{s.totalReportCount} usable
                </span>
              </div>
              {s.hostSpeciesSeen.length > 0 && <MetaLine>Hosts: {s.hostSpeciesSeen.join(", ")}</MetaLine>}
              {s.reportedIssues.length > 0 && (
                <MetaLine>Issues: {s.reportedIssues.map((i) => `${i.issue} (${i.count})`).join(", ")}</MetaLine>
              )}
              {s.bestFluorophores.length > 0 && (
                <MetaLine>
                  Best: {s.bestFluorophores.map((f) => `${f.fluorophore} (${pct(f.usableRate)})`).join(", ")}
                </MetaLine>
              )}
            </ToolRow>
          ))}
        </div>
      </OrEmpty>
    </ToolAccordion>
  )
}

function RecommendationRow({ rec }: { rec: Recommendation }) {
  const href = rec.kind === "marker" ? markerHref(rec.markerId) : antibodyHref(rec.rrid)
  return (
    <div className="flex items-start justify-between gap-2 rounded-md border bg-popover p-2.5">
      <div className="min-w-0 flex-1">
        <EntityTitle href={href}>{rec.label}</EntityTitle>
        {rec.sublabel && <p className="text-[10px] text-muted-foreground">{rec.sublabel}</p>}
        {rec.reason && <p className="text-[10px] text-muted-foreground">{rec.reason}</p>}
      </div>
      {rec.kind === "marker" ? (
        <CompactAddToPanelButton proteinId={rec.markerId} label={rec.label} />
      ) : (
        <CompactAddToPanelButton antibodyId={rec.antibodyId} label={rec.label} />
      )}
    </div>
  )
}

export function RecommendForPanelCard({ output }: { output: RecommendForPanelOutput }) {
  const recommendations = output.recommendations ?? []
  return (
    <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        <Sparkles className="size-3.5 shrink-0 text-primary" />
        <span className="text-[10px] font-medium uppercase tracking-wide text-primary">Recommended for your panel</span>
      </div>
      {output.summary && <p className="text-xs text-muted-foreground">{output.summary}</p>}
      <OrEmpty count={recommendations.length} empty="No recommendation.">
        <RowStack>
          {recommendations.map((rec, i) => (
            <RecommendationRow key={i} rec={rec} />
          ))}
        </RowStack>
      </OrEmpty>
    </div>
  )
}

function EditablePanelCard({ panel }: { panel: EditablePanel }) {
  return (
    <ToolAccordion icon={Layers} title={panel.name} count={panel.cycles.length}>
      <OrEmpty count={panel.cycles.length} empty="No cycles yet.">
        <div className="space-y-1.5">
          {panel.cycles.map((c) => (
            <ToolRow key={c.cycleId}>
              <p className="text-[11px] font-medium text-foreground">
                {c.name} <span className="text-muted-foreground">({c.markers.length})</span>
              </p>
              {c.markers.length > 0 && (
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {c.markers.map((m) => m.marker ?? m.antibody ?? "marker").join(", ")}
                </p>
              )}
            </ToolRow>
          ))}
        </div>
      </OrEmpty>
    </ToolAccordion>
  )
}

export function ListMyPanelsCard({ output }: { output: ListMyPanelsOutput }) {
  if (output.error) {
    return <ToolErrorRow>{output.error}</ToolErrorRow>
  }
  if (output.panel) {
    return <EditablePanelCard panel={output.panel} />
  }
  const panels = output.panels ?? []
  return (
    <ToolAccordion icon={Layers} title="Your panels" count={panels.length}>
      <OrEmpty count={panels.length} empty="You have no editable panels yet.">
        <RowStack>
          {panels.map((p) => (
            <ToolRow key={p.id} className="flex items-center justify-between gap-2">
              <Link
                href={`/panel/${p.id}`}
                className="min-w-0 flex-1 truncate text-xs font-medium text-primary hover:underline"
              >
                {p.name}
              </Link>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {p.cycleCount} cycles, {p.markerCount} markers
              </span>
            </ToolRow>
          ))}
        </RowStack>
      </OrEmpty>
    </ToolAccordion>
  )
}

export function PanelEditCard({ output }: { output: PanelEditOutput }) {
  const notifyPanelsChanged = usePanelsSignal((s) => s.notifyPanelsChanged)
  const notified = useRef(false)
  const success = !output.error && (output.message != null || output.panel != null)
  useEffect(() => {
    if (success && !notified.current) {
      notified.current = true
      notifyPanelsChanged()
    }
  }, [success, notifyPanelsChanged])

  if (output.error) {
    return <ToolErrorRow>{output.error}</ToolErrorRow>
  }
  return (
    <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-2">
      <Check className="size-3.5 shrink-0 text-primary" />
      <span className="min-w-0 flex-1 truncate text-xs text-foreground">{output.message ?? "Panel updated."}</span>
      {output.panel && (
        <Link href={`/panel/${output.panel.id}`} className="shrink-0 text-[10px] text-primary hover:underline">
          View panel
        </Link>
      )}
    </div>
  )
}
