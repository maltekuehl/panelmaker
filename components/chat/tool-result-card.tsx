"use client"

import { AddToPanelButton } from "@/components/panel/add-to-panel-button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { FlaskConical, Loader2, Search, Sparkles } from "lucide-react"
import Link from "next/link"

type ToolState = "input-available" | "output-available" | "error"

interface ToolPart {
  type: string
  toolName?: string
  input?: Record<string, unknown>
  output?: Record<string, unknown>
  state?: ToolState
}

type ProteinResult = {
  id: string
  label: string
  geneSymbol: string | null
  ensemblGeneId: string | null
}

type AntibodyResult = {
  id: number
  name: string
  rrid: string | null
  targetName: string | null
  vendorName: string | null
  clonality: string | null
  sourceOrganism: string | null
  targetSpecies: string | null
}

interface SearchMarkersOutput {
  proteins?: ProteinResult[]
  antibodies?: AntibodyResult[]
  totalProteins?: number
  totalAntibodies?: number
}

interface SuggestPanelOutput {
  suggestions?: Array<{
    antibodyId: number | null
    antibodyName: string
    antibodyRrid: string | null
    targetName: string | null
    validatedReportCount: number
    methods: string[]
    tissues: string[]
    cellTypes: string[]
  }>
  totalValidatedReports?: number
  filters?: {
    cellType?: string
    tissue?: string
    species?: string
  }
}

interface GetMarkerDetailsOutput {
  protein?: {
    id: string
    label: string
    geneSymbol: string | null
    ensemblGeneId: string | null
  }
  publishedReports?: Array<{
    id: number
    method: string | null
    species: string | null
    tissueType: string | null
    fixation: string | null
    fluorophore: string | null
    works: boolean
    signalQuality: string | null
    specificity: string | null
    antibodyId: number | undefined
    antibodyName: string | undefined
    antibodyRrid: string | undefined
    cellTypeLabel: string | undefined
    structureLabel: string | undefined
  }>
  associatedCellTypes?: Array<{
    id: string
    label: string
    parentIds: string[]
  }>
  reportCount?: number
  cellTypeCount?: number
  error?: string
}

function ProteinResultCard({ protein }: { protein: ProteinResult }) {
  return (
    <div className="flex items-start justify-between gap-2 rounded-md border bg-white p-2.5">
      <div className="min-w-0 flex-1">
        <Link
          href={`/marker/${protein.id}`}
          className="text-xs font-semibold leading-tight truncate block hover:text-primary transition-colors"
        >
          {protein.label}
        </Link>
        {protein.geneSymbol && <p className="text-[10px] text-muted-foreground mt-0.5">{protein.geneSymbol}</p>}
      </div>
      <AddToPanelButton
        proteinId={protein.id}
        label={protein.geneSymbol ?? protein.label}
        variant="outline"
        size="sm"
        className="h-6 text-[10px] px-1.5 shrink-0"
      />
    </div>
  )
}

function AntibodyResultCard({ antibody }: { antibody: AntibodyResult }) {
  return (
    <div className="flex items-start justify-between gap-2 rounded-md border bg-white p-2.5">
      <div className="min-w-0 flex-1">
        <Link
          href={`/antibody/${antibody.id}`}
          className="text-xs font-semibold leading-tight truncate block hover:text-primary transition-colors"
        >
          {antibody.name}
        </Link>
        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
          {[antibody.rrid, antibody.vendorName].filter(Boolean).join(" · ")}
        </p>
        {antibody.targetName && <p className="text-[10px] text-zinc-500 truncate">Target: {antibody.targetName}</p>}
      </div>
      <AddToPanelButton
        antibodyId={antibody.id}
        label={antibody.name}
        variant="outline"
        size="sm"
        className="h-6 text-[10px] px-1.5 shrink-0"
      />
    </div>
  )
}

