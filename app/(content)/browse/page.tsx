import { columns } from "@/components/browse/columns"
import { DataTable } from "@/components/browse/data-table"
import { Skeleton } from "@/components/ui/skeleton"
import { aggregateMarkerEntries, getAllReports } from "@/models/experimental-report"
import type { Metadata } from "next"
import { cacheLife, cacheTag } from "next/cache"
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

interface BrowsePageProps {
  searchParams: Promise<{ q?: string }>
}

async function MarkerTable({ q }: { q?: string }) {
  "use cache"
  cacheLife("hours")
  cacheTag("browse-markers")

  const reports = await getAllReports({ limit: 100, q })
  const markers = aggregateMarkerEntries(reports)

  return <DataTable columns={columns} data={markers} />
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
  const { q } = await searchParams

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Marker Database</h1>
        <p className="text-muted-foreground mt-1">
          {q ? `Showing results for “${q}”` : "Browse validated cell type markers to inform your panel design."}
        </p>
      </div>
      <Suspense fallback={<MarkerTableSkeleton />}>
        <MarkerTable q={q} />
      </Suspense>
    </div>
  )
}
