"use client"

import {
  experimentColumns,
  MemberCell,
  panelColumns,
  reportColumns,
  VISIBILITY_LABELS,
  type ExperimentEntry,
  type PanelEntry,
  type ReportEntry,
} from "@/components/browse/columns"
import { DataTable } from "@/components/browse/data-table"
import { DataTableColumnHeader } from "@/components/data-table/column-header"
import { DataTableFacetedFilter } from "@/components/data-table/faceted-filter"
import { DataTablePagination } from "@/components/data-table/pagination"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { isLabContentParamsActive, LAB_FILTER_DIMENSIONS, labContentParsers, type LabView } from "@/lib/data-table"
import { cn } from "@/lib/utils"
import type { BrowseFacets } from "@/models/experimental-report"
import { ColumnDef } from "@tanstack/react-table"
import { X } from "lucide-react"
import { useQueryStates } from "nuqs"
import { useEffect, useRef, useState, type ReactNode } from "react"

const SEARCH_DEBOUNCE_MS = 300

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
    <Badge variant="outline">{VISIBILITY_LABELS[row.original.visibility] ?? row.original.visibility}</Badge>
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
    <div className="inline-flex rounded-md border bg-muted p-0.5">
      {VIEW_LABELS.map((view) => (
        <Button
          key={view.value}
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 rounded-sm px-3 text-sm font-medium",
            params.view === view.value
              ? "bg-background text-foreground shadow-sm hover:bg-background"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setParams({ view: view.value, page: 1 })}
        >
          <span>{view.label}</span>
          <span className="text-muted-foreground tabular-nums">{counts[view.value]}</span>
        </Button>
      ))}
    </div>
  )
}

function LabContentToolbar({ counts, facets }: { counts: LabContentCounts; facets: BrowseFacets }) {
  const [params, setParams] = useQueryStates(labContentParsers, { shallow: false })
  const [search, setSearch] = useState(params.q)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    setSearch(params.q)
  }, [params.q])

  const onSearchChange = (value: string) => {
    setSearch(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setParams({ q: value || null, page: 1 })
    }, SEARCH_DEBOUNCE_MS)
  }

  const isActive = isLabContentParamsActive(params)

  const visibleDimensions = LAB_FILTER_DIMENSIONS.filter(
    (dimension) => dimension.tabs.includes(params.view) && (facets[dimension.key]?.length ?? 0) > 0,
  )

  const resetFilters = () =>
    setParams({
      q: null,
      sort: null,
      order: null,
      page: null,
      ...Object.fromEntries(LAB_FILTER_DIMENSIONS.map((dimension) => [dimension.key, null])),
    } as Parameters<typeof setParams>[0])

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <LabViewTabs counts={counts} />
        <Input
          placeholder="Search by name, marker, tissue..."
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="h-8 w-[200px] lg:w-[280px]"
        />
      </div>
      {(visibleDimensions.length > 0 || isActive) && (
        <div className="flex flex-wrap items-center gap-2">
          {visibleDimensions.map((dimension) => (
            <DataTableFacetedFilter
              key={dimension.key}
              title={dimension.title}
              options={facets[dimension.key] ?? []}
              value={(params[dimension.key as keyof typeof params] as string[]) ?? []}
              onChange={(value) =>
                setParams({ [dimension.key]: value.length ? value : null, page: 1 } as Parameters<typeof setParams>[0])
              }
            />
          ))}
          {isActive && (
            <Button variant="secondary" size="sm" className="h-8 px-2 lg:px-3" onClick={resetFilters}>
              <X className="h-4 w-4" />
              Reset
            </Button>
          )}
        </div>
      )}
    </div>
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
  const pagination = <DataTablePagination page={page} pageCount={pageCount} total={total} />

  let table: ReactNode
  if (props.view === "experiments") {
    table = <DataTable columns={experimentTableColumns} data={props.rows} pagination={pagination} />
  } else if (props.view === "reports") {
    table = <DataTable columns={reportTableColumns} data={props.rows} pagination={pagination} />
  } else {
    table = <DataTable columns={panelTableColumns} data={props.rows} pagination={pagination} />
  }

  return (
    <div className="space-y-4">
      <LabContentToolbar counts={counts} facets={facets} />
      {table}
    </div>
  )
}
