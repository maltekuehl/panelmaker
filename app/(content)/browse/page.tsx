import { columns } from "@/components/browse/columns"
import { DataTable } from "@/components/browse/data-table"
import { MarkerTableToolbar } from "@/components/browse/marker-table-toolbar"
import { DataTablePagination } from "@/components/data-table/pagination"
import { Skeleton } from "@/components/ui/skeleton"
import { browseMarkerParsers, type BrowseMarkerParams } from "@/lib/data-table"
import { getMarkerEntriesPage } from "@/models/experimental-report"
import type { Metadata } from "next"
import { cacheLife, cacheTag } from "next/cache"
import { createLoader, type SearchParams } from "nuqs/server"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "PanelMaker — Browse Markers, Antibodies & Cell Types",
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
    title: "PanelMaker — Browse Markers, Antibodies & Cell Types",
    description:
      "Browse validated cell type markers and antibodies to design panels for spatial proteomics experiments.",
    type: "website",
    url: "https://panelmaker.ai/browse",
    siteName: "PanelMaker",
  },
  twitter: {
    card: "summary_large_image",
    title: "PanelMaker — Browse Markers, Antibodies & Cell Types",
    description: "Browse validated markers and antibodies for spatial proteomics panel design",
  },
}

const loadSearchParams = createLoader(browseMarkerParsers)

interface BrowsePageProps {
  searchParams: Promise<SearchParams>
}

async function MarkerTable({ params }: { params: BrowseMarkerParams }) {
  "use cache"
  cacheLife("hours")
  cacheTag("browse-markers")

  const { rows, total, page, pageCount } = await getMarkerEntriesPage(params)

  return (
    <DataTable
      columns={columns}
      data={rows}
      pagination={<DataTablePagination page={page} pageCount={pageCount} total={total} />}
    />
  )
}

function MarkerTableSkeleton() {
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

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Marker Database</h1>
        <p className="text-muted-foreground mt-1">
          {params.q
            ? `Showing results for “${params.q}”`
            : "Browse validated cell type markers to inform your panel design."}
        </p>
      </div>
      <div className="space-y-4">
        <MarkerTableToolbar />
        <Suspense key={JSON.stringify(params)} fallback={<MarkerTableSkeleton />}>
          <MarkerTable params={params} />
        </Suspense>
      </div>
    </div>
  )
}
