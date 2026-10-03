"use client"

import type { createChatTools } from "@/lib/chat-tools"
import type { DynamicToolUIPart, ToolUIPart } from "ai"
import { Beaker, Loader2, Search } from "lucide-react"
import {
  GetAntibodyDetailsCard,
  GetMarkerDetailsCard,
  ResolveAntibodiesCard,
  ResolveCellTypesCard,
  ResolveMarkersCard,
} from "./tool-results/entities"
import { GetLabInventoryCard, GetLabPanelsCard, ListMyLabsCard } from "./tool-results/labs"
import {
  AnalyzePanelCard,
  GetPanelLayoutSignalsCard,
  ListMyPanelsCard,
  PanelEditCard,
  RecommendForPanelCard,
} from "./tool-results/panels"
import { ChipListCard, EmptyRow, ToolAccordion, ToolErrorRow, ToolQueryContext } from "./tool-results/primitives"
import { AggregateReportsCard, FindReportsCard } from "./tool-results/reports"

type ToolPart = ToolUIPart | DynamicToolUIPart

type ToolName = keyof ReturnType<typeof createChatTools>

type ToolOutput = Record<string, unknown>

type Term = { id: string; label: string }

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
  listReportTerms: "Loading report terms...",
  listMyPanels: "Loading your panels...",
  createPanel: "Creating panel...",
  addCycle: "Adding cycle...",
  deleteCycle: "Deleting cycle...",
  addAntibodyToCycle: "Adding marker...",
  moveMarker: "Moving marker...",
  removeMarker: "Removing marker...",
}

function card<P>(Card: React.ComponentType<{ output: P }>) {
  return function CardRenderer(output: ToolOutput) {
    return <Card output={output as P} />
  }
}

function chips(title: string, items: (output: ToolOutput) => Term[] | undefined) {
  return function ChipRenderer(output: ToolOutput) {
    return <ChipListCard title={title} icon={Search} items={items(output) ?? []} />
  }
}

function terms(output: ToolOutput, key: string): Term[] | undefined {
  return output[key] as Term[] | undefined
}

const panelEdit = card(PanelEditCard)

const RENDERERS: Record<ToolName, (output: ToolOutput) => React.ReactNode> = {
  resolveMarkers: card(ResolveMarkersCard),
  resolveAntibodies: card(ResolveAntibodiesCard),
  resolveCellTypes: card(ResolveCellTypesCard),
  resolveSpecies: chips("Species", (output) => terms(output, "species")),
  resolveTissues: chips("Tissues", (output) => terms(output, "tissues")),
  getMarkerDetails: card(GetMarkerDetailsCard),
  getAntibodyDetails: card(GetAntibodyDetailsCard),
  findReports: card(FindReportsCard),
  aggregateReports: card(AggregateReportsCard),
  listMyLabs: card(ListMyLabsCard),
  getLabInventory: card(GetLabInventoryCard),
  getLabPanels: card(GetLabPanelsCard),
  analyzePanel: card(AnalyzePanelCard),
  getPanelLayoutSignals: card(GetPanelLayoutSignalsCard),
  recommendForPanel: card(RecommendForPanelCard),
  resolveFluorophores: chips("Fluorophores", (output) =>
    (output.fluorophores as { id: string; name: string }[] | undefined)?.map((f) => ({ id: f.id, label: f.name })),
  ),
  resolveImagingMethods: chips("Imaging methods", (output) => terms(output, "imagingMethods")),
  listReportTerms: chips("Report terms", (output) => [
    ...(terms(output, "validationMethods") ?? []),
    ...(terms(output, "stainingIssues") ?? []),
  ]),
  listMyPanels: card(ListMyPanelsCard),
  createPanel: panelEdit,
  addCycle: panelEdit,
  deleteCycle: panelEdit,
  addAntibodyToCycle: panelEdit,
  moveMarker: panelEdit,
  removeMarker: panelEdit,
}

function isToolName(name: string): name is ToolName {
  return Object.hasOwn(TOOL_LABELS, name)
}

function LoadingCard({ toolName }: { toolName: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-2.5 py-2">
      <Loader2 className="size-3 shrink-0 animate-spin text-primary" />
      <span className="text-xs text-muted-foreground">
        {isToolName(toolName) ? TOOL_LABELS[toolName] : `Running ${toolName}...`}
      </span>
    </div>
  )
}

// Unknown tool: ToolAccordion already renders the input under "Query", so only the output is new.
function GenericFallbackCard({ toolName, output }: { toolName: string; output: ToolOutput }) {
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

  const input = (part.input ?? {}) as ToolOutput
  const output = (part.output ?? {}) as ToolOutput

  return (
    <ToolQueryContext.Provider value={input}>
      {isToolName(toolName) ? (
        RENDERERS[toolName](output)
      ) : (
        <GenericFallbackCard toolName={toolName || "unknown"} output={output} />
      )}
    </ToolQueryContext.Provider>
  )
}

export type { ToolPart }
