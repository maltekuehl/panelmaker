"use client"

import { ImageCarouselDialog, type CarouselImage } from "@/components/browse/image-carousel-dialog"
import { ReportsDialog } from "@/components/browse/reports-dialog"
import { DataTableColumnHeader } from "@/components/data-table/column-header"
import { AddToPanelButton } from "@/components/panel/add-to-panel-button"
import { Badge } from "@/components/ui/badge"
import { SPECIFICITY_LABELS } from "@/lib/constants"
import { doiUrl, pubmedUrl } from "@/lib/publication"
import { ColumnDef } from "@tanstack/react-table"
import { ImageIcon } from "lucide-react"
import Link from "next/link"

export type OntologyRef = { id: string; label: string }

export type MemberRef = { id: string; name: string | null }

export type MarkerReport = {
  id: string
  submitter: string
  submitterId: string | null
  method: string
  species: string
  works: boolean | null
}

export type MarkerEntry = {
  id: string
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

function antibodyHref(rrid: string): string {
  return `/antibody/${rrid.replace(/^RRID:/, "")}`
}

function CellTypeLinks({ cellTypes }: { cellTypes: OntologyRef[] }) {
  if (cellTypes.length === 0) return <span className="text-muted-foreground">N/A</span>
  return (
    <div className="flex flex-wrap gap-x-2 gap-y-0.5">
      {cellTypes.map((ct, i) => (
        <span key={ct.id}>
          <Link href={`/celltype/${ct.id}`} className="text-primary hover:underline">
            {ct.label}
          </Link>
          {i < cellTypes.length - 1 ? "," : ""}
        </span>
      ))}
    </div>
  )
}

const SPECIFICITY_STYLES: Record<string, string> = {
  HIGH: "border-green-200 bg-green-100 text-green-700",
  MODERATE: "border-amber-200 bg-amber-100 text-amber-700",
  LOW: "border-red-200 bg-red-100 text-red-700",
  NON_SPECIFIC: "border-red-200 bg-red-100 text-red-700",
}

function SpecificityBadge({ specificity }: { specificity: string | null }) {
  if (!specificity) return <span className="text-muted-foreground">N/A</span>
  return (
    <Badge className={SPECIFICITY_STYLES[specificity] ?? "border-transparent bg-muted text-muted-foreground"}>
      {SPECIFICITY_LABELS[specificity as keyof typeof SPECIFICITY_LABELS] ?? specificity}
    </Badge>
  )
}

function WorksBadge({ works }: { works: boolean | null }) {
  if (works === null) return <span className="text-muted-foreground">N/A</span>
  return works ? (
    <Badge className="border-green-200 bg-green-100 text-green-700">Works</Badge>
  ) : (
    <Badge className="border-red-200 bg-red-100 text-red-700">Failed</Badge>
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
      <Link href={`/marker/${row.original.id}`} className="font-semibold hover:underline text-primary">
        {row.getValue("marker")}
      </Link>
    ),
  },
  {
    accessorKey: "cellTypes",
    header: () => <DataTableColumnHeader field="cellType" title="Cell Types" />,
    cell: ({ row }) => <CellTypeLinks cellTypes={row.original.cellTypes} />,
  },
  {
    accessorKey: "species",
    header: () => <DataTableColumnHeader field="species" title="Species" />,
    cell: ({ row }) => <span>{row.getValue("species") as string}</span>,
  },
  {
    accessorKey: "tissue",
    header: () => <DataTableColumnHeader field="tissue" title="Tissue" />,
    cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("tissue") as string}</span>,
  },
  {
    accessorKey: "validatedMethods",
    header: () => <DataTableColumnHeader field="methods" title="Methods" />,
    cell: ({ row }) => {
      const methods = row.getValue("validatedMethods") as string[]
      return (
        <div className="flex flex-wrap gap-1 text-muted-foreground truncate max-w-[150px]">{methods.join(", ")}</div>
      )
    },
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
      const rrid = row.original.rrid
      const name = row.original.name
      return rrid ? (
        <Link href={antibodyHref(rrid)} className="font-semibold hover:underline text-primary">
          {name}
        </Link>
      ) : (
        <span className="font-semibold">{name}</span>
      )
    },
  },
  {
    accessorKey: "target",
    header: () => <DataTableColumnHeader field="target" title="Target" />,
    cell: ({ row }) => {
      const { target, targetProteinId } = row.original
      if (!target) return <span className="text-muted-foreground">N/A</span>
      return targetProteinId ? (
        <Link href={`/marker/${targetProteinId}`} className="text-primary hover:underline">
          {target}
        </Link>
      ) : (
        <span>{target}</span>
      )
    },
  },
  {
    accessorKey: "rrid",
    header: () => <DataTableColumnHeader field="rrid" title="RRID" />,
    cell: ({ row }) =>
      row.original.rrid ? (
        <Link href={antibodyHref(row.original.rrid)} className="font-mono text-xs text-primary hover:underline">
          {row.original.rrid}
        </Link>
      ) : (
        <span className="text-muted-foreground">N/A</span>
      ),
  },
  {
    accessorKey: "vendor",
    header: () => <DataTableColumnHeader field="vendor" title="Vendor" />,
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.vendor ?? "N/A"}</span>,
  },
  {
    accessorKey: "clone",
    header: () => <DataTableColumnHeader field="clone" title="Clone" />,
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.clone ?? "N/A"}</span>,
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
      <Link href={`/report/${row.original.id}`} className="font-semibold hover:underline text-primary">
        {row.original.marker}
      </Link>
    ),
  },
  {
    accessorKey: "antibodyName",
    header: () => <DataTableColumnHeader field="antibodyName" title="Antibody" />,
    cell: ({ row }) =>
      row.original.rrid ? (
        <Link href={antibodyHref(row.original.rrid)} className="text-primary hover:underline">
          {row.original.antibodyName}
        </Link>
      ) : (
        <span>{row.original.antibodyName}</span>
      ),
  },
  {
    accessorKey: "cellTypes",
    header: () => <DataTableColumnHeader field="cellType" title="Cell Types" />,
    cell: ({ row }) => <CellTypeLinks cellTypes={row.original.cellTypes} />,
  },
  {
    accessorKey: "subcellular",
    header: () => <DataTableColumnHeader field="subcellular" title="Subcellular" />,
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.subcellular ?? "N/A"}</span>,
  },
  {
    accessorKey: "species",
    header: () => <DataTableColumnHeader field="species" title="Species" />,
    cell: ({ row }) => <span>{row.original.species}</span>,
  },
  {
    accessorKey: "tissue",
    header: () => <DataTableColumnHeader field="tissue" title="Tissue" />,
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.tissue}</span>,
  },
  {
    accessorKey: "method",
    header: () => <DataTableColumnHeader field="method" title="Method" />,
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.method}</span>,
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
  visibility: string
  cycleCount: number
  markerCount: number
  updatedAt: string
}

