"use client"

import { ImageCarouselDialog, type CarouselImage } from "@/components/browse/image-carousel-dialog"
import { SpecificityBadge, WorksBadge } from "@/components/browse/report-badges"
import { ReportsDialog } from "@/components/browse/reports-dialog"
import { DataTableColumnHeader } from "@/components/data-table/column-header"
import { AddToPanelButton } from "@/components/panel/add-to-panel-button"
import { NotAvailable } from "@/components/shared/not-available"
import { TruncatedOrNotAvailable, TruncatedText } from "@/components/shared/truncated-text"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatDate } from "@/lib/format"
import { doiUrl, pubmedUrl, type PublicationRef } from "@/lib/publication"
import { antibodyHref, cellTypeHref, markerHref, profileHref } from "@/lib/routes"
import { ColumnDef } from "@tanstack/react-table"
import { ImageIcon } from "lucide-react"
import Link from "next/link"

import type { OntologyValue as OntologyRef } from "@/components/ontology-combobox"

export type { OntologyRef }

export type MemberRef = { id: string; name: string | null }

export type MarkerReport = {
  id: string
  submitter: string | null
  submitterId: string | null
  lab: string | null
  publication: PublicationRef | null
  method: string
  species: string
  works: boolean | null
}

export type MarkerEntry = {
  // Grouping key for the table row. Equals proteinId when the antibody is linked to a protein,
  // otherwise a synthetic key, so it must never be used to build a /marker/ link.
  id: string
  // The UniProt accession, null when no protein is linked. Only this may drive a marker link.
  proteinId: string | null
  marker: string
  cellTypes: OntologyRef[]
  species: string
  tissue: string
  validatedMethods: string[]
  reportCount: number
  reports: MarkerReport[]
  images: CarouselImage[]
}

export type AntibodyEntry = {
  id: string
  rrid: string | null
  name: string
  target: string | null
  targetProteinId: string | null
  vendor: string | null
  clone: string | null
  reportCount: number
  reports: MarkerReport[]
  images: CarouselImage[]
}

export type ReportEntry = {
  id: string
  experimentId: string
  marker: string
  antibodyId: string | null
  antibodyName: string
  rrid: string | null
  species: string
  tissue: string
  method: string
  cellTypes: OntologyRef[]
  subcellular: string | null
  specificity: string | null
  works: boolean | null
  images: CarouselImage[]
  submitter: MemberRef | null
}

export type ExperimentEntry = {
  id: string
  name: string | null
  citation: string | null
  pmid: string | null
  doi: string | null
  method: string
  species: string
  tissue: string
  condition: string | null
  stainingCount: number
  workingCount: number
  antibodyCount: number
  images: CarouselImage[]
  createdAt: string
  submitter: MemberRef | null
}

const VISIBLE_CELL_TYPES = 2

