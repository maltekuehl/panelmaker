import { ImageCarouselDialog } from "@/components/browse/image-carousel-dialog"
import { AddToPanelButton } from "@/components/panel/add-to-panel-button"
import { CustomBreadcrumbs } from "@/components/shared/custom-breadcrumbs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getReportById, toReportResponse, toReportUsage } from "@/models/experimental-report"
import { CheckCircle2, ExternalLink, HelpCircle, XCircle } from "lucide-react"
import type { Metadata } from "next"
import { cacheLife } from "next/cache"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"

interface ReportPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: ReportPageProps): Promise<Metadata> {
  const { id } = await params
  const reportId = Number(id)
  if (Number.isNaN(reportId)) return { title: "Report Not Found | PanelMaker" }
  const report = await getReportById(reportId)
  if (!report) return { title: "Report Not Found | PanelMaker" }
  const marker = report.antibody?.targetName ?? report.antibody?.name ?? "Unknown"
  return {
    title: `${marker} — Experimental Report #${report.id} | PanelMaker`,
    description: `Experimental validation report for ${marker} using ${report.method ?? "unknown method"} on ${report.species ?? "unknown species"} ${report.tissueType ?? ""} tissue.`,
  }
}

function QualityBadge({ label }: { label: string | null }) {
  if (!label) return <span className="text-muted-foreground">N/A</span>
  const styles: Record<string, string> = {
    EXCELLENT: "bg-green-100 text-green-700 border-green-200",
    GOOD: "bg-blue-100 text-blue-700 border-blue-200",
    MODERATE: "bg-amber-100 text-amber-700 border-amber-200",
    POOR: "bg-red-100 text-red-700 border-red-200",
    HIGH: "bg-green-100 text-green-700 border-green-200",
    LOW: "bg-red-100 text-red-700 border-red-200",
  }
  return (
    <Badge className={styles[label] ?? "bg-zinc-100 text-zinc-700"}>
      {label.charAt(0) + label.slice(1).toLowerCase()}
    </Badge>
  )
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "VALIDATED":
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Validated
        </Badge>
      )
    case "REJECTED":
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200 gap-1">
          <XCircle className="h-3 w-3" />
          Rejected
        </Badge>
      )
    default:
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1">
          <HelpCircle className="h-3 w-3" />
          Pending
        </Badge>
      )
  }
}

function WorksIndicator({ works }: { works: boolean | null }) {
  if (works === null) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-zinc-300" />
        <span className="text-sm font-medium">Unknown</span>
      </div>
    )
  }
  return works ? (
    <div className="flex items-center gap-2">
      <div className="h-3 w-3 rounded-full bg-green-500" />
      <span className="text-sm font-medium text-green-700">Works</span>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <div className="h-3 w-3 rounded-full bg-red-500" />
      <span className="text-sm font-medium text-red-700">Failed</span>
    </div>
  )
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="p-3 bg-zinc-50 rounded-lg border">
      <span className="text-xs font-medium text-muted-foreground block mb-1">{label}</span>
      <div className="text-sm font-medium">{children}</div>
    </div>
  )
}

