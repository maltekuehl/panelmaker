import { columns } from "@/components/browse/columns"
import { DetailsDataTable } from "@/components/browse/details-data-table"
import { ImageCarouselDialog } from "@/components/browse/image-carousel-dialog"
import { CustomBreadcrumbs } from "@/components/shared/custom-breadcrumbs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getCellType, getMarkersForCellType } from "@/lib/mock-data"
import { ExternalLink } from "lucide-react"
import { notFound } from "next/navigation"

interface CellTypePageProps {
  params: Promise<{
    id: string
  }>
}

export default async function CellTypePage({ params }: CellTypePageProps) {
  const { id } = await params
  const cellType = await getCellType(id)

  if (!cellType) {
    notFound()
  }

  const markers = await getMarkersForCellType(id)

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <CustomBreadcrumbs
        items={[
          { label: "Cell Types", href: "/" }, // Assuming home is the browse page
          { label: cellType.name },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">{cellType.name}</h1>
            <div className="flex items-center gap-2 text-muted-foreground mb-4">
              <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">{cellType.ontologyId}</span>
              {cellType.synonyms.map((syn) => (
                <Badge key={syn} variant="secondary" className="text-xs">
                  {syn}
                </Badge>
              ))}
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed">{cellType.description}</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Related Markers</CardTitle>
              <CardDescription>Validated markers associated with {cellType.name}.</CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <DetailsDataTable columns={columns} data={markers} hiddenColumns={["cellType"]} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>External Resources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <a
                href={`https://www.ebi.ac.uk/ols/ontologies/cl/terms?iri=http://purl.obolibrary.org/obo/${cellType.ontologyId.replace(
                  ":",
                  "_",
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                View in Cell Ontology (OLS)
              </a>
              {/* Add more links as needed */}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold">Images</h3>
            <ImageCarouselDialog images={cellType.images} title={cellType.name} />
          </div>

          {/* Placeholder for "Add to Panel" or other actions */}
          <Card className="bg-zinc-50 border-dashed">
            <CardContent className="p-6 text-center text-muted-foreground text-sm">
              Panel construction actions coming soon.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
