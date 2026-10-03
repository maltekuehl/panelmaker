import { antibodyColumns, columns, experimentColumns, panelColumns, reportColumns } from "@/components/browse/columns"
import { DataTable } from "@/components/browse/data-table"
import { MarkerTableToolbar } from "@/components/browse/marker-table-toolbar"
import { DataTablePagination } from "@/components/data-table/pagination"
import { Skeleton } from "@/components/ui/skeleton"
import type { EntriesPage } from "@/lib/data-table"
import { browseMarkerParsers, type BrowseMarkerParams, type BrowseMode } from "@/lib/data-table"
import { getExperimentEntriesPage } from "@/models/experiment"
import {
  getAntibodyEntriesPage,
  getBrowseFacets,
  getMarkerEntriesPage,
  getReportEntriesPage,
  type BrowseFacets,
} from "@/models/experimental-report"
import { getPanelEntriesPage } from "@/models/panel"
import type { ColumnDef } from "@tanstack/react-table"
import type { Metadata } from "next"
import { cacheLife, cacheTag } from "next/cache"
import { createLoader, type SearchParams } from "nuqs/server"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "Browse markers, antibodies and reports | PanelMaker",
  description:
    "Browse validated cell type markers, antibodies, and experimental reports to design antibody panels for spatial proteomics experiments.",
  openGraph: {
    title: "Browse markers, antibodies and reports | PanelMaker",
    description:
      "Browse validated cell type markers and antibodies to design panels for spatial proteomics experiments.",
    type: "website",
    url: "/browse",
    siteName: "PanelMaker",
  },
  twitter: {
    card: "summary_large_image",
    title: "Browse markers, antibodies and reports | PanelMaker",
    description: "Browse validated markers and antibodies for spatial proteomics panel design",
  },
}

const loadSearchParams = createLoader(browseMarkerParsers)

const MODE_LABELS: Record<BrowseMode, string> = {
  markers: "Markers",
  antibodies: "Antibodies",
  reports: "Reports",
  experiments: "Experiments",
  panels: "Panels",
}

interface BrowsePageProps {
  searchParams: Promise<SearchParams>
}

async function cachedFacets(): Promise<BrowseFacets> {
  "use cache"
  cacheLife("hours")
  cacheTag("browse-facets")
  return getBrowseFacets()
}

interface PagedTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  result: Pick<EntriesPage<TData>, "rows" | "total" | "page" | "pageCount">
  emptyMessage: string
}

function PagedTable<TData, TValue>({ columns, result, emptyMessage }: PagedTableProps<TData, TValue>) {
  return (
    <>
      <DataTable columns={columns} data={result.rows} emptyMessage={emptyMessage} />
      <DataTablePagination page={result.page} pageCount={result.pageCount} total={result.total} />
    </>
  )
}

async function BrowseTable({ params }: { params: BrowseMarkerParams }) {
  "use cache"
  cacheLife("hours")
  cacheTag("browse")

  switch (params.mode) {
    case "antibodies":
      return (
        <PagedTable
          columns={antibodyColumns}
          result={await getAntibodyEntriesPage(params)}
          emptyMessage="No antibodies match these filters."
        />
      )
    case "reports":
      return (
        <PagedTable
          columns={reportColumns}
          result={await getReportEntriesPage(params)}
          emptyMessage="No reports match these filters."
        />
      )
    case "experiments":
      return (
        <PagedTable
          columns={experimentColumns}
          result={await getExperimentEntriesPage(params)}
          emptyMessage="No experiments match these filters."
        />
      )
    case "panels":
      return (
        <PagedTable
          columns={panelColumns}
          result={await getPanelEntriesPage(params)}
          emptyMessage="No shared panels match these filters."
        />
      )
    case "markers":
      return (
        <PagedTable
          columns={columns}
          result={await getMarkerEntriesPage(params)}
          emptyMessage="No markers match these filters."
        />
      )
  }
}

function BrowseTableSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  )
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const params = await loadSearchParams(searchParams)
  const facets = await cachedFacets()

  const modeLabel = MODE_LABELS[params.mode]

  return (
    <div className="container mx-auto space-y-6 px-4 py-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Browse</h1>
        <p className="mt-1 text-muted-foreground">
          {params.q
            ? `Showing ${modeLabel.toLowerCase()} results for "${params.q}"`
            : "Explore markers, antibodies, and experimental reports to inform your panel design."}
        </p>
      </div>
      <div className="space-y-4">
        <MarkerTableToolbar facets={facets} />
        <Suspense key={`${params.mode}-${JSON.stringify(params)}`} fallback={<BrowseTableSkeleton />}>
          <BrowseTable params={params} />
        </Suspense>
      </div>
    </div>
  )
}
