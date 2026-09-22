"use client"

import { AddToPanelButton } from "@/components/panel/add-to-panel-button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import type { createChatTools } from "@/lib/chat-tools"
import { antibodyHref, cellTypeHref, markerHref } from "@/lib/routes"
import type { EvidenceReport } from "@/models/evidence"
import { usePanelsSignal } from "@/stores/panels"
import type { DynamicToolUIPart, ToolUIPart } from "ai"
import {
  Beaker,
  Building2,
  Check,
  FlaskConical,
  Layers,
  Loader2,
  Search,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { createContext, useContext, useEffect, useRef } from "react"

// The tool input (query) for the result currently being rendered, so ToolAccordion can offer a
// collapsible JSON view of it without every card having to thread the prop through.
const ToolQueryContext = createContext<Record<string, unknown> | null>(null)

type ToolPart = ToolUIPart | DynamicToolUIPart

type ToolName = keyof ReturnType<typeof createChatTools>

interface ResolveMarkersOutput {
  markers?: { id: string; label: string; geneSymbol: string | null }[]
}

interface ResolveAntibodiesOutput {
  antibodies?: {
    id: string
    name: string
    rrid: string | null
    targetName: string | null
    clonality: string | null
    host: string | null
    vendor: string | null
  }[]
}

interface ResolveCellTypesOutput {
  matches?: { id: string; label: string }[]
  expandedIds?: string[]
}

interface ChipOutput {
  species?: { id: string; label: string }[]
  tissues?: { id: string; label: string }[]
}

interface GetMarkerDetailsOutput {
  marker?: { id: string; label: string; geneSymbol: string | null }
  reportCount?: number
  reports?: EvidenceReport[]
  error?: string
}

interface GetAntibodyDetailsOutput {
  antibody?: {
    id: string
    name: string
    rrid: string | null
    cloneId: string | null
    clonality: string | null
    host: string | null
    vendor: string | null
    conjugate: string | null
    targetName: string | null
  }
  reportCount?: number
  reports?: EvidenceReport[]
  error?: string
}

interface FindReportsOutput {
  count?: number
  reports?: EvidenceReport[]
}

interface AggregateReportsOutput {
  groups?: {
    key: string
    label: string
    count: number
    worksCount: number
    worksRate: number
    strongSignalCount: number
  }[]
}

interface ListMyLabsOutput {
  labs?: {
    id: string
    name: string
    slug: string
    role: string
    memberCount: number
    inventoryCount: number
  }[]
}

interface GetLabInventoryOutput {
  count?: number
  items?: {
    id: string
    status: string
    aliquotsRemaining: number | null
    storageLocation: string | null
    markerId: string | null
    marker: string | null
    antibody: string
    rrid: string | null
    clonality: string | null
    host: string | null
    addedBy: string | null
  }[]
}

interface GetLabPanelsOutput {
  panels?: {
    id: string
    name: string
    owner: string | null
    visibility: string
    species: string | null
    markerCount: number
    markers: { marker: string | null }[]
  }[]
  error?: string
}

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
    workedReportCount: number
    totalReportCount: number
    bestFluorophores: { fluorophore: string; worksRate: number; strongSignalCount: number }[]
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

const TOOL_LABELS: Record<ToolName, string> = {
  resolveMarkers: "Searching markers...",
  resolveCellTypes: "Resolving cell types...",
  resolveSpecies: "Resolving species...",
  resolveTissues: "Resolving tissues...",
  resolveAntibodies: "Searching antibodies...",
  getMarkerDetails: "Loading marker details...",
  getAntibodyDetails: "Loading antibody details...",
  findReports: "Finding reports...",
  aggregateReports: "Aggregating reports...",
  listMyLabs: "Loading labs...",
  getLabInventory: "Loading inventory...",
  getLabPanels: "Loading panels...",
  analyzePanel: "Analyzing panel...",
  getPanelLayoutSignals: "Gathering layout signals...",
  recommendForPanel: "Preparing recommendation...",
  resolveFluorophores: "Resolving fluorophores...",
  resolveImagingMethods: "Loading imaging methods...",
  listMyPanels: "Loading your panels...",
  createPanel: "Creating panel...",
  addCycle: "Adding cycle...",
  deleteCycle: "Deleting cycle...",
  addAntibodyToCycle: "Adding marker...",
  moveMarker: "Moving marker...",
  removeMarker: "Removing marker...",
}

function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`
}

// The tool cards all use the same tight "Add to panel" affordance.
function CompactAddToPanelButton(props: {
  proteinId?: string
  geneSymbol?: string
  antibodyId?: string
  label: string
}) {
  return (
    <AddToPanelButton {...props} variant="outline" size="sm" className="h-6 shrink-0 px-1.5 text-[10px]" iconOnly />
  )
}

// One presentation for every tool failure, so "not visible to you" never reads as "no results".
function ToolErrorRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-2.5 py-2">
      <X className="size-3.5 shrink-0 text-destructive" />
      <span className="min-w-0 flex-1 text-xs text-destructive">{children}</span>
    </div>
  )
}

function ToolAccordion({
  icon,
  title,
  count,
  mono = false,
  children,
}: {
  icon: LucideIcon
  title: string
  count?: number
  mono?: boolean
  children: React.ReactNode
}) {
  const Icon = icon
  const query = useContext(ToolQueryContext)
  const hasQuery = query !== null && Object.keys(query).length > 0
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="tool" className="border-b-0">
        <AccordionTrigger className="items-center gap-2 px-3 py-2.5">
          <span className="flex min-w-0 flex-1 items-center gap-1.5">
            <Icon className="size-3.5 shrink-0 text-primary" />
            <span
              className={
                mono
                  ? "truncate font-mono text-xs font-medium text-foreground"
                  : "truncate text-xs font-medium text-foreground"
              }
            >
              {title}
            </span>
            {count !== undefined && (
              <Badge variant="secondary" className="h-4 shrink-0 px-1 text-[10px]">
                {count}
              </Badge>
            )}
          </span>
        </AccordionTrigger>
        <AccordionContent className="h-auto! pt-0 pb-2">
          <div className="max-h-72 space-y-1 overflow-y-auto pr-1 pb-1">{children}</div>
          {hasQuery && (
            <details className="mt-1.5 border-t pt-1.5">
              <summary className="cursor-pointer list-none text-[10px] font-medium tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground">
                Query
              </summary>
              <pre className="mt-1 max-h-48 overflow-auto rounded-md border bg-popover p-2 text-xs whitespace-pre">
                {JSON.stringify(query, null, 2)}
              </pre>
            </details>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] text-muted-foreground">{children}</p>
}

function LoadingCard({ toolName }: { toolName: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-2.5 py-2">
      <Loader2 className="size-3 shrink-0 animate-spin text-primary" />
      <span className="text-xs text-muted-foreground">
        {toolName in TOOL_LABELS ? TOOL_LABELS[toolName as ToolName] : `Running ${toolName}...`}
      </span>
    </div>
  )
}

function ReportRow({ report }: { report: EvidenceReport }) {
  const ab = report.antibody
  const href = antibodyHref(ab?.rrid ?? null)
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      {report.works === true ? (
        <Check className="size-3 shrink-0 text-success" />
      ) : report.works === false ? (
        <X className="size-3 shrink-0 text-muted-foreground" />
      ) : null}
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
      {report.methodShort && (
        <Badge
          variant="secondary"
          className="h-4 shrink-0 px-1 text-[10px] font-normal"
          title={report.method ?? undefined}
        >
          {report.methodShort}
        </Badge>
      )}
      <span className="ml-auto shrink-0 truncate text-[10px] text-muted-foreground">
        {[report.species, report.tissue].filter(Boolean).join(", ")}
      </span>
    </div>
  )
}

function ReportList({ reports, max = 6 }: { reports: EvidenceReport[]; max?: number }) {
  return (
    <div className="space-y-1">
      {reports.slice(0, max).map((r) => (
        <ReportRow key={r.id} report={r} />
      ))}
      {reports.length > max && (
        <p className="text-[10px] text-muted-foreground">+{reports.length - max} more reports</p>
      )}
    </div>
  )
}

function ResolveMarkersCard({ output }: { output: ResolveMarkersOutput }) {
  const markers = output.markers ?? []
  return (
    <ToolAccordion icon={Search} title="Markers" count={markers.length}>
      {markers.length === 0 ? (
        <EmptyRow>No markers matched.</EmptyRow>
      ) : (
        <div className="space-y-1">
          {markers.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between gap-2 rounded-md border bg-popover px-2 py-1.5"
            >
              <div className="min-w-0 flex-1">
                <Link href={markerHref(m.id)} className="block truncate text-xs font-semibold hover:text-primary">
                  {m.label}
                </Link>
                {m.geneSymbol && <p className="text-[10px] text-muted-foreground">{m.geneSymbol}</p>}
              </div>
              <CompactAddToPanelButton
                proteinId={m.id}
                geneSymbol={m.geneSymbol ?? undefined}
                label={m.geneSymbol ?? m.label}
              />
            </div>
          ))}
        </div>
      )}
    </ToolAccordion>
  )
}

function ResolveAntibodiesCard({ output }: { output: ResolveAntibodiesOutput }) {
  const antibodies = output.antibodies ?? []
  return (
    <ToolAccordion icon={Search} title="Antibodies" count={antibodies.length}>
      {antibodies.length === 0 ? (
        <EmptyRow>No antibodies matched.</EmptyRow>
      ) : (
        <div className="space-y-1">
          {antibodies.map((a) => {
            const href = antibodyHref(a.rrid)
            return (
              <div
                key={a.id}
                className="flex items-start justify-between gap-2 rounded-md border bg-popover px-2 py-1.5"
              >
                <div className="min-w-0 flex-1">
                  {href ? (
                    <Link href={href} className="block truncate text-xs font-semibold hover:text-primary">
                      {a.name}
                    </Link>
                  ) : (
                    <p className="truncate text-xs font-semibold">{a.name}</p>
                  )}
                  <p className="truncate text-[10px] text-muted-foreground">
                    {[a.rrid, a.vendor, a.host, a.clonality].filter(Boolean).join(", ")}
                  </p>
                  {a.targetName && <p className="truncate text-[10px] text-muted-foreground">Target: {a.targetName}</p>}
                </div>
                <CompactAddToPanelButton antibodyId={a.id} label={a.name} />
              </div>
            )
          })}
        </div>
      )}
    </ToolAccordion>
  )
}

function ResolveCellTypesCard({ output }: { output: ResolveCellTypesOutput }) {
  const matches = output.matches ?? []
  const expanded = output.expandedIds ?? []
  return (
    <ToolAccordion icon={Search} title="Cell types" count={matches.length}>
      {matches.length === 0 ? (
        <EmptyRow>No cell types matched.</EmptyRow>
      ) : (
        <>
          <div className="flex flex-wrap gap-1">
            {matches.map((c) => (
              <Link
                key={c.id}
                href={cellTypeHref(c.id)}
                className="rounded-md border bg-popover px-1.5 py-0.5 text-[11px] hover:text-primary"
              >
                {c.label}
              </Link>
            ))}
          </div>
          {expanded.length > matches.length && (
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              Expanded to {expanded.length} ids (incl. descendants)
            </p>
          )}
        </>
      )}
    </ToolAccordion>
  )
}

function ChipListCard({
  title,
  icon,
  items,
}: {
  title: string
  icon: LucideIcon
  items: { id: string; label: string }[]
}) {
  return (
    <ToolAccordion icon={icon} title={title} count={items.length}>
      {items.length === 0 ? (
        <EmptyRow>No matches.</EmptyRow>
      ) : (
        <div className="flex flex-wrap gap-1">
          {items.map((it) => (
            <Badge key={it.id} variant="secondary" className="h-5 px-1.5 text-[11px] font-normal">
              {it.label}
            </Badge>
          ))}
        </div>
      )}
    </ToolAccordion>
  )
}

function GetMarkerDetailsCard({ output }: { output: GetMarkerDetailsOutput }) {
  if (output.error || !output.marker) {
    return <ToolErrorRow>{output.error ?? "Marker not found."}</ToolErrorRow>
  }
  const { marker } = output
  const reports = output.reports ?? []
  return (
    <ToolAccordion icon={FlaskConical} title={`Marker: ${marker.label}`} count={output.reportCount ?? reports.length}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link href={markerHref(marker.id)} className="block truncate text-xs font-semibold hover:text-primary">
            {marker.label}
          </Link>
          {marker.geneSymbol && <p className="text-[10px] text-muted-foreground">{marker.geneSymbol}</p>}
        </div>
        <CompactAddToPanelButton
          proteinId={marker.id}
          geneSymbol={marker.geneSymbol ?? undefined}
          label={marker.geneSymbol ?? marker.label}
        />
      </div>
      {reports.length > 0 && <div className="mt-1.5">{<ReportList reports={reports} />}</div>}
    </ToolAccordion>
  )
}

function GetAntibodyDetailsCard({ output }: { output: GetAntibodyDetailsOutput }) {
  if (output.error || !output.antibody) {
    return <ToolErrorRow>{output.error ?? "Antibody not found."}</ToolErrorRow>
  }
  const ab = output.antibody
  const href = antibodyHref(ab.rrid)
  const reports = output.reports ?? []
  return (
    <ToolAccordion icon={FlaskConical} title={`Antibody: ${ab.name}`} count={output.reportCount ?? reports.length}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          {href ? (
            <Link href={href} className="block truncate text-xs font-semibold hover:text-primary">
              {ab.name}
            </Link>
          ) : (
            <p className="truncate text-xs font-semibold">{ab.name}</p>
          )}
          <p className="truncate text-[10px] text-muted-foreground">
            {[ab.rrid, ab.vendor, ab.host, ab.clonality, ab.conjugate].filter(Boolean).join(", ")}
          </p>
          {ab.targetName && <p className="truncate text-[10px] text-muted-foreground">Target: {ab.targetName}</p>}
        </div>
        <CompactAddToPanelButton antibodyId={ab.id} label={ab.name} />
      </div>
      {reports.length > 0 && <div className="mt-1.5">{<ReportList reports={reports} />}</div>}
    </ToolAccordion>
  )
}

function FindReportsCard({ output }: { output: FindReportsOutput }) {
  const reports = output.reports ?? []
  return (
    <ToolAccordion icon={FlaskConical} title="Reports" count={output.count ?? reports.length}>
      {reports.length === 0 ? (
        <EmptyRow>No reports matched these filters.</EmptyRow>
      ) : (
        <ReportList reports={reports} max={8} />
      )}
    </ToolAccordion>
  )
}

function AggregateReportsCard({ output }: { output: AggregateReportsOutput }) {
  const groups = output.groups ?? []
  return (
    <ToolAccordion icon={Sparkles} title="Ranked reports" count={groups.length}>
      {groups.length === 0 ? (
        <EmptyRow>Nothing to aggregate.</EmptyRow>
      ) : (
        <div className="space-y-1">
          {groups.map((g) => (
            <div key={g.key} className="flex items-center gap-2 rounded-md border bg-popover px-2 py-1 text-[11px]">
              <span className="min-w-0 flex-1 truncate font-medium">{g.label}</span>
              <span className="shrink-0 text-muted-foreground">{g.count}×</span>
              <Badge variant="secondary" className="h-4 shrink-0 px-1 text-[10px] font-normal">
                {pct(g.worksRate)} works
              </Badge>
              <span className="shrink-0 text-[10px] text-muted-foreground">{g.strongSignalCount} strong</span>
            </div>
          ))}
        </div>
      )}
    </ToolAccordion>
  )
}

function ListMyLabsCard({ output }: { output: ListMyLabsOutput }) {
  const labs = output.labs ?? []
  return (
    <ToolAccordion icon={Building2} title="Labs" count={labs.length}>
      {labs.length === 0 ? (
        <EmptyRow>You are not a member of any lab.</EmptyRow>
      ) : (
        <div className="space-y-1">
          {labs.map((lab) => (
            <div key={lab.id} className="flex items-center gap-2 rounded-md border bg-popover px-2 py-1.5">
              <div className="min-w-0 flex-1">
                <Link href={`/labs/${lab.slug}`} className="block truncate text-xs font-semibold hover:text-primary">
                  {lab.name}
                </Link>
                <p className="text-[10px] text-muted-foreground">
                  {[lab.role, `${lab.memberCount} members`, `${lab.inventoryCount} stocked`].join(", ")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </ToolAccordion>
  )
}

function GetLabInventoryCard({ output }: { output: GetLabInventoryOutput }) {
  const items = output.items ?? []
  return (
    <ToolAccordion icon={FlaskConical} title="Inventory" count={output.count ?? items.length}>
      {items.length === 0 ? (
        <EmptyRow>No matching inventory.</EmptyRow>
      ) : (
        <div className="space-y-1">
          {items.map((it) => {
            const href = antibodyHref(it.rrid)
            return (
              <div key={it.id} className="flex items-center gap-2 rounded-md border bg-popover px-2 py-1.5 text-[11px]">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {it.markerId ? (
                      <Link
                        href={markerHref(it.markerId)}
                        className="shrink-0 font-semibold text-primary hover:underline"
                      >
                        {it.marker ?? "Marker"}
                      </Link>
                    ) : (
                      it.marker && <span className="shrink-0 font-semibold">{it.marker}</span>
                    )}
                    {href ? (
                      <Link href={href} className="truncate text-primary hover:underline">
                        {it.antibody}
                      </Link>
                    ) : (
                      <span className="truncate text-muted-foreground">{it.antibody}</span>
                    )}
                  </div>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {[it.rrid, it.storageLocation, it.host].filter(Boolean).join(", ")}
                  </p>
                </div>
                <Badge variant="secondary" className="h-4 shrink-0 px-1 text-[10px] font-normal">
                  {it.status}
                </Badge>
                {it.aliquotsRemaining !== null && (
                  <span className="shrink-0 text-[10px] text-muted-foreground">{it.aliquotsRemaining} left</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </ToolAccordion>
  )
}

function GetLabPanelsCard({ output }: { output: GetLabPanelsOutput }) {
  if (output.error) {
    return <ToolErrorRow>{output.error}</ToolErrorRow>
  }
  const panels = output.panels ?? []
  return (
    <ToolAccordion icon={FlaskConical} title="Panels" count={panels.length}>
      {panels.length === 0 ? (
        <EmptyRow>No panels visible.</EmptyRow>
      ) : (
        <div className="space-y-1">
          {panels.map((p) => {
            const preview = p.markers
              .map((m) => m.marker)
              .filter(Boolean)
              .slice(0, 6)
              .join(", ")
            return (
              <div key={p.id} className="rounded-md border bg-popover px-2 py-1.5">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/panel/${p.id}`}
                    className="min-w-0 flex-1 truncate text-xs font-semibold hover:text-primary"
                  >
                    {p.name}
                  </Link>
                  <Badge variant="secondary" className="h-4 shrink-0 px-1 text-[10px] font-normal">
                    {p.markerCount} markers
                  </Badge>
                </div>
                <p className="truncate text-[10px] text-muted-foreground">
                  {[p.species, p.visibility.toLowerCase(), p.owner].filter(Boolean).join(", ")}
                </p>
                {preview && <p className="truncate text-[10px] text-muted-foreground">{preview}</p>}
              </div>
            )
          })}
        </div>
      )}
    </ToolAccordion>
  )
}

