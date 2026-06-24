import { AntibodyUsagesTable } from "@/components/browse/antibody-usages-table"
import { ImageCarouselDialog } from "@/components/browse/image-carousel-dialog"
import { AddToPanelButton } from "@/components/panel/add-to-panel-button"
import { CustomBreadcrumbs } from "@/components/shared/custom-breadcrumbs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { resolveAntibodyByRrid } from "@/models/antibody"
import { getReportsForAntibody, toReportUsage } from "@/models/experimental-report"
import { ExternalLink } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"

interface AntibodyPageProps {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({ params }: AntibodyPageProps): Promise<Metadata> {
  const { id } = await params
  const decodedId = decodeURIComponent(id)
  const rrid = decodedId.startsWith("RRID:") ? decodedId : `RRID:${decodedId}`
  const antibody = await resolveAntibodyByRrid(rrid)
  if (!antibody) return { title: "Antibody Not Found | PanelMaker" }
  return {
    title: `${antibody.name} (${rrid}) | PanelMaker`,
    description: `Experimental validation reports and usage data for ${antibody.name} from ${antibody.vendorName ?? "unknown vendor"} in spatial proteomics.`,
  }
}

async function AntibodyContent({ rrid, displayId }: { rrid: string; displayId: string }) {
  const antibody = await resolveAntibodyByRrid(rrid)

  if (!antibody) {
    notFound()
  }

  const reports = await getReportsForAntibody(antibody.id)
  const usages = reports.map(toReportUsage)
  const images = usages.flatMap((u) => u.images)

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold tracking-tight text-balance">{antibody.name}</h1>
            <div className="flex items-center gap-2">
              <AddToPanelButton
                antibodyId={antibody.id}
                proteinId={antibody.targetProtein?.id}
                label={antibody.name}
                size="sm"
                className="gap-2"
              />
              <Badge variant="outline" className="font-mono">
                {rrid}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-muted-foreground mb-4">
            <Badge variant="secondary">{antibody.vendorName ?? "Unknown Vendor"}</Badge>
            <Badge variant="outline">Cat: {antibody.catalogNumber ?? "N/A"}</Badge>
            {antibody.clonality && <Badge variant="outline">{antibody.clonality}</Badge>}
            {antibody.targetName && <Badge variant="outline">Target: {antibody.targetName}</Badge>}
            {antibody.sourceOrganism && <Badge variant="outline">Host: {antibody.sourceOrganism}</Badge>}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-sm">
            <span>
              <span className="text-muted-foreground">Clone ID: </span>
              <span className="font-medium">{antibody.cloneId ?? "N/A"}</span>
            </span>
            <span>
              <span className="text-muted-foreground">Conjugate: </span>
              <span className="font-medium">{antibody.conjugate ?? "Unconjugated"}</span>
            </span>
            {antibody.targetProtein && (
              <span>
                <span className="text-muted-foreground">Target: </span>
                <Link
                  href={`/marker/${antibody.targetProtein.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {antibody.targetProtein.label} ({antibody.targetProtein.geneSymbol})
                </Link>
              </span>
            )}
            <span>
              <span className="text-muted-foreground">Citations: </span>
              <span className="font-medium tabular-nums">{antibody.citationCount ?? 0}</span>
            </span>
          </div>
        </div>

        <div className="space-y-4 border-t pt-6">
          <div>
            <h2 className="text-lg font-semibold">Experimental Reports</h2>
            <p className="text-sm text-muted-foreground">Documented usage of this antibody in various experiments.</p>
          </div>
          <AntibodyUsagesTable data={usages} />
        </div>
      </div>

      <div className="space-y-6">
        {images.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Images</h3>
            <ImageCarouselDialog images={images} title={antibody.name} />
          </div>
        )}

        <div className="space-y-3 border-t pt-6">
          <h3 className="font-semibold">External Resources</h3>
          <a
            href={`https://scicrunch.org/resolver/${displayId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted"
          >
            <div className="space-y-1">
              <div className="font-medium transition-colors group-hover:text-primary">Antibody Registry</div>
              <div className="text-xs text-muted-foreground">View full record on SciCrunch</div>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
          {antibody.vendorUrl && (
            <a
              href={antibody.vendorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted"
            >
              <div className="space-y-1">
                <div className="font-medium transition-colors group-hover:text-primary">
                  {antibody.vendorName ?? "Vendor"}
                </div>
                <div className="text-xs text-muted-foreground">View on vendor website</div>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function AntibodyContentSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-6">
        <div>
          <Skeleton className="h-9 w-72 mb-2" />
          <div className="flex gap-2 mb-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-6 w-20" />
          </div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  )
}

export default async function AntibodyPage({ params }: AntibodyPageProps) {
  const { id } = await params
  const decodedId = decodeURIComponent(id)
  const rrid = decodedId.startsWith("RRID:") ? decodedId : `RRID:${decodedId}`
  const displayId = decodedId.replace(/^RRID:/, "")

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <CustomBreadcrumbs items={[{ label: "Antibodies", href: "/browse" }, { label: displayId }]} />
      <Suspense fallback={<AntibodyContentSkeleton />}>
        <AntibodyContent rrid={rrid} displayId={displayId} />
      </Suspense>
    </div>
  )
}