function CellTypeLinks({ cellTypes }: { cellTypes: OntologyRef[] }) {
  if (cellTypes.length === 0) return <NotAvailable />
  const visible = cellTypes.slice(0, VISIBLE_CELL_TYPES)
  const hidden = cellTypes.slice(VISIBLE_CELL_TYPES)
  return (
    <div className="flex max-w-[240px] flex-col gap-0.5">
      {visible.map((ct) => (
        <TruncatedText key={ct.id} text={ct.label} href={cellTypeHref(ct.id)} />
      ))}
      {hidden.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="w-fit cursor-default text-xs text-muted-foreground">+{hidden.length} more</span>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm">{hidden.map((ct) => ct.label).join(", ")}</TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

function ImageCell({ images, title }: { images: CarouselImage[]; title: string }) {
  if (!images || images.length === 0) {
    return (
      <span className="flex size-10 items-center justify-center rounded border bg-muted/40 text-muted-foreground">
        <ImageIcon className="size-4" />
      </span>
    )
  }
  return (
    <ImageCarouselDialog
      images={images}
      title={title}
      trigger={
        <button
          type="button"
          title="Quick image look"
          className="group relative size-10 overflow-hidden rounded border bg-muted/40 transition-colors hover:border-primary/50"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[0].src} alt={`${title} image`} className="size-full object-cover" />
          {images.length > 1 && (
            <span className="absolute bottom-0 right-0 rounded-tl bg-black/70 px-1 text-[10px] leading-tight text-white">
              {images.length}
            </span>
          )}
        </button>
      }
    />
  )
}

export const columns: ColumnDef<MarkerEntry>[] = [
  {
    accessorKey: "marker",
    header: () => <DataTableColumnHeader field="marker" title="Marker" />,
    cell: ({ row }) => (
      <TruncatedText
        text={row.original.marker}
        href={row.original.proteinId ? markerHref(row.original.proteinId) : undefined}
        className="max-w-[220px] font-semibold"
      />
    ),
  },
  {
    accessorKey: "cellTypes",
    header: () => <DataTableColumnHeader field="cellType" title="Cell Types" />,
    cell: ({ row }) => <CellTypeLinks cellTypes={row.original.cellTypes} />,
    sortingFn: (a, b) =>
      a.original.cellTypes
        .map((c) => c.label)
        .join(", ")
        .localeCompare(b.original.cellTypes.map((c) => c.label).join(", ")),
  },
  {
    accessorKey: "species",
    header: () => <DataTableColumnHeader field="species" title="Sample species" />,
    cell: ({ row }) => <TruncatedText text={row.original.species} className="max-w-[160px]" />,
  },
  {
    accessorKey: "tissue",
    header: () => <DataTableColumnHeader field="tissue" title="Tissue" />,
    cell: ({ row }) => <TruncatedText text={row.original.tissue} className="max-w-[160px] text-muted-foreground" />,
  },
  {
    accessorKey: "validatedMethods",
    header: () => <DataTableColumnHeader field="methods" title="Methods" />,
    cell: ({ row }) => {
      return (
        <TruncatedText
          text={row.original.validatedMethods.join(", ")}
          className="max-w-[150px] text-muted-foreground"
        />
      )
    },
    sortingFn: (a, b) => a.original.validatedMethods.join(", ").localeCompare(b.original.validatedMethods.join(", ")),
  },
  {
    accessorKey: "reportCount",
    header: () => <DataTableColumnHeader field="reportCount" title="Reports" />,
    cell: ({ row }) => (
      <ReportsDialog
        marker={row.original.marker}
        cellType={row.original.cellTypes.map((c) => c.label).join(", ")}
        reports={row.original.reports}
      />
    ),
  },
  {
    id: "images",
    header: "Images",
    cell: ({ row }) => <ImageCell images={row.original.images} title={row.original.marker} />,
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <div className="text-right">
        <AddToPanelButton
          proteinId={row.original.id}
          label={row.original.marker}
          variant="outline"
          size="sm"
          className="h-7 text-xs"
        />
      </div>
    ),
  },
]

export const antibodyColumns: ColumnDef<AntibodyEntry>[] = [
  {
    accessorKey: "name",
    header: () => <DataTableColumnHeader field="name" title="Antibody" />,
    cell: ({ row }) => {
      return (
        <TruncatedText
          text={row.original.name}
          href={antibodyHref(row.original.rrid) ?? undefined}
          className="max-w-[280px] font-semibold"
        />
      )
    },
  },
  {
    accessorKey: "target",
    header: () => <DataTableColumnHeader field="target" title="Target" />,
    cell: ({ row }) => {
      const { target, targetProteinId } = row.original
      if (!target) return <NotAvailable />
      return (
        <TruncatedText
          text={target}
          href={targetProteinId ? markerHref(targetProteinId) : undefined}
          className="max-w-[180px]"
        />
      )
    },
  },
  {
    accessorKey: "rrid",
    header: () => <DataTableColumnHeader field="rrid" title="RRID" />,
    cell: ({ row }) => {
      const href = antibodyHref(row.original.rrid)
      return href ? (
        <Link href={href} className="font-mono text-xs text-primary hover:underline">
          {row.original.rrid}
        </Link>
      ) : (
        <NotAvailable />
      )
    },
  },
  {
    accessorKey: "vendor",
    header: () => <DataTableColumnHeader field="vendor" title="Vendor" />,
    cell: ({ row }) => (
      <TruncatedOrNotAvailable value={row.original.vendor} className="max-w-[160px] text-muted-foreground" />
    ),
  },
  {
    accessorKey: "clone",
    header: () => <DataTableColumnHeader field="clone" title="Clone" />,
    cell: ({ row }) => (
      <TruncatedOrNotAvailable value={row.original.clone} className="max-w-[120px] text-muted-foreground" />
    ),
  },
  {
    accessorKey: "reportCount",
    header: () => <DataTableColumnHeader field="reportCount" title="Reports" />,
    cell: ({ row }) => (
      <ReportsDialog
        marker={row.original.name}
        cellType={row.original.target ?? "reported cell types"}
        reports={row.original.reports}
      />
    ),
  },
  {
    id: "images",
    header: "Images",
    cell: ({ row }) => <ImageCell images={row.original.images} title={row.original.name} />,
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <div className="text-right">
        <AddToPanelButton
          antibodyId={row.original.id}
          label={row.original.name}
          variant="outline"
          size="sm"
          className="h-7 text-xs"
        />
      </div>
    ),
  },
]

