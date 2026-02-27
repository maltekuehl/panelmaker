import { ImageCarouselDialog } from "@/components/browse/image-carousel-dialog"
import { MarkerUsagesTable } from "@/components/browse/marker-usages-table"
import { RelatedCellTypesTable } from "@/components/browse/related-cell-types-table"
import { CustomBreadcrumbs } from "@/components/shared/custom-breadcrumbs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getCellTypesForMarker, getMarker } from "@/lib/mock-data"
import { ExternalLink, Plus } from "lucide-react"
import { notFound } from "next/navigation"

interface MarkerPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function MarkerPage({ params }: MarkerPageProps) {
  const { id } = await params
  const marker = await getMarker(id)

  if (!marker) {
    notFound()
  }

  const relatedCellTypes = await getCellTypesForMarker(id)

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <CustomBreadcrumbs items={[{ label: "Markers", href: "/" }, { label: marker.marker }]} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl font-bold tracking-tight">{marker.marker}</h1>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add to Panel
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-muted-foreground mb-4">
              <Badge variant="outline">{marker.species}</Badge>
              <Badge variant="outline">{marker.tissue}</Badge>
              {marker.validatedMethods.map((method) => (
                <Badge
                  key={method}
                  variant="secondary"
                  className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                >
                  {method}
                </Badge>
              ))}
            </div>

            <div className="prose prose-sm max-w-none text-muted-foreground">
              <p>{marker.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="p-3 bg-zinc-50 rounded-lg border">
                <span className="text-xs font-medium text-muted-foreground block mb-1">Protein Name</span>
                <span className="text-sm font-medium">{marker.proteinName}</span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-lg border">
                <span className="text-xs font-medium text-muted-foreground block mb-1">Gene ID</span>
                <span className="text-sm font-mono">{marker.geneId}</span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-lg border">
                <span className="text-xs font-medium text-muted-foreground block mb-1">Subcellular Location</span>
                <span className="text-sm font-medium">{marker.subcellularLocation || "N/A"}</span>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Experimental Reports</CardTitle>
              <CardDescription>Detailed usage reports and validation data from various experiments.</CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <MarkerUsagesTable data={marker.usages || []} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Associated Cell Types</CardTitle>
              <CardDescription>Cell types known to express {marker.marker}.</CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <RelatedCellTypesTable data={relatedCellTypes} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>External Resources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {marker.uniprotId !== "N/A" && (
                <a
                  href={`https://www.uniprot.org/uniprotkb/${marker.uniprotId}/entry`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  View in UniProt ({marker.uniprotId})
                </a>
              )}
              <a
                href={`https://www.proteinatlas.org/search/${marker.marker}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                View in Human Protein Atlas
              </a>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold">Images</h3>
            <ImageCarouselDialog images={marker.images} title={marker.marker} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Validation Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div
                  className={`h-3 w-3 rounded-full ${
                    marker.validationCategory >= 4
                      ? "bg-green-500"
                      : marker.validationCategory === 3
                        ? "bg-yellow-500"
                        : "bg-zinc-300"
                  }`}
                />
                <span className="font-medium">Level {marker.validationCategory}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {marker.validationCategory === 4
                  ? "Expert Confirmed"
                  : marker.validationCategory === 3
                    ? "Systematic Review"
                    : "Community Submitted"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
