import { ImageCarouselDialog } from "@/components/browse/image-carousel-dialog"
import { MarkerUsagesTable } from "@/components/browse/marker-usages-table"
import { RelatedCellTypesTable } from "@/components/browse/related-cell-types-table"
import { AddToPanelButton } from "@/components/panel/add-to-panel-button"
import { CustomBreadcrumbs } from "@/components/shared/custom-breadcrumbs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  const methods = [...new Set(reports.map((r) => r.method).filter(Boolean))]
  const species = [...new Set(reports.map((r) => r.species).filter(Boolean))]

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
                className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
              >
                {method}
              </Badge>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="p-3 bg-zinc-50 rounded-lg border">
              <span className="text-xs font-medium text-muted-foreground block mb-1">Gene Symbol</span>
              <span className="text-sm font-medium">{protein.geneSymbol ?? "N/A"}</span>
            </div>
            <div className="p-3 bg-zinc-50 rounded-lg border">
              <span className="text-xs font-medium text-muted-foreground block mb-1">Ensembl Gene ID</span>
              <span className="text-sm font-mono">{protein.ensemblGeneId ?? "N/A"}</span>
            </div>
            <div className="p-3 bg-zinc-50 rounded-lg border">
              <span className="text-xs font-medium text-muted-foreground block mb-1">UniProt ID</span>
              <span className="text-sm font-mono">{protein.id}</span>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Experimental Reports</CardTitle>
            <CardDescription>Detailed usage reports and validation data from various experiments.</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <MarkerUsagesTable data={usages} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Associated Cell Types</CardTitle>
            <CardDescription>Cell types known to express {protein.label}.</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <RelatedCellTypesTable data={cellTypesForTable} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>External Resources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
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
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="font-semibold">Images</h3>
          <ImageCarouselDialog images={images} title={protein.label} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Community Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{reports.length}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {reports.length === 1 ? "1 published report" : `${reports.length} published reports`}
            </p>
          </CardContent>
        </Card>
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
          <div className="grid grid-cols-2 gap-4 mt-6">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
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