export const reportColumns: ColumnDef<ReportEntry>[] = [
  {
    accessorKey: "marker",
    header: () => <DataTableColumnHeader field="marker" title="Marker" />,
    cell: ({ row }) => (
      <TruncatedText
        text={row.original.marker}
        href={`/report/${row.original.id}`}
        className="max-w-[200px] font-semibold"
      />
    ),
  },
  {
    accessorKey: "antibodyName",
    header: () => <DataTableColumnHeader field="antibodyName" title="Antibody" />,
    cell: ({ row }) => {
      return (
        <TruncatedText
          text={row.original.antibodyName}
          href={antibodyHref(row.original.rrid) ?? undefined}
          className="max-w-[240px]"
        />
      )
    },
  },
  {
    accessorKey: "cellTypes",
    header: () => <DataTableColumnHeader field="cellType" title="Cell Types" />,
    cell: ({ row }) => <CellTypeLinks cellTypes={row.original.cellTypes} />,
    sortingFn: (a, b) =>
      a.original.cellTypes
        .map((c) => c.label)
        .join(", ")
        .localeCompare(b.original.cellTypes.map((c) => c.label).join(", ")),
  },
  {
    accessorKey: "subcellular",
    header: () => <DataTableColumnHeader field="subcellular" title="Subcellular" />,
    cell: ({ row }) => (
      <TruncatedOrNotAvailable value={row.original.subcellular} className="max-w-[160px] text-muted-foreground" />
    ),
  },
  {
    accessorKey: "species",
    header: () => <DataTableColumnHeader field="species" title="Sample species" />,
    cell: ({ row }) => <TruncatedText text={row.original.species} className="max-w-[160px]" />,
  },
  {
    accessorKey: "tissue",
    header: () => <DataTableColumnHeader field="tissue" title="Tissue" />,
    cell: ({ row }) => <TruncatedText text={row.original.tissue} className="max-w-[160px] text-muted-foreground" />,
  },
  {
    accessorKey: "method",
    header: () => <DataTableColumnHeader field="method" title="Method" />,
    cell: ({ row }) => <TruncatedText text={row.original.method} className="max-w-[140px] text-muted-foreground" />,
  },
  {
    accessorKey: "specificity",
    header: () => <DataTableColumnHeader field="specificity" title="Specificity" />,
    cell: ({ row }) => <SpecificityBadge specificity={row.original.specificity} />,
  },
  {
    accessorKey: "works",
    header: () => <DataTableColumnHeader field="works" title="Result" />,
    cell: ({ row }) => <WorksBadge works={row.original.works} />,
  },
  {
    id: "images",
    header: "Images",
    cell: ({ row }) => <ImageCell images={row.original.images} title={row.original.marker} />,
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) =>
      row.original.antibodyId ? (
        <div className="text-right">
          <AddToPanelButton
            antibodyId={row.original.antibodyId}
            label={row.original.antibodyName}
            variant="outline"
            size="sm"
            className="h-7 text-xs"
          />
        </div>
      ) : null,
  },
]

export type PanelEntry = {
  id: string
  name: string
  description: string | null
  ownerId: string | null
  ownerName: string | null
  species: string | null
  method: string | null
  visibility: string
  cycleCount: number
  markerCount: number
  updatedAt: string
}

export function MemberCell({ member }: { member: MemberRef | null }) {
  if (!member) return <NotAvailable />
  return <TruncatedText text={member.name ?? "Unnamed user"} href={profileHref(member.id)} className="max-w-[180px]" />
}

function panelOwner(panel: PanelEntry): MemberRef | null {
  return panel.ownerId ? { id: panel.ownerId, name: panel.ownerName } : null
}

