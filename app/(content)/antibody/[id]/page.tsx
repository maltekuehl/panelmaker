import { getAntibodyDetails } from "@/app/actions/get-antibody-details"
import { AntibodyUsagesTable } from "@/components/browse/antibody-usages-table"
import { ImageCarouselDialog } from "@/components/browse/image-carousel-dialog"
import { CustomBreadcrumbs } from "@/components/shared/custom-breadcrumbs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getUsagesForAntibody } from "@/lib/mock-data"
import { ExternalLink } from "lucide-react"
import { notFound } from "next/navigation"

interface AntibodyPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function AntibodyPage({ params }: AntibodyPageProps) {
  const { id } = await params
  const decodedId = decodeURIComponent(id)
  // Handle both "RRID:AB_123" and "AB_123" formats
  const rrid = decodedId.startsWith("RRID:") ? decodedId : `RRID:${decodedId}`
  const displayId = decodedId.replace(/^RRID:/, "")

  const [details, usages] = await Promise.all([getAntibodyDetails(rrid), getUsagesForAntibody(rrid)])

  if (!details && usages.length === 0) {
    notFound()
  }

  // Fallback details if API fails but we have usages
  const antibodyName = details?.name || usages[0]?.antibodyVendor + " " + usages[0]?.clone || displayId
  const vendor = details?.vendor || usages[0]?.antibodyVendor || "Unknown Vendor"
  const catalogNum = details?.catalogNumber || "Unknown Catalog #"

  // Aggregate images from all usages
  const images = usages.flatMap((usage) => usage.images || [])

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <CustomBreadcrumbs items={[{ label: "Antibodies", href: "/" }, { label: displayId }]} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl font-bold tracking-tight text-balance">{antibodyName}</h1>
              <Badge variant="outline" className="font-mono">
                {rrid}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-muted-foreground mb-4">
              <Badge variant="secondary">{vendor}</Badge>
              <Badge variant="outline">Cat: {catalogNum}</Badge>
              {details?.clonality && <Badge variant="outline">{details.clonality}</Badge>}
              {details?.target && <Badge variant="outline">Target: {details.target}</Badge>}
            </div>

            <div className="prose prose-sm max-w-none text-muted-foreground">
              <p>{details?.description || "No description available from Antibody Registry."}</p>
            </div>

            {details && (
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="p-3 bg-zinc-50 rounded-lg border">
                  <span className="text-xs font-medium text-muted-foreground block mb-1">Clone ID</span>
                  <span className="text-sm font-medium">{details.cloneId || "N/A"}</span>
                </div>
                <div className="p-3 bg-zinc-50 rounded-lg border">
                  <span className="text-xs font-medium text-muted-foreground block mb-1">Citation</span>
                  <span className="text-sm font-mono break-all text-[10px]">{details.citation}</span>
                </div>
              </div>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Experimental Reports</CardTitle>
              <CardDescription>Documented usage of this antibody in various experiments.</CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <AntibodyUsagesTable data={usages} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {images.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Images</h3>
              <ImageCarouselDialog images={images} title={antibodyName} />
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>External Resources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <a
                href={`https://scicrunch.org/resolver/${displayId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors group"
              >
                <div className="space-y-1">
                  <div className="font-medium group-hover:text-primary transition-colors">Antibody Registry</div>
                  <div className="text-xs text-muted-foreground">View full record on SciCrunch</div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
              {vendor !== "Unknown Vendor" && (
                <div className="p-3 rounded-lg border bg-muted/50">
                  <div className="text-xs text-muted-foreground mb-1">Google Search</div>
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(`${vendor} ${catalogNum} antibody`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium hover:underline flex items-center gap-1 text-primary"
                  >
                    Search Vendor Page
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
