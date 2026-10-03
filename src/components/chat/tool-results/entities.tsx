"use client"

import { antibodyHref, cellTypeHref, markerHref } from "@/lib/routes"
import type { EvidenceReport } from "@/models/evidence"
import { FlaskConical, Search } from "lucide-react"
import Link from "next/link"
import {
  CompactAddToPanelButton,
  EntityTitle,
  joinPresent,
  MetaLine,
  OrEmpty,
  RowStack,
  ToolAccordion,
  ToolErrorRow,
  ToolRow,
} from "./primitives"
import { ReportList } from "./reports"

interface MarkerSummaryData {
  id: string
  label: string
  geneSymbol: string | null
}

interface AntibodySummaryData {
  id: string
  name: string
  rrid: string | null
  targetName: string | null
  clonality: string | null
  host: string | null
  vendor: string | null
}

interface ResolveMarkersOutput {
  markers?: MarkerSummaryData[]
}

interface ResolveAntibodiesOutput {
  antibodies?: AntibodySummaryData[]
}

interface ResolveCellTypesOutput {
  matches?: { id: string; label: string }[]
  expandedIds?: string[]
}

interface GetMarkerDetailsOutput {
  marker?: MarkerSummaryData
  reportCount?: number
  reports?: EvidenceReport[]
  error?: string
}

interface GetAntibodyDetailsOutput {
  antibody?: AntibodySummaryData & { cloneId: string | null; conjugate: string | null }
  reportCount?: number
  reports?: EvidenceReport[]
  error?: string
}

function MarkerSummary({ marker }: { marker: MarkerSummaryData }) {
  return (
    <>
      <div className="min-w-0 flex-1">
        <EntityTitle href={markerHref(marker.id)}>{marker.label}</EntityTitle>
        {marker.geneSymbol && <p className="text-[10px] text-muted-foreground">{marker.geneSymbol}</p>}
      </div>
      <CompactAddToPanelButton
        proteinId={marker.id}
        geneSymbol={marker.geneSymbol ?? undefined}
        label={marker.geneSymbol ?? marker.label}
      />
    </>
  )
}

function AntibodySummary({ antibody, facts }: { antibody: AntibodySummaryData; facts: (string | null)[] }) {
  return (
    <>
      <div className="min-w-0 flex-1">
        <EntityTitle href={antibodyHref(antibody.rrid)}>{antibody.name}</EntityTitle>
        <MetaLine>{joinPresent(facts)}</MetaLine>
        {antibody.targetName && <MetaLine>Target: {antibody.targetName}</MetaLine>}
      </div>
      <CompactAddToPanelButton antibodyId={antibody.id} label={antibody.name} />
    </>
  )
}

function DetailReports({ reports }: { reports: EvidenceReport[] }) {
  if (reports.length === 0) return null
  return (
    <div className="mt-1.5">
      <ReportList reports={reports} />
    </div>
  )
}

export function ResolveMarkersCard({ output }: { output: ResolveMarkersOutput }) {
  const markers = output.markers ?? []
  return (
    <ToolAccordion icon={Search} title="Markers" count={markers.length}>
      <OrEmpty count={markers.length} empty="No markers matched.">
        <RowStack>
          {markers.map((m) => (
            <ToolRow key={m.id} className="flex items-center justify-between gap-2">
              <MarkerSummary marker={m} />
            </ToolRow>
          ))}
        </RowStack>
      </OrEmpty>
    </ToolAccordion>
  )
}

export function ResolveAntibodiesCard({ output }: { output: ResolveAntibodiesOutput }) {
  const antibodies = output.antibodies ?? []
  return (
    <ToolAccordion icon={Search} title="Antibodies" count={antibodies.length}>
      <OrEmpty count={antibodies.length} empty="No antibodies matched.">
        <RowStack>
          {antibodies.map((a) => (
            <ToolRow key={a.id} className="flex items-start justify-between gap-2">
              <AntibodySummary antibody={a} facts={[a.rrid, a.vendor, a.host, a.clonality]} />
            </ToolRow>
          ))}
        </RowStack>
      </OrEmpty>
    </ToolAccordion>
  )
}

export function ResolveCellTypesCard({ output }: { output: ResolveCellTypesOutput }) {
  const matches = output.matches ?? []
  const expanded = output.expandedIds ?? []
  return (
    <ToolAccordion icon={Search} title="Cell types" count={matches.length}>
      <OrEmpty count={matches.length} empty="No cell types matched.">
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
      </OrEmpty>
    </ToolAccordion>
  )
}

export function GetMarkerDetailsCard({ output }: { output: GetMarkerDetailsOutput }) {
  if (output.error || !output.marker) {
    return <ToolErrorRow>{output.error ?? "Marker not found."}</ToolErrorRow>
  }
  const { marker } = output
  const reports = output.reports ?? []
  return (
    <ToolAccordion icon={FlaskConical} title={`Marker: ${marker.label}`} count={output.reportCount ?? reports.length}>
      <div className="flex items-center justify-between gap-2">
        <MarkerSummary marker={marker} />
      </div>
      <DetailReports reports={reports} />
    </ToolAccordion>
  )
}

export function GetAntibodyDetailsCard({ output }: { output: GetAntibodyDetailsOutput }) {
  if (output.error || !output.antibody) {
    return <ToolErrorRow>{output.error ?? "Antibody not found."}</ToolErrorRow>
  }
  const ab = output.antibody
  const reports = output.reports ?? []
  return (
    <ToolAccordion icon={FlaskConical} title={`Antibody: ${ab.name}`} count={output.reportCount ?? reports.length}>
      <div className="flex items-center justify-between gap-2">
        <AntibodySummary antibody={ab} facts={[ab.rrid, ab.vendor, ab.host, ab.clonality, ab.conjugate]} />
      </div>
      <DetailReports reports={reports} />
    </ToolAccordion>
  )
}
