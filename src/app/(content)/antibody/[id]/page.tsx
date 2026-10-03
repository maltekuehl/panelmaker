import { AntibodyUsagesTable } from "@/components/browse/antibody-usages-table"
import { AsideSection, DetailLayout, DetailSection, ImagesSection } from "@/components/detail/detail-layout"
import { MetaItem, MetaRow } from "@/components/detail/detail-meta"
import { AddToPanelButton } from "@/components/panel/add-to-panel-button"
import { CustomBreadcrumbs } from "@/components/shared/custom-breadcrumbs"
import { ValueOrNotAvailable } from "@/components/shared/not-available"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { markerHref } from "@/lib/routes"
import { resolveAntibodyByRrid } from "@/models/antibody"
import { getReportsForAntibody, reportUsageImages, toReportUsage } from "@/models/experimental-report"
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

async function parseAntibodyParams(params: AntibodyPageProps["params"]): Promise<{ rrid: string; displayId: string }> {
  const decodedId = decodeURIComponent((await params).id)
  return {
    rrid: decodedId.startsWith("RRID:") ? decodedId : `RRID:${decodedId}`,
    displayId: decodedId.replace(/^RRID:/, ""),
  }
}

function ExternalResourceCard({ href, title, subtitle }: { href: string; title: string; subtitle: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted"
    >
      <div className="space-y-1">
        <div className="font-medium transition-colors group-hover:text-primary">{title}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
      <ExternalLink className="h-4 w-4 text-muted-foreground" />
    </a>
  )
}

export async function generateMetadata({ params }: AntibodyPageProps): Promise<Metadata> {
  const { rrid } = await parseAntibodyParams(params)
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
  const images = usages.flatMap(reportUsageImages)

  return (
    <DetailLayout
      aside={
        <>
          {images.length > 0 && <ImagesSection images={images} title={antibody.name} />}
          <AsideSection title="External Resources">
            <ExternalResourceCard
              href={`https://scicrunch.org/resolver/${displayId}`}
              title="Antibody Registry"
              subtitle="View full record on SciCrunch"
            />
            {antibody.vendorUrl && (
              <ExternalResourceCard
                href={antibody.vendorUrl}
                title={antibody.vendorName ?? "Vendor"}
                subtitle="View on vendor website"
              />
            )}
          </AsideSection>
        </>
      }
    >
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
          <Badge variant="outline">Cat: {antibody.catalogNumber ?? "Not available"}</Badge>
          {antibody.clonality && <Badge variant="outline">{antibody.clonality}</Badge>}
          {antibody.targetName && <Badge variant="outline">Target: {antibody.targetName}</Badge>}
          {antibody.hostTaxon?.label && <Badge variant="outline">Host: {antibody.hostTaxon.label}</Badge>}
        </div>

        <MetaRow className="mt-4">
          <MetaItem label="Clone ID">
            <ValueOrNotAvailable value={antibody.cloneId} className="font-medium" />
          </MetaItem>
          <MetaItem label="Conjugate">
            <span className="font-medium">{antibody.conjugate ?? "Unconjugated"}</span>
          </MetaItem>
          {antibody.targetProtein && (
            <MetaItem label="Target">
              <Link href={markerHref(antibody.targetProtein.id)} className="font-medium text-primary hover:underline">
                {antibody.targetProtein.label} ({antibody.targetProtein.geneSymbol})
              </Link>
            </MetaItem>
          )}
          <MetaItem label="Citations">
            <span className="font-medium tabular-nums">{antibody.citationCount ?? 0}</span>
          </MetaItem>
        </MetaRow>
      </div>

      <DetailSection
        title="Experimental Reports"
        description="Documented usage of this antibody in various experiments."
      >
        <AntibodyUsagesTable data={usages} />
      </DetailSection>
    </DetailLayout>
  )
}

function AntibodyContentSkeleton() {
  return (
    <DetailLayout
      aside={
        <>
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </>
      }
    >
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
    </DetailLayout>
  )
}

export default async function AntibodyPage({ params }: AntibodyPageProps) {
  const { rrid, displayId } = await parseAntibodyParams(params)

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <CustomBreadcrumbs items={[{ label: "Antibodies", href: "/browse" }, { label: displayId }]} />
      <Suspense fallback={<AntibodyContentSkeleton />}>
        <AntibodyContent rrid={rrid} displayId={displayId} />
      </Suspense>
    </div>
  )
}
