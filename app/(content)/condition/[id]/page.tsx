import { columns } from "@/components/browse/columns"
import { DetailsDataTable } from "@/components/browse/details-data-table"
import { ImageCarouselDialog } from "@/components/browse/image-carousel-dialog"
import { AddToPanelButton } from "@/components/panel/add-to-panel-button"
import { CustomBreadcrumbs } from "@/components/shared/custom-breadcrumbs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { aggregateMarkerEntries, getConditionById, getReportsForCondition } from "@/models/experimental-report"
import { ExternalLink } from "lucide-react"
import type { Metadata } from "next"
import { cacheLife } from "next/cache"
import { notFound } from "next/navigation"
import { Suspense } from "react"

interface ConditionPageProps {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({ params }: ConditionPageProps): Promise<Metadata> {
  const { id } = await params
  const condition = await getConditionById(decodeURIComponent(id))
  if (!condition) return { title: "Condition Not Found | PanelMaker" }
  return {
    title: `${condition.label} — Condition Markers | PanelMaker`,
    description: `Validated antibody markers and experimental reports for ${condition.label} in spatial proteomics and multiplex imaging.`,
  }
}

async function ConditionContent({ id }: { id: string }) {
  "use cache"
  cacheLife("hours")

  const condition = await getConditionById(id)

  if (!condition) {
    notFound()
  }

  const reports = await getReportsForCondition(id)
  const markers = aggregateMarkerEntries(reports)

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">{condition.label}</h1>
          <div className="flex items-center gap-2 text-muted-foreground mb-4">
            <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">{condition.id}</span>
            {markers.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {markers.length} marker{markers.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Related Markers</CardTitle>
            <CardDescription>Validated markers reported in {condition.label}.</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <DetailsDataTable columns={columns} data={markers} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>External Resources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <a
              href={`https://www.ebi.ac.uk/ols4/ontologies/doid/classes?obo_id=${encodeURIComponent(condition.id)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              View in Disease Ontology (OLS)
            </a>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="font-semibold">Images</h3>
          <ImageCarouselDialog images={[]} title={condition.label} />
        </div>

        {markers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add Markers to Panel</CardTitle>
              <CardDescription className="text-xs">
                Add {condition.label} markers directly to your panel.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {markers.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50">
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
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function ConditionContentSkeleton() {
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

export default async function ConditionPage({ params }: ConditionPageProps) {
  const { id } = await params
  const decodedId = decodeURIComponent(id)

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <CustomBreadcrumbs items={[{ label: "Conditions", href: "/browse" }, { label: decodedId }]} />
      <Suspense fallback={<ConditionContentSkeleton />}>
        <ConditionContent id={decodedId} />
      </Suspense>
    </div>
  )
}
