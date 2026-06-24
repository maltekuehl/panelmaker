import { columns } from "@/components/browse/columns"
import { DetailsDataTable } from "@/components/browse/details-data-table"
import { ImageCarouselDialog } from "@/components/browse/image-carousel-dialog"
import { AddToPanelButton } from "@/components/panel/add-to-panel-button"
import { CustomBreadcrumbs } from "@/components/shared/custom-breadcrumbs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getCellTypeById } from "@/models/cell-type"
import { aggregateMarkerEntries, getReportsForCellType } from "@/models/experimental-report"
import { ExternalLink } from "lucide-react"
import type { Metadata } from "next"
import { cacheLife } from "next/cache"
import { notFound } from "next/navigation"
import { Suspense } from "react"

interface CellTypePageProps {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({ params }: CellTypePageProps): Promise<Metadata> {
  const { id } = await params
  const cellType = await getCellTypeById(decodeURIComponent(id))
  if (!cellType) return { title: "Cell Type Not Found | PanelMaker" }
  return {
    title: `${cellType.label} — Cell Type Markers | PanelMaker`,
    description: `Validated antibody markers and experimental reports for ${cellType.label} in spatial proteomics and multiplex imaging.`,
  }
}

async function CellTypeContent({ id }: { id: string }) {
  "use cache"
  cacheLife("hours")

  const cellType = await getCellTypeById(id)

  if (!cellType) {
    notFound()
  }

  const reports = await getReportsForCellType(id)
  const markers = aggregateMarkerEntries(reports)

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">{cellType.label}</h1>
          <div className="flex items-center gap-2 text-muted-foreground mb-4">
            <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">{cellType.id}</span>
            {markers.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {markers.length} marker{markers.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-4 border-t pt-6">
          <div>
            <h2 className="text-lg font-semibold">Related Markers</h2>
            <p className="text-sm text-muted-foreground">Validated markers associated with {cellType.label}.</p>
          </div>
          <DetailsDataTable columns={columns} data={markers} hiddenColumns={["cellType"]} />
        </div>

        <div className="space-y-3 border-t pt-6">
          <h2 className="text-lg font-semibold">External Resources</h2>
          <a
            href={`https://www.ebi.ac.uk/ols4/ontologies/cl/classes?obo_id=${encodeURIComponent(cellType.id)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            View in Cell Ontology (OLS)
          </a>
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="font-semibold">Images</h3>
          <ImageCarouselDialog images={[]} title={cellType.label} />
        </div>

        {markers.length > 0 && (
          <div className="space-y-3 border-t pt-6">
            <div>
              <h3 className="font-semibold">Add Markers to Panel</h3>
              <p className="text-xs text-muted-foreground">Add {cellType.label} markers directly to your panel.</p>
            </div>
            <div className="space-y-1">
              {markers.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-muted/50">
                  <span className="text-sm font-medium">{m.marker}</span>
                  <AddToPanelButton
                    proteinId={m.id}
                    label={m.marker}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CellTypeContentSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-6">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <div className="flex gap-2 mb-4">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  )
}

export default async function CellTypePage({ params }: CellTypePageProps) {
  const { id } = await params
  const decodedId = decodeURIComponent(id)

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <CustomBreadcrumbs items={[{ label: "Cell Types", href: "/browse" }, { label: decodedId }]} />
      <Suspense fallback={<CellTypeContentSkeleton />}>
        <CellTypeContent id={decodedId} />
      </Suspense>
    </div>
  )
}