export const VISIBILITY_LABELS: Record<string, string> = { PRIVATE: "Private", LAB: "Lab", PUBLIC: "Public" }

export function MemberCell({ member }: { member: MemberRef | null }) {
  if (!member) return <span className="text-muted-foreground/50">N/A</span>
  return (
    <Link href={`/profile/${member.id}`} className="text-primary hover:underline">
      {member.name ?? "Unnamed user"}
    </Link>
  )
}

export function formatEntryDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
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
        <Link href={`/panel/${row.original.id}`} className="font-semibold text-primary hover:underline">
          {row.original.name}
        </Link>
        {row.original.description && (
          <p className="truncate text-xs text-muted-foreground">{row.original.description}</p>
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
    header: () => <DataTableColumnHeader field="species" title="Species" />,
    cell: ({ row }) =>
      row.original.species ? (
        <span>{row.original.species}</span>
      ) : (
        <span className="text-muted-foreground/50">N/A</span>
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
    cell: ({ row }) => <span className="text-muted-foreground">{formatEntryDate(row.original.updatedAt)}</span>,
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
      <Link href={`/experiment/${row.original.id}`} className="font-semibold hover:underline text-primary">
        {row.original.name ?? `Experiment ${row.original.id.slice(0, 8)}`}
      </Link>
    ),
  },
  {
    accessorKey: "method",
    header: () => <DataTableColumnHeader field="method" title="Method" />,
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.method}</span>,
  },
  {
    accessorKey: "species",
    header: () => <DataTableColumnHeader field="species" title="Species" />,
    cell: ({ row }) => <span>{row.original.species}</span>,
  },
  {
    accessorKey: "tissue",
    header: () => <DataTableColumnHeader field="tissue" title="Tissue" />,
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.tissue}</span>,
  },
  {
    accessorKey: "condition",
    header: () => <DataTableColumnHeader field="condition" title="Condition" />,
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.condition ?? "N/A"}</span>,
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
