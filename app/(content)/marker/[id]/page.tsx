import { ImageCarouselDialog } from "@/components/browse/image-carousel-dialog"
import { MarkerUsagesTable } from "@/components/browse/marker-usages-table"
import { RelatedCellTypesTable } from "@/components/browse/related-cell-types-table"
import { AddToPanelButton } from "@/components/panel/add-to-panel-button"
import { CustomBreadcrumbs } from "@/components/shared/custom-breadcrumbs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getCellTypesFromReports, getReportsForProtein, toReportUsage } from "@/models/experimental-report"
import { getProteinById } from "@/models/protein"
import { ExternalLink } from "lucide-react"
import type { Metadata } from "next"
import { cacheLife } from "next/cache"
import { notFound } from "next/navigation"
import { Suspense } from "react"

interface MarkerPageProps {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({ params }: MarkerPageProps): Promise<Metadata> {
  const { id } = await params
  const protein = await getProteinById(decodeURIComponent(id))
  if (!protein) return { title: "Marker Not Found | PanelMaker" }
  return {
    title: `${protein.label} — Spatial Proteomics Marker | PanelMaker`,
    description: `Validated antibody reports, cell type associations, and experimental data for ${protein.label}${protein.geneSymbol ? ` (${protein.geneSymbol})` : ""} in spatial proteomics.`,
  }
}

async function MarkerContent({ id }: { id: string }) {
  "use cache"
  cacheLife("hours")

  const protein = await getProteinById(id)

  if (!protein) {
    notFound()
  }

  const [reports, relatedCellTypes] = await Promise.all([
    getReportsForProtein(protein.id),
    getCellTypesFromReports(protein.id),
  ])

  const usages = reports.map(toReportUsage)
  const images = usages.flatMap((u) => u.images)
  const methods = [...new Set(reports.map((r) => r.experiment.method).filter(Boolean))]
  const species = [...new Set(reports.map((r) => r.experiment.species?.label).filter(Boolean))]
  const uniqueAntibodies = new Set(usages.map((u) => u.antibodyId).filter(Boolean)).size
  const contributors = new Set(usages.map((u) => u.submitterId ?? u.submitter).filter(Boolean)).size
  const worksCount = usages.filter((u) => u.works === true).length

  const cellTypesForTable = relatedCellTypes.map((ct) => ({
    id: ct.id,
    name: ct.label,
    ontologyId: ct.id,
    description: "",
  }))

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold tracking-tight">{protein.label}</h1>
            <AddToPanelButton proteinId={protein.id} label={protein.label} size="sm" className="gap-2" />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-muted-foreground mb-4">
            {species.map((s) => (
              <Badge key={s} variant="outline">
                {s}
              </Badge>
            ))}
            {methods.map((method) => (
              <Badge
                key={method}
                variant="secondary"
                className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20"
              >
                {method}
              </Badge>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-sm">
            <span>
              <span className="text-muted-foreground">Gene Symbol: </span>
              <span className="font-medium">{protein.geneSymbol ?? "N/A"}</span>
            </span>
            <span>
              <span className="text-muted-foreground">Ensembl: </span>
              <span className="font-mono">{protein.ensemblGeneId ?? "N/A"}</span>
            </span>
            <span>
              <span className="text-muted-foreground">UniProt: </span>
              <span className="font-mono">{protein.id}</span>
            </span>
          </div>
        </div>

        <div className="space-y-4 border-t pt-6">
          <div>
            <h2 className="text-lg font-semibold">Experimental Reports</h2>
            <p className="text-sm text-muted-foreground">
              Detailed usage reports and validation data from various experiments.
            </p>
          </div>
          <MarkerUsagesTable data={usages} />
        </div>

        <div className="space-y-4 border-t pt-6">
          <div>
            <h2 className="text-lg font-semibold">Associated Cell Types</h2>
            <p className="text-sm text-muted-foreground">Cell types known to express {protein.label}.</p>
          </div>
          <RelatedCellTypesTable data={cellTypesForTable} />
        </div>

        <div className="space-y-3 border-t pt-6">
          <h2 className="text-lg font-semibold">External Resources</h2>
          <a
            href={`https://www.uniprot.org/uniprotkb/${protein.id}/entry`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            View in UniProt ({protein.id})
          </a>
          <a
            href={`https://www.proteinatlas.org/search/${protein.geneSymbol ?? protein.label}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            View in Human Protein Atlas
          </a>
          {protein.ensemblGeneId && (
            <a
              href={`https://www.ensembl.org/Homo_sapiens/Gene/Summary?g=${protein.ensemblGeneId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              View in Ensembl ({protein.ensemblGeneId})
            </a>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="font-semibold">Images</h3>
          <ImageCarouselDialog images={images} title={protein.label} />
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold">At a glance</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Reports</dt>
              <dd className="font-medium tabular-nums">{reports.length}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Validated (works)</dt>
              <dd className="font-medium tabular-nums">{worksCount}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Antibodies</dt>
              <dd className="font-medium tabular-nums">{uniqueAntibodies}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Contributors</dt>
              <dd className="font-medium tabular-nums">{contributors}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Cell types</dt>
              <dd className="font-medium tabular-nums">{relatedCellTypes.length}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}

function MarkerContentSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-6">
        <div>
          <Skeleton className="h-9 w-64 mb-4" />
          <div className="flex gap-2 mb-4">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-20" />
          </div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-28" />
          </div>
        </div>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  )
}

export default async function MarkerPage({ params }: MarkerPageProps) {
  const { id } = await params
  const decodedId = decodeURIComponent(id)

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <CustomBreadcrumbs items={[{ label: "Markers", href: "/browse" }, { label: decodedId }]} />
      <Suspense fallback={<MarkerContentSkeleton />}>
        <MarkerContent id={decodedId} />
      </Suspense>
    </div>
  )
}