function AnalyzePanelCard({ output }: { output: AnalyzePanelOutput }) {
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
            <p
              key={i}
              className={
                w.severity === "error"
                  ? "text-[11px] text-destructive"
                  : w.severity === "warning"
                    ? "text-[11px] text-warning"
                    : "text-[11px] text-muted-foreground"
              }
            >
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

function GetPanelLayoutSignalsCard({ output }: { output: GetPanelLayoutSignalsOutput }) {
  const signals = output.signals ?? []
  return (
    <ToolAccordion icon={Sparkles} title="Layout signals" count={signals.length}>
      {signals.length === 0 ? (
        <EmptyRow>No signals.</EmptyRow>
      ) : (
        <div className="space-y-1.5">
          {signals.map((s) => (
            <div key={s.markerId} className="rounded-md border bg-popover px-2 py-1.5">
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
                  {s.workedReportCount}/{s.totalReportCount} worked
                </span>
              </div>
              {s.hostSpeciesSeen.length > 0 && (
                <p className="truncate text-[10px] text-muted-foreground">Hosts: {s.hostSpeciesSeen.join(", ")}</p>
              )}
              {s.bestFluorophores.length > 0 && (
                <p className="truncate text-[10px] text-muted-foreground">
                  Best: {s.bestFluorophores.map((f) => `${f.fluorophore} (${pct(f.worksRate)})`).join(", ")}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </ToolAccordion>
  )
}

function RecommendForPanelCard({ output }: { output: RecommendForPanelOutput }) {
  const recommendations = output.recommendations ?? []
  return (
    <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        <Sparkles className="size-3.5 shrink-0 text-primary" />
        <span className="text-[10px] font-medium uppercase tracking-wide text-primary">Recommended for your panel</span>
      </div>
      {output.summary && <p className="text-xs text-muted-foreground">{output.summary}</p>}
      {recommendations.length === 0 ? (
        <EmptyRow>No recommendation.</EmptyRow>
      ) : (
        <div className="space-y-1">
          {recommendations.map((rec, i) => {
            const href = rec.kind === "marker" ? markerHref(rec.markerId) : antibodyHref(rec.rrid)
            return (
              <div key={i} className="flex items-start justify-between gap-2 rounded-md border bg-popover p-2.5">
                <div className="min-w-0 flex-1">
                  {href ? (
                    <Link href={href} className="block truncate text-xs font-semibold hover:text-primary">
                      {rec.label}
                    </Link>
                  ) : (
                    <p className="truncate text-xs font-semibold">{rec.label}</p>
                  )}
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
          })}
        </div>
      )}
    </div>
  )
}

function ListMyPanelsCard({ output }: { output: ListMyPanelsOutput }) {
  if (output.error) {
    return <ToolErrorRow>{output.error}</ToolErrorRow>
  }
  if (output.panel) {
    const p = output.panel
    return (
      <ToolAccordion icon={Layers} title={p.name} count={p.cycles.length}>
        {p.cycles.length === 0 ? (
          <EmptyRow>No cycles yet.</EmptyRow>
        ) : (
          <div className="space-y-1.5">
            {p.cycles.map((c) => (
              <div key={c.cycleId} className="rounded-md border bg-popover px-2 py-1.5">
                <p className="text-[11px] font-medium text-foreground">
                  {c.name} <span className="text-muted-foreground">({c.markers.length})</span>
                </p>
                {c.markers.length > 0 && (
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {c.markers.map((m) => m.marker ?? m.antibody ?? "marker").join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </ToolAccordion>
    )
  }
  const panels = output.panels ?? []
  return (
    <ToolAccordion icon={Layers} title="Your panels" count={panels.length}>
      {panels.length === 0 ? (
        <EmptyRow>You have no editable panels yet.</EmptyRow>
      ) : (
        <div className="space-y-1">
          {panels.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-2 rounded-md border bg-popover px-2 py-1.5"
            >
              <Link
                href={`/panel/${p.id}`}
                className="min-w-0 flex-1 truncate text-xs font-medium text-primary hover:underline"
              >
                {p.name}
              </Link>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {p.cycleCount} cycles, {p.markerCount} markers
              </span>
            </div>
          ))}
        </div>
      )}
    </ToolAccordion>
  )
}

function PanelEditCard({ output }: { output: PanelEditOutput }) {
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

// Unknown tool: ToolAccordion already renders the input under "Query", so only the output is new.
function GenericFallbackCard({ toolName, output }: { toolName: string; output: Record<string, unknown> }) {
  const hasOutput = Object.keys(output).length > 0
  return (
    <ToolAccordion icon={Beaker} title={toolName} mono>
      {hasOutput ? (
        <pre className="overflow-auto rounded-md border bg-popover p-2 text-xs whitespace-pre">
          {JSON.stringify(output, null, 2)}
        </pre>
      ) : (
        <EmptyRow>No output.</EmptyRow>
      )}
    </ToolAccordion>
  )
}

export function ToolResultCard({ part }: { part: ToolPart }) {
  const toolName = part.type === "dynamic-tool" ? part.toolName : part.type.slice("tool-".length)

  // A failed execute arrives as state "output-error" with errorText; anything short of a finished
  // output is still in flight.
  if (part.state === "output-error") {
    return <ToolErrorRow>{part.errorText || `${toolName} failed.`}</ToolErrorRow>
  }
  if (part.state !== "output-available") {
    return <LoadingCard toolName={toolName} />
  }

  const input = (part.input ?? {}) as Record<string, unknown>
  const output = (part.output ?? {}) as Record<string, unknown>

  const card = (() => {
    switch (toolName) {
      case "resolveMarkers":
        return <ResolveMarkersCard output={output as ResolveMarkersOutput} />
      case "resolveAntibodies":
        return <ResolveAntibodiesCard output={output as ResolveAntibodiesOutput} />
      case "resolveCellTypes":
        return <ResolveCellTypesCard output={output as ResolveCellTypesOutput} />
      case "resolveSpecies":
        return <ChipListCard title="Species" icon={Search} items={(output as ChipOutput).species ?? []} />
      case "resolveTissues":
        return <ChipListCard title="Tissues" icon={Search} items={(output as ChipOutput).tissues ?? []} />
      case "getMarkerDetails":
        return <GetMarkerDetailsCard output={output as GetMarkerDetailsOutput} />
      case "getAntibodyDetails":
        return <GetAntibodyDetailsCard output={output as GetAntibodyDetailsOutput} />
      case "findReports":
        return <FindReportsCard output={output as FindReportsOutput} />
      case "aggregateReports":
        return <AggregateReportsCard output={output as AggregateReportsOutput} />
      case "listMyLabs":
        return <ListMyLabsCard output={output as ListMyLabsOutput} />
      case "getLabInventory":
        return <GetLabInventoryCard output={output as GetLabInventoryOutput} />
      case "getLabPanels":
        return <GetLabPanelsCard output={output as GetLabPanelsOutput} />
      case "analyzePanel":
        return <AnalyzePanelCard output={output as AnalyzePanelOutput} />
      case "getPanelLayoutSignals":
        return <GetPanelLayoutSignalsCard output={output as GetPanelLayoutSignalsOutput} />
      case "recommendForPanel":
        return <RecommendForPanelCard output={output as RecommendForPanelOutput} />
      case "resolveFluorophores":
        return (
          <ChipListCard
            title="Fluorophores"
            icon={Search}
            items={((output as { fluorophores?: { id: string; name: string }[] }).fluorophores ?? []).map((f) => ({
              id: f.id,
              label: f.name,
            }))}
          />
        )
      case "resolveImagingMethods":
        return (
          <ChipListCard
            title="Imaging methods"
            icon={Search}
            items={((output as { imagingMethods?: { id: string; label: string }[] }).imagingMethods ?? []).map((m) => ({
              id: m.id,
              label: m.label,
            }))}
          />
        )
      case "listMyPanels":
        return <ListMyPanelsCard output={output as ListMyPanelsOutput} />
      case "createPanel":
      case "addCycle":
      case "deleteCycle":
      case "addAntibodyToCycle":
      case "moveMarker":
      case "removeMarker":
        return <PanelEditCard output={output as PanelEditOutput} />
      default:
        return <GenericFallbackCard toolName={toolName || "unknown"} output={output} />
    }
  })()

  return <ToolQueryContext.Provider value={input}>{card}</ToolQueryContext.Provider>
}

export type { ToolPart }
