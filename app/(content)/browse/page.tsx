import { antibodyColumns, columns, reportColumns } from "@/components/browse/columns"
import { DataTable } from "@/components/browse/data-table"
import { MarkerTableToolbar } from "@/components/browse/marker-table-toolbar"
import { DataTablePagination } from "@/components/data-table/pagination"
import { Skeleton } from "@/components/ui/skeleton"
import { browseMarkerParsers, type BrowseMarkerParams } from "@/lib/data-table"
import {
  getAntibodyEntriesPage,
  getBrowseFacets,
  getMarkerEntriesPage,
  getReportEntriesPage,
  type BrowseFacets,
} from "@/models/experimental-report"
import type { Metadata } from "next"
import { cacheLife, cacheTag } from "next/cache"
import { createLoader, type SearchParams } from "nuqs/server"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "PanelMaker — Browse Markers, Antibodies & Reports",
  description:
    "Browse validated cell type markers, antibodies, and experimental reports to design antibody panels for spatial proteomics experiments.",
  keywords: [
    "PanelMaker",
    "spatial proteomics",
    "antibody panel",
    "markers",
    "cell types",
    "experimental reports",
    "CODEX",
    "CyCIF",
    "IMC",
    "MIBI",
    "Visium",
    "bioinformatics",
    "computational biology",
  ],
  openGraph: {
    title: "PanelMaker — Browse Markers, Antibodies & Reports",
    description:
      "Browse validated cell type markers and antibodies to design panels for spatial proteomics experiments.",
    type: "website",
    url: "https://panelmaker.ai/browse",
    siteName: "PanelMaker",
  },
  twitter: {
    card: "summary_large_image",
    title: "PanelMaker — Browse Markers, Antibodies & Reports",
    description: "Browse validated markers and antibodies for spatial proteomics panel design",
  },
}

const loadSearchParams = createLoader(browseMarkerParsers)

interface BrowsePageProps {
  searchParams: Promise<SearchParams>
}

async function cachedFacets(): Promise<BrowseFacets> {
  "use cache"
  cacheLife("hours")
  cacheTag("browse-facets")
  return getBrowseFacets()
}

async function BrowseTable({ params }: { params: BrowseMarkerParams }) {
  "use cache"
  cacheLife("hours")
  cacheTag("browse")

  if (params.mode === "antibodies") {
    const { rows, total, page, pageCount } = await getAntibodyEntriesPage(params)
    return (
      <DataTable
        columns={antibodyColumns}
        data={rows}
        pagination={<DataTablePagination page={page} pageCount={pageCount} total={total} />}
      />
    )
  }

  if (params.mode === "reports") {
    const { rows, total, page, pageCount } = await getReportEntriesPage(params)
    return (
      <DataTable
        columns={reportColumns}
        data={rows}
        pagination={<DataTablePagination page={page} pageCount={pageCount} total={total} />}
      />
    )
  }

  const { rows, total, page, pageCount } = await getMarkerEntriesPage(params)
  return (
    <DataTable
      columns={columns}
      data={rows}
      pagination={<DataTablePagination page={page} pageCount={pageCount} total={total} />}
    />
  )
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

  const modeLabel = params.mode === "antibodies" ? "Antibodies" : params.mode === "reports" ? "Reports" : "Markers"

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