async function ReportContent({ id }: { id: number }) {
  "use cache"
  cacheLife("hours")

  const report = await getReportById(id)
  if (!report) notFound()

  const usage = toReportUsage(report)
  const response = toReportResponse(report)

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-3xl font-bold tracking-tight">Experimental Report #{report.id}</h1>
            <div className="flex items-center gap-2">
              <StatusBadge status={usage.status} />
              {usage.antibodyDbId && (
                <AddToPanelButton
                  antibodyId={usage.antibodyDbId}
                  proteinId={usage.proteinId ?? undefined}
                  label={usage.markerName ?? usage.clone}
                  size="sm"
                  className="gap-2"
                />
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Badge variant="secondary">{usage.method}</Badge>
            <Badge variant="outline">{usage.species}</Badge>
            <WorksIndicator works={usage.works} />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Target &amp; Antibody</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <DetailRow label="Marker / Target">
                {usage.proteinId ? (
                  <Link href={`/marker/${usage.proteinId}`} className="text-primary hover:underline">
                    {usage.markerName ?? "Unknown"}
                  </Link>
                ) : (
                  (usage.markerName ?? "Unknown")
                )}
              </DetailRow>
              <DetailRow label="Antibody">
                <Link
                  href={`/antibody/${usage.antibodyId.replace(/^RRID:/, "")}`}
                  className="text-primary hover:underline"
                >
                  {usage.antibodyName}
                </Link>
              </DetailRow>
              <DetailRow label="RRID">
                <span className="font-mono">{usage.antibodyId}</span>
              </DetailRow>
              <DetailRow label="Clone">{usage.clone}</DetailRow>
              <DetailRow label="Vendor">{usage.antibodyVendor}</DetailRow>
              <DetailRow label="Catalog #">{usage.catalogNumber ?? "N/A"}</DetailRow>
              <DetailRow label="Host Species">{usage.hostSpecies ?? "N/A"}</DetailRow>
              <DetailRow label="Conjugate">{usage.conjugate ?? "Unconjugated"}</DetailRow>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sample &amp; Protocol</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <DetailRow label="Species">{usage.species}</DetailRow>
              <DetailRow label="Tissue Type">{usage.tissueType}</DetailRow>
              <DetailRow label="Fixation">{usage.fixation}</DetailRow>
              <DetailRow label="Method">{usage.method}</DetailRow>
              <DetailRow label="Dilution">{usage.dilution}</DetailRow>
              <DetailRow label="Antigen Retrieval">{usage.antigenRetrieval}</DetailRow>
              {usage.fluorophore && <DetailRow label="Fluorophore">{usage.fluorophore}</DetailRow>}
              {usage.metalTag && <DetailRow label="Metal Tag">{usage.metalTag}</DetailRow>}
              {usage.cycleNumber !== null && <DetailRow label="Cycle Number">{usage.cycleNumber}</DetailRow>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <DetailRow label="Works">
                <WorksIndicator works={usage.works} />
              </DetailRow>
              <DetailRow label="Signal Quality">
                <QualityBadge label={usage.signalQuality} />
              </DetailRow>
              <DetailRow label="Specificity">
                <QualityBadge label={usage.specificity} />
              </DetailRow>
              {usage.cellTypeId && (
                <DetailRow label="Cell Type">
                  <Link href={`/celltype/${usage.cellTypeId}`} className="text-primary hover:underline">
                    {usage.cellTypeLabel}
                  </Link>
                </DetailRow>
              )}
              {usage.structureId && (
                <DetailRow label="Anatomical Structure">{usage.structureLabel ?? usage.structureId}</DetailRow>
              )}
            </div>
            {usage.notes && (
              <div className="mt-4 p-4 bg-zinc-50 rounded-lg border">
                <span className="text-xs font-medium text-muted-foreground block mb-2">Notes</span>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{usage.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {response.imageUrls.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Images</h3>
            <ImageCarouselDialog images={response.imageUrls} title={`Report #${report.id}`} />
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Submission Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="text-muted-foreground block text-xs mb-0.5">Submitted by</span>
              {usage.submitterId ? (
                <Link href={`/profile/${usage.submitterId}`} className="font-medium text-primary hover:underline">
                  {usage.submitter}
                </Link>
              ) : (
                <span className="font-medium">{usage.submitter}</span>
              )}
            </div>
            {usage.submitterInstitution && (
              <div>
                <span className="text-muted-foreground block text-xs mb-0.5">Institution</span>
                <span className="font-medium">{usage.submitterInstitution}</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground block text-xs mb-0.5">Date</span>
              <span className="font-medium">
                {new Date(usage.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Related Pages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {usage.proteinId && (
              <Link
                href={`/marker/${usage.proteinId}`}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                View Marker: {usage.markerName}
              </Link>
            )}
            <Link
              href={`/antibody/${usage.antibodyId.replace(/^RRID:/, "")}`}
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              View Antibody: {usage.antibodyId}
            </Link>
            {usage.cellTypeId && (
              <Link
                href={`/celltype/${usage.cellTypeId}`}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                View Cell Type: {usage.cellTypeLabel}
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ReportContentSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-6">
        <div>
          <Skeleton className="h-8 w-72 mb-3" />
          <div className="flex gap-2 mb-4">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  )
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { id } = await params
  const reportId = Number(id)

  if (Number.isNaN(reportId)) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <CustomBreadcrumbs items={[{ label: "Reports", href: "/browse" }, { label: `Report #${reportId}` }]} />
      <Suspense fallback={<ReportContentSkeleton />}>
        <ReportContent id={reportId} />
      </Suspense>
    </div>
  )
}
