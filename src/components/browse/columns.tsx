"use client"

import {
  addToPanelColumn,
  cellTypesColumn,
  countBadgeColumn,
  imagesColumn,
  methodColumn,
  optionalTextColumn,
  sortableHeader,
  speciesColumn,
  tissueColumn,
  type AddToPanelTarget,
} from "@/components/browse/column-helpers"
import { RecommendationBadge, ValidationCount } from "@/components/browse/report-badges"
import { ReportsDialog } from "@/components/browse/reports-dialog"
import { VerdictRing } from "@/components/browse/verdict-ring"
import { NotAvailable } from "@/components/shared/not-available"
import { TruncatedText } from "@/components/shared/truncated-text"
import { formatDate } from "@/lib/format"
import { doiUrl, pubmedUrl } from "@/lib/publication"
import { antibodyHref, markerHref, profileHref } from "@/lib/routes"
import { ColumnDef } from "@tanstack/react-table"
import Link from "next/link"

import type {
  AntibodyEntry,
  ExperimentEntry,
  MarkerEntry,
  MarkerReport,
  MemberRef,
  PanelEntry,
  ReportEntry,
} from "@/models/experimental-report/entries"
import type { VerdictCounts } from "@/models/experimental-report/transforms"
import type { CarouselImage } from "@/models/image/transforms"

export type {
  AntibodyEntry,
  ExperimentEntry,
  MarkerEntry,
  MarkerReport,
  MemberRef,
  PanelEntry,
  ReportEntry,
} from "@/models/experimental-report/entries"

type EvidenceEntry = { reports: MarkerReport[]; verdicts: VerdictCounts; images: CarouselImage[] }

function evidenceColumns<T extends EvidenceEntry>(
  title: (entry: T) => string,
  context: (entry: T) => string | undefined,
  panelTarget: (entry: T) => AddToPanelTarget | null,
): ColumnDef<T>[] {
  return [
    {
      accessorKey: "reportCount",
      header: sortableHeader("reportCount", "Reports"),
      cell: ({ row }) => (
        <ReportsDialog title={title(row.original)} context={context(row.original)} reports={row.original.reports} />
      ),
    },
    {
      accessorKey: "verdicts",
      header: sortableHeader("verdicts", "Verdicts"),
      cell: ({ row }) => <VerdictRing counts={row.original.verdicts} />,
    },
    imagesColumn(title),
    addToPanelColumn(panelTarget),
  ] as ColumnDef<T>[]
}

export const columns: ColumnDef<MarkerEntry>[] = [
  {
    accessorKey: "marker",
    header: sortableHeader("marker", "Marker"),
    cell: ({ row }) => (
      <TruncatedText
        text={row.original.marker}
        href={row.original.proteinId ? markerHref(row.original.proteinId) : undefined}
        className="max-w-[220px] font-semibold"
      />
    ),
  },
  cellTypesColumn(),
  speciesColumn(),
  tissueColumn(),
  {
    accessorKey: "validatedMethods",
    header: sortableHeader("methods", "Methods"),
    cell: ({ row }) => (
      <TruncatedText text={row.original.validatedMethods.join(", ")} className="max-w-[150px] text-muted-foreground" />
    ),
    sortingFn: (a, b) => a.original.validatedMethods.join(", ").localeCompare(b.original.validatedMethods.join(", ")),
  },
  ...evidenceColumns<MarkerEntry>(
    (entry) => entry.marker,
    (entry) => (entry.cellTypes.length > 0 ? `staining ${entry.cellTypes.map((c) => c.label).join(", ")}` : undefined),
    (entry) => ({ proteinId: entry.id, label: entry.marker }),
  ),
]

