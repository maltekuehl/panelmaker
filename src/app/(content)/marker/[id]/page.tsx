import { MarkerUsagesTable } from "@/components/browse/marker-usages-table"
import { RelatedCellTypesTable } from "@/components/browse/related-cell-types-table"
import { DetailLayout, DetailSection, ImagesSection } from "@/components/detail/detail-layout"
import { AtAGlance, MetaItem, MetaRow } from "@/components/detail/detail-meta"
import { ExternalResourceLink } from "@/components/detail/resource-link"
import { AddToPanelButton } from "@/components/panel/add-to-panel-button"
import { CustomBreadcrumbs } from "@/components/shared/custom-breadcrumbs"
import { ValueOrNotAvailable } from "@/components/shared/not-available"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  getCellTypesFromReports,
  getReportsForProtein,
  reportUsageImages,
  toReportUsage,
} from "@/models/experimental-report"
import { getProteinById } from "@/models/protein"
import type { Metadata } from "next"
import { cacheLife, cacheTag } from "next/cache"
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
    title: `${protein.label}: spatial proteomics marker | PanelMaker`,
    description: `Validated antibody reports, cell type associations, and experimental data for ${protein.label}${protein.geneSymbol ? ` (${protein.geneSymbol})` : ""} in spatial proteomics.`,
  }
}

async function MarkerContent({ id }: { id: string }) {
  "use cache"
  cacheLife("hours")
  cacheTag("browse")

  const protein = await getProteinById(id)

  if (!protein) {
    notFound()
  }

  const [reports, relatedCellTypes] = await Promise.all([
    getReportsForProtein(protein.id),
    getCellTypesFromReports(protein.id),
  ])

  const usages = reports.map(toReportUsage)
  const images = usages.flatMap(reportUsageImages)
  const methods = [
    ...new Map(
      reports.flatMap(({ experiment }) =>
        experiment.imagingMethod ? [[experiment.imagingMethod.id, experiment.imagingMethod] as const] : [],
      ),
    ).values(),
  ]
  const species = [...new Set(reports.map((r) => r.experiment.species?.label).filter(Boolean))]
  const uniqueAntibodies = new Set(usages.map((u) => u.antibodyId).filter(Boolean)).size
  const contributors = new Set(usages.map((u) => u.submitterId ?? u.submitter).filter(Boolean)).size
  const recommendedCount = usages.filter((u) => u.recommendation === "RECOMMENDED").length
  const controlledCount = usages.filter((u) => u.validations.some((v) => v.result === "SUPPORTS")).length

  const cellTypesForTable = relatedCellTypes.map((ct) => ({
    id: ct.id,
    name: ct.label,
    ontologyId: ct.id,
    description: "",
  }))

  return (
    <>
      <CustomBreadcrumbs
        items={[{ label: "Markers", href: "/browse?mode=markers" }, { label: protein.geneSymbol ?? protein.label }]}
      />
      <DetailLayout
        aside={
          <>
            {images.length > 0 && <ImagesSection images={images} title={protein.label} />}
            <AtAGlance
              stats={[
                { label: "Reports", value: reports.length },
                { label: "Recommended", value: recommendedCount },
                { label: "With specificity controls", value: controlledCount },
                { label: "Antibodies", value: uniqueAntibodies },
                { label: "Contributors", value: contributors },
                { label: "Cell types", value: relatedCellTypes.length },
              ]}
            />
          </>
        }
      >
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
                key={method.id}
                variant="secondary"
                title={method.id}
                className="border-primary/20 bg-primary/10 text-primary hover:bg-primary/20"
              >
                {method.label}
              </Badge>
            ))}
          </div>

          <MetaRow className="mt-4">
            <MetaItem label="Gene Symbol">
              <ValueOrNotAvailable value={protein.geneSymbol} className="font-medium" />
            </MetaItem>
            <MetaItem label="Ensembl">
              <ValueOrNotAvailable value={protein.ensemblGeneId} className="font-mono" />
            </MetaItem>
            <MetaItem label="UniProt">
              <span className="font-mono">{protein.id}</span>
            </MetaItem>
          </MetaRow>
        </div>

        <DetailSection
          title="Experimental Reports"
          description="Detailed usage reports and validation data from various experiments."
        >
          <MarkerUsagesTable data={usages} />
        </DetailSection>

        <DetailSection title="Associated Cell Types" description={`Cell types known to express ${protein.label}.`}>
          <RelatedCellTypesTable data={cellTypesForTable} />
        </DetailSection>

        <DetailSection title="External Resources">
          <ExternalResourceLink href={`https://www.uniprot.org/uniprotkb/${protein.id}/entry`}>
            View in UniProt ({protein.id})
          </ExternalResourceLink>
          <ExternalResourceLink href={`https://www.proteinatlas.org/search/${protein.geneSymbol ?? protein.label}`}>
            View in Human Protein Atlas
          </ExternalResourceLink>
          {protein.ensemblGeneId && (
            <ExternalResourceLink href={`https://www.ensembl.org/Homo_sapiens/Gene/Summary?g=${protein.ensemblGeneId}`}>
              View in Ensembl ({protein.ensemblGeneId})
            </ExternalResourceLink>
          )}
        </DetailSection>
      </DetailLayout>
    </>
  )
}

function MarkerContentSkeleton() {
  return (
    <>
      <Skeleton className="h-5 w-64" />
      <DetailLayout
        aside={
          <>
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </>
        }
      >
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
      </DetailLayout>
    </>
  )
}

export default async function MarkerPage({ params }: MarkerPageProps) {
  const { id } = await params
  const decodedId = decodeURIComponent(id)

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <Suspense fallback={<MarkerContentSkeleton />}>
        <MarkerContent id={decodedId} />
      </Suspense>
    </div>
  )
}
