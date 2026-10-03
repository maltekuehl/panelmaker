"use client"

import {
  experimentColumns,
  MemberCell,
  panelColumns,
  reportColumns,
  type ExperimentEntry,
  type PanelEntry,
  type ReportEntry,
} from "@/components/browse/columns"
import { DataTable } from "@/components/browse/data-table"
import { DataTableColumnHeader } from "@/components/data-table/column-header"
import { DataTablePagination } from "@/components/data-table/pagination"
import { DebouncedSearchInput } from "@/components/data-table/search-input"
import { SegmentedTabs } from "@/components/data-table/segmented-tabs"
import { clearedTableParams, FacetFilterToolbar } from "@/components/filter-toolbar"
import { Badge } from "@/components/ui/badge"
import { VISIBILITY_LABELS } from "@/lib/constants"
import { isLabContentParamsActive, LAB_FILTER_DIMENSIONS, labContentParsers, type LabView } from "@/lib/data-table"
import type { Visibility } from "@/lib/generated/prisma/enums"
import type { BrowseFacets } from "@/models/experimental-report"
import { ColumnDef } from "@tanstack/react-table"
import { useQueryStates } from "nuqs"
import { type ReactNode } from "react"

type LabContentCounts = Record<LabView, number>

const experimentMemberColumn: ColumnDef<ExperimentEntry> = {
  id: "member",
  header: () => <DataTableColumnHeader field="member" title="Member" />,
  cell: ({ row }) => <MemberCell member={row.original.submitter} />,
}

const reportMemberColumn: ColumnDef<ReportEntry> = {
  id: "member",
  header: () => <DataTableColumnHeader field="member" title="Member" />,
  cell: ({ row }) => <MemberCell member={row.original.submitter} />,
}

const visibilityColumn: ColumnDef<PanelEntry> = {
  id: "visibility",
  header: "Visibility",
  cell: ({ row }) => (
    <Badge variant="outline">
      {VISIBILITY_LABELS[row.original.visibility as Visibility] ?? row.original.visibility}
    </Badge>
  ),
}

// Lab tables reuse the browse columns verbatim (same cells, same URL-driven sortable headers), adding the
// submitter/owner as a leading "Member" column and surfacing panel visibility (which is lab-only context).
const experimentTableColumns: ColumnDef<ExperimentEntry>[] = [experimentMemberColumn, ...experimentColumns]
const reportTableColumns: ColumnDef<ReportEntry>[] = [reportMemberColumn, ...reportColumns]
const panelTableColumns: ColumnDef<PanelEntry>[] = [...panelColumns, visibilityColumn]

const VIEW_LABELS: { value: LabView; label: string }[] = [
  { value: "experiments", label: "Experiments" },
  { value: "reports", label: "Reports" },
  { value: "panels", label: "Panels" },
]

function LabViewTabs({ counts }: { counts: LabContentCounts }) {
  const [params, setParams] = useQueryStates(labContentParsers, { shallow: false })

  return (
    <SegmentedTabs<LabView>
      items={VIEW_LABELS.map((view) => ({ ...view, count: counts[view.value] }))}
      value={params.view}
      label="Lab content view"
      onChange={(view) => setParams({ view, page: 1 })}
    />
  )
}

function LabContentToolbar({ counts, facets }: { counts: LabContentCounts; facets: BrowseFacets }) {
  const [params, setParams] = useQueryStates(labContentParsers, { shallow: false })

  const isActive = isLabContentParamsActive(params)

  const visibleDimensions = LAB_FILTER_DIMENSIONS.filter(
    (dimension) => dimension.tabs.includes(params.view) && (facets[dimension.key]?.length ?? 0) > 0,
  )

  return (
    <FacetFilterToolbar
      onReset={() =>
        setParams(
          clearedTableParams(LAB_FILTER_DIMENSIONS.map((dimension) => dimension.key)) as Parameters<
            typeof setParams
          >[0],
        )
      }
      isActive={isActive}
      dimensions={visibleDimensions}
      facets={facets}
      selected={(key) => (params[key as keyof typeof params] as string[]) ?? []}
      onFilterChange={(key, value) =>
        setParams({ [key]: value.length ? value : null, page: 1 } as Parameters<typeof setParams>[0])
      }
    >
      <LabViewTabs counts={counts} />
      <DebouncedSearchInput
        placeholder="Search by name, marker, tissue…"
        value={params.q}
        onCommit={(q) => setParams({ q: q || null, page: 1 })}
        className="h-8 w-[200px] lg:w-[280px]"
      />
    </FacetFilterToolbar>
  )
}

type LabContentProps = {
  counts: LabContentCounts
  facets: BrowseFacets
  page: number
  pageCount: number
  total: number
} & (
  | { view: "experiments"; rows: ExperimentEntry[] }
  | { view: "reports"; rows: ReportEntry[] }
  | { view: "panels"; rows: PanelEntry[] }
)

export function LabContent(props: LabContentProps) {
  const { counts, facets, page, pageCount, total } = props
  let table: ReactNode
  if (props.view === "experiments") {
    table = (
      <DataTable
        columns={experimentTableColumns}
        data={props.rows}
        emptyMessage="No experiments match these filters."
      />
    )
  } else if (props.view === "reports") {
    table = <DataTable columns={reportTableColumns} data={props.rows} emptyMessage="No reports match these filters." />
  } else {
    table = <DataTable columns={panelTableColumns} data={props.rows} emptyMessage="No panels match these filters." />
  }

  return (
    <div className="space-y-4">
      <LabContentToolbar counts={counts} facets={facets} />
      {table}
      <DataTablePagination page={page} pageCount={pageCount} total={total} />
    </div>
  )
}