export const antibodyColumns: ColumnDef<AntibodyEntry>[] = [
  {
    accessorKey: "name",
    header: sortableHeader("name", "Antibody"),
    cell: ({ row }) => (
      <TruncatedText
        text={row.original.name}
        href={antibodyHref(row.original.rrid) ?? undefined}
        className="max-w-[280px] font-semibold"
      />
    ),
  },
  {
    accessorKey: "target",
    header: sortableHeader("target", "Target"),
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
    header: sortableHeader("rrid", "RRID"),
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
  optionalTextColumn("vendor", "Vendor", "max-w-[160px] text-muted-foreground"),
  optionalTextColumn("clone", "Clone", "max-w-[120px] text-muted-foreground", {
    label: "Clone",
    hiddenByDefault: true,
  }),
  ...evidenceColumns<AntibodyEntry>(
    (entry) => entry.name,
    (entry) => (entry.target ? `targeting ${entry.target}` : undefined),
    (entry) => ({ antibodyId: entry.id, label: entry.name }),
  ),
]

export const reportColumns: ColumnDef<ReportEntry>[] = [
  {
    accessorKey: "marker",
    header: sortableHeader("marker", "Marker"),
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
    header: sortableHeader("antibodyName", "Antibody"),
    cell: ({ row }) => (
      <TruncatedText
        text={row.original.antibodyName}
        href={antibodyHref(row.original.rrid) ?? undefined}
        className="max-w-[240px]"
      />
    ),
  },
  cellTypesColumn(),
  optionalTextColumn("subcellular", "Subcellular", "max-w-[160px] text-muted-foreground", {
    label: "Subcellular",
    hiddenByDefault: true,
  }),
  speciesColumn(),
  tissueColumn(),
  methodColumn(),
  {
    id: "validation",
    meta: { label: "Specificity controls", hiddenByDefault: true },
    header: sortableHeader("validation", "Controls"),
    cell: ({ row }) => <ValidationCount validations={row.original.validations} />,
  },
  {
    accessorKey: "recommendation",
    header: sortableHeader("recommendation", "Verdict"),
    cell: ({ row }) => <RecommendationBadge recommendation={row.original.recommendation} />,
  },
  imagesColumn((entry) => entry.marker),
  addToPanelColumn((entry) => (entry.antibodyId ? { antibodyId: entry.antibodyId, label: entry.antibodyName } : null)),
]

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
    header: sortableHeader("name", "Panel"),
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
    header: sortableHeader("member", "Creator"),
    cell: ({ row }) => <MemberCell member={panelOwner(row.original)} />,
  },
  optionalTextColumn("species", "Sample species", "max-w-[160px]"),
  optionalTextColumn("method", "Method", "max-w-[140px] text-muted-foreground"),
  countBadgeColumn("markerCount", "Antibodies", "antibody", "antibodies"),
  {
    accessorKey: "cycleCount",
    header: sortableHeader("cycleCount", "Cycles"),
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.cycleCount}</span>,
  },
  {
    accessorKey: "updatedAt",
    header: sortableHeader("updatedAt", "Updated"),
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
  return <NotAvailable />
}

function experimentTitle(entry: ExperimentEntry): string {
  return entry.name ?? `Experiment ${entry.id.slice(0, 8)}`
}

export const experimentColumns: ColumnDef<ExperimentEntry>[] = [
  {
    accessorKey: "name",
    header: sortableHeader("name", "Experiment"),
    cell: ({ row }) => (
      <TruncatedText
        text={experimentTitle(row.original)}
        href={`/experiment/${row.original.id}`}
        className="max-w-[320px] font-semibold"
      />
    ),
  },
  methodColumn(),
  speciesColumn(),
  tissueColumn(),
  optionalTextColumn("condition", "Condition", "max-w-[180px] text-muted-foreground"),
  {
    id: "publication",
    meta: { label: "Publication", hiddenByDefault: true },
    header: "Publication",
    cell: ({ row }) => <PublicationCell entry={row.original} />,
  },
  countBadgeColumn("stainingCount", "Stainings", "staining", "stainings"),
  {
    accessorKey: "usableCount",
    header: sortableHeader("usableCount", "Usable"),
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.usableCount}/{row.original.stainingCount}
      </span>
    ),
  },
  imagesColumn(experimentTitle),
]