function SearchMarkersCard({ output, isStreaming }: { output: SearchMarkersOutput; isStreaming: boolean }) {
  const proteins = output.proteins ?? []
  const antibodies = output.antibodies ?? []
  const hasResults = proteins.length > 0 || antibodies.length > 0

  if (isStreaming) {
    return (
      <div className="flex items-center gap-2 py-1">
        <Loader2 className="h-3 w-3 animate-spin text-purple-500" />
        <span className="text-xs text-muted-foreground">Searching markers...</span>
      </div>
    )
  }

  if (!hasResults) {
    return (
      <div className="rounded-md bg-zinc-50 border px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
        <Search className="h-3 w-3 shrink-0" />
        No markers found for this query.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Search className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Search results</span>
        <Badge variant="secondary" className="text-[10px] h-4 px-1">
          {proteins.length + antibodies.length}
        </Badge>
      </div>

      {proteins.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground font-medium px-0.5">Proteins</p>
          <div className="space-y-1">
            {proteins.map((p) => (
              <ProteinResultCard key={p.id} protein={p} />
            ))}
          </div>
        </div>
      )}

      {antibodies.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground font-medium px-0.5">Antibodies</p>
          <div className="space-y-1">
            {antibodies.map((a) => (
              <AntibodyResultCard key={a.id} antibody={a} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SuggestPanelCard({ output, isStreaming }: { output: SuggestPanelOutput; isStreaming: boolean }) {
  const suggestions = output.suggestions ?? []

  if (isStreaming) {
    return (
      <div className="flex items-center gap-2 py-1">
        <Loader2 className="h-3 w-3 animate-spin text-purple-500" />
        <span className="text-xs text-muted-foreground">Finding panel suggestions...</span>
      </div>
    )
  }

  if (suggestions.length === 0) {
    return (
      <div className="rounded-md bg-zinc-50 border px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
        <Sparkles className="h-3 w-3 shrink-0" />
        No validated markers found for these filters.
      </div>
    )
  }

  const filters = output.filters
  const filterParts = [filters?.cellType, filters?.tissue, filters?.species].filter(Boolean)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Sparkles className="h-3 w-3 text-purple-500" />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Panel suggestions</span>
        {filterParts.length > 0 && (
          <span className="text-[10px] text-muted-foreground">({filterParts.join(", ")})</span>
        )}
      </div>

      <div className="space-y-1">
        {suggestions.map((s, i) => (
          <div key={i} className="flex items-start justify-between gap-2 rounded-md border bg-white p-2.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                {s.antibodyId ? (
                  <Link
                    href={`/antibody/${s.antibodyId}`}
                    className="text-xs font-semibold leading-tight truncate hover:text-primary transition-colors"
                  >
                    {s.antibodyName}
                  </Link>
                ) : (
                  <p className="text-xs font-semibold leading-tight truncate">{s.antibodyName}</p>
                )}
                <Badge variant="secondary" className="text-[10px] h-4 px-1 shrink-0">
                  {s.validatedReportCount} {s.validatedReportCount === 1 ? "report" : "reports"}
                </Badge>
              </div>
              {s.antibodyRrid && <p className="text-[10px] text-muted-foreground mt-0.5">{s.antibodyRrid}</p>}
              {s.methods.length > 0 && <p className="text-[10px] text-zinc-500 truncate">{s.methods.join(", ")}</p>}
            </div>
            <div className="shrink-0">
              <AddToPanelButton label={s.antibodyName} variant="outline" size="sm" className="h-6 text-[10px] px-1.5" />
            </div>
          </div>
        ))}
      </div>

      {output.totalValidatedReports !== undefined && (
        <p className="text-[10px] text-muted-foreground px-0.5">
          Based on {output.totalValidatedReports} validated reports
        </p>
      )}
    </div>
  )
}

function GetMarkerDetailsCard({ output, isStreaming }: { output: GetMarkerDetailsOutput; isStreaming: boolean }) {
  if (isStreaming) {
    return (
      <div className="flex items-center gap-2 py-1">
        <Loader2 className="h-3 w-3 animate-spin text-purple-500" />
        <span className="text-xs text-muted-foreground">Loading marker details...</span>
      </div>
    )
  }

  if (output.error || !output.protein) {
    return (
      <div className="rounded-md bg-zinc-50 border px-3 py-2 text-xs text-muted-foreground">
        {output.error ?? "Marker not found."}
      </div>
    )
  }

  const { protein, publishedReports = [], associatedCellTypes = [] } = output
  const workedReports = publishedReports.filter((r) => r.works)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <FlaskConical className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Marker details</span>
      </div>

      <div className="rounded-md border bg-white p-2.5 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Link
              href={`/marker/${protein.id}`}
              className="text-xs font-semibold block hover:text-primary transition-colors"
            >
              {protein.label}
            </Link>
            {protein.geneSymbol && <p className="text-[10px] text-muted-foreground">{protein.geneSymbol}</p>}
          </div>
          <AddToPanelButton
            proteinId={protein.id}
            label={protein.geneSymbol ?? protein.label}
            variant="outline"
            size="sm"
            className="h-6 text-[10px] px-1.5 shrink-0"
          />
        </div>

        <div className="flex gap-3 text-[10px] text-muted-foreground">
          <span>
            <span className="font-medium text-foreground">{workedReports.length}</span> validated reports
          </span>
          <span>
            <span className="font-medium text-foreground">{associatedCellTypes.length}</span> cell types
          </span>
        </div>

        {workedReports.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground font-medium">Reports</p>
            {workedReports.slice(0, 5).map((r) => (
              <div key={r.id} className="flex items-center gap-1.5 text-[10px]">
                <Link href={`/report/${r.id}`} className="text-primary hover:underline font-medium shrink-0">
                  #{r.id}
                </Link>
                {r.antibodyId && (
                  <Link href={`/antibody/${r.antibodyId}`} className="text-primary hover:underline truncate">
                    {r.antibodyName}
                  </Link>
                )}
                {!r.antibodyId && r.antibodyName && (
                  <span className="text-muted-foreground truncate">{r.antibodyName}</span>
                )}
                {r.method && (
                  <Badge variant="secondary" className="text-[9px] h-3.5 px-1 font-normal shrink-0">
                    {r.method}
                  </Badge>
                )}
              </div>
            ))}
            {workedReports.length > 5 && (
              <p className="text-[10px] text-muted-foreground">+{workedReports.length - 5} more reports</p>
            )}
          </div>
        )}

        {associatedCellTypes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {associatedCellTypes.slice(0, 5).map((ct) => (
              <Badge key={ct.id} variant="secondary" className="text-[10px] h-4 px-1 font-normal">
                {ct.label}
              </Badge>
            ))}
            {associatedCellTypes.length > 5 && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1 font-normal text-muted-foreground">
                +{associatedCellTypes.length - 5} more
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface SearchCellTypesOutput {
  cellTypes?: Array<{ id: string; label: string; parentIds: string[] }>
  total?: number
}

function SearchCellTypesCard({ output }: { output: SearchCellTypesOutput }) {
  const cellTypes = output.cellTypes ?? []

  if (cellTypes.length === 0) {
    return (
      <div className="rounded-md bg-zinc-50 border px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
        <Search className="h-3 w-3 shrink-0" />
        No cell types found.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Search className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Cell types</span>
        <Badge variant="secondary" className="text-[10px] h-4 px-1">
          {cellTypes.length}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-1">
        {cellTypes.slice(0, 10).map((ct) => (
          <Badge key={ct.id} variant="secondary" className="text-[10px] h-5 px-1.5 font-normal">
            {ct.label}
          </Badge>
        ))}
        {cellTypes.length > 10 && (
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal text-muted-foreground">
            +{cellTypes.length - 10} more
          </Badge>
        )}
      </div>
    </div>
  )
}

function LoadingToolCard({ toolName }: { toolName: string }) {
  const labelMap: Record<string, string> = {
    searchMarkers: "Searching markers...",
    getMarkerDetails: "Loading marker details...",
    suggestPanel: "Finding panel suggestions...",
    searchCellTypes: "Searching cell types...",
  }

  return (
    <div className="flex items-center gap-2 py-1">
      <Loader2 className="h-3 w-3 animate-spin text-purple-500" />
      <span className="text-xs text-muted-foreground">{labelMap[toolName] ?? `Running ${toolName}...`}</span>
    </div>
  )
}

export function ToolResultCard({ part }: { part: ToolPart }) {
  const toolName =
    part.toolName ??
    (typeof part.type === "string" && part.type.startsWith("tool-") ? part.type.replace("tool-", "") : "")
  const state = part.state ?? "input-available"
  const isStreaming = state !== "output-available"
  const output = (part.output ?? {}) as Record<string, unknown>

  const panelMakerTools = ["searchMarkers", "getMarkerDetails", "suggestPanel", "searchCellTypes"]

  if (!panelMakerTools.includes(toolName)) {
    return null
  }

  if (isStreaming) {
    return (
      <Card className={cn("px-3 py-2 bg-purple-50/50 border-purple-100 shadow-none")}>
        <LoadingToolCard toolName={toolName} />
      </Card>
    )
  }

  return (
    <Card className={cn("px-3 py-2 bg-purple-50/50 border-purple-100 shadow-none")}>
      {toolName === "searchMarkers" && (
        <SearchMarkersCard output={output as SearchMarkersOutput} isStreaming={isStreaming} />
      )}
      {toolName === "suggestPanel" && (
        <SuggestPanelCard output={output as SuggestPanelOutput} isStreaming={isStreaming} />
      )}
      {toolName === "getMarkerDetails" && (
        <GetMarkerDetailsCard output={output as GetMarkerDetailsOutput} isStreaming={isStreaming} />
      )}
      {toolName === "searchCellTypes" && <SearchCellTypesCard output={output as SearchCellTypesOutput} />}
    </Card>
  )
}