export const panelColumns: ColumnDef<PanelEntry>[] = [
  {
    accessorKey: "name",
    header: () => <DataTableColumnHeader field="name" title="Panel" />,
    cell: ({ row }) => (
      <div className="max-w-[320px] space-y-0.5">
        <TruncatedText text={row.original.name} href={`/panel/${row.original.id}`} className="font-semibold" />
        {row.original.description && (
          <TruncatedText text={row.original.description} className="text-xs text-muted-foreground" />
        )}
      </div>
    ),
  },
  {
    id: "member",
    header: () => <DataTableColumnHeader field="member" title="Creator" />,
    cell: ({ row }) => <MemberCell member={panelOwner(row.original)} />,
  },
  {
    accessorKey: "species",
    header: () => <DataTableColumnHeader field="species" title="Sample species" />,
    cell: ({ row }) => <TruncatedOrNotAvailable value={row.original.species} className="max-w-[160px]" />,
  },
  {
    accessorKey: "method",
    header: () => <DataTableColumnHeader field="method" title="Method" />,
    cell: ({ row }) => (
      <TruncatedOrNotAvailable value={row.original.method} className="max-w-[140px] text-muted-foreground" />
    ),
  },
  {
    accessorKey: "markerCount",
    header: () => <DataTableColumnHeader field="markerCount" title="Antibodies" />,
    cell: ({ row }) => (
      <Badge variant="secondary">
        {row.original.markerCount} {row.original.markerCount === 1 ? "antibody" : "antibodies"}
      </Badge>
    ),
  },
  {
    accessorKey: "cycleCount",
    header: () => <DataTableColumnHeader field="cycleCount" title="Cycles" />,
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.cycleCount}</span>,
  },
  {
    accessorKey: "updatedAt",
    header: () => <DataTableColumnHeader field="updatedAt" title="Updated" />,
    cell: ({ row }) => <span className="text-muted-foreground">{formatDate(row.original.updatedAt)}</span>,
  },
]

function PublicationCell({ entry }: { entry: ExperimentEntry }) {
  if (entry.doi) {
    return (
      <a href={doiUrl(entry.doi)} target="_blank" rel="noreferrer" className="text-primary hover:underline">
        DOI
      </a>
    )
  }
  if (entry.pmid) {
    return (
      <a href={pubmedUrl(entry.pmid)} target="_blank" rel="noreferrer" className="text-primary hover:underline">
        PMID {entry.pmid}
      </a>
    )
  }
  if (entry.citation) {
    return <span className="text-muted-foreground">Cited</span>
  }
  return <span className="text-muted-foreground">None</span>
}

export const experimentColumns: ColumnDef<ExperimentEntry>[] = [
  {
    accessorKey: "name",
    header: () => <DataTableColumnHeader field="name" title="Experiment" />,
    cell: ({ row }) => (
      <TruncatedText
        text={row.original.name ?? `Experiment ${row.original.id.slice(0, 8)}`}
        href={`/experiment/${row.original.id}`}
        className="max-w-[320px] font-semibold"
      />
    ),
  },
  {
    accessorKey: "method",
    header: () => <DataTableColumnHeader field="method" title="Method" />,
    cell: ({ row }) => <TruncatedText text={row.original.method} className="max-w-[140px] text-muted-foreground" />,
  },
  {
    accessorKey: "species",
    header: () => <DataTableColumnHeader field="species" title="Sample species" />,
    cell: ({ row }) => <TruncatedText text={row.original.species} className="max-w-[160px]" />,
  },
  {
    accessorKey: "tissue",
    header: () => <DataTableColumnHeader field="tissue" title="Tissue" />,
    cell: ({ row }) => <TruncatedText text={row.original.tissue} className="max-w-[160px] text-muted-foreground" />,
  },
  {
    accessorKey: "condition",
    header: () => <DataTableColumnHeader field="condition" title="Condition" />,
    cell: ({ row }) => (
      <TruncatedOrNotAvailable value={row.original.condition} className="max-w-[180px] text-muted-foreground" />
    ),
  },
  {
    id: "publication",
    header: "Publication",
    cell: ({ row }) => <PublicationCell entry={row.original} />,
  },
  {
    accessorKey: "stainingCount",
    header: () => <DataTableColumnHeader field="stainingCount" title="Stainings" />,
    cell: ({ row }) => (
      <Badge variant="secondary">
        {row.original.stainingCount} {row.original.stainingCount === 1 ? "staining" : "stainings"}
      </Badge>
    ),
  },
  {
    accessorKey: "workingCount",
    header: () => <DataTableColumnHeader field="workingCount" title="Working" />,
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.workingCount}/{row.original.stainingCount}
      </span>
    ),
  },
  {
    id: "images",
    header: "Images",
    cell: ({ row }) => (
      <ImageCell
        images={row.original.images}
        title={row.original.name ?? `Experiment ${row.original.id.slice(0, 8)}`}
      />
    ),
  },
]
