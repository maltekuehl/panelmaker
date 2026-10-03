import { columns, type MarkerEntry } from "@/components/browse/columns"
import { DetailsDataTable } from "@/components/browse/details-data-table"
import type { CarouselImage } from "@/components/browse/image-carousel-dialog"
import { AsideSection, DetailLayout, DetailSection, ImagesSection } from "@/components/detail/detail-layout"
import { ExternalResourceLink } from "@/components/detail/resource-link"
import { AddToPanelButton } from "@/components/panel/add-to-panel-button"
import { CustomBreadcrumbs } from "@/components/shared/custom-breadcrumbs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

interface TermMarkerDetailProps {
  parent: { label: string; href: string }
  term: { id: string; label: string }
  markers: MarkerEntry[]
  images: CarouselImage[]
  markersDescription: string
  hiddenColumns?: string[]
  externalLink: { href: string; label: string }
}

export function TermMarkerDetail({
  parent,
  term,
  markers,
  images,
  markersDescription,
  hiddenColumns,
  externalLink,
}: TermMarkerDetailProps) {
  return (
    <>
      <CustomBreadcrumbs items={[parent, { label: term.label }]} />
      <DetailLayout
        aside={
          <>
            {images.length > 0 && <ImagesSection images={images} title={term.label} />}
            {markers.length > 0 && (
              <AsideSection
                title="Add Markers to Panel"
                description={`Add ${term.label} markers directly to your panel.`}
              >
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
              </AsideSection>
            )}
          </>
        }
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">{term.label}</h1>
          <div className="flex items-center gap-2 text-muted-foreground mb-4">
            <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">{term.id}</span>
            {markers.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {markers.length} marker{markers.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </div>

        <DetailSection title="Related Markers" description={markersDescription}>
          <DetailsDataTable columns={columns} data={markers} hiddenColumns={hiddenColumns} />
        </DetailSection>

        <DetailSection title="External Resources">
          <ExternalResourceLink href={externalLink.href}>{externalLink.label}</ExternalResourceLink>
        </DetailSection>
      </DetailLayout>
    </>
  )
}

export function TermMarkerDetailSkeleton() {
  return (
    <>
      <Skeleton className="h-5 w-64" />
      <DetailLayout
        aside={
          <>
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-20 w-full" />
          </>
        }
      >
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <div className="flex gap-2 mb-4">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-24 w-full" />
      </DetailLayout>
    </>
  )
}
