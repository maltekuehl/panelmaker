import { ImageCarouselDialog } from "@/components/browse/image-carousel-dialog"
import { QualityBadge } from "@/components/browse/report-badges"
import { LabLink } from "@/components/lab/lab-link"
import { AddToPanelButton } from "@/components/panel/add-to-panel-button"
import { CustomBreadcrumbs } from "@/components/shared/custom-breadcrumbs"
import { NotAvailable } from "@/components/shared/not-available"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getSessionUser, resolveViewerContext } from "@/lib/auth"
import { VALIDATION_STATUS_LABELS } from "@/lib/constants"
import { formatLongDate } from "@/lib/format"
import { doiUrl, hasPublication, pubmedUrl } from "@/lib/publication"
import { antibodyHref, cellTypeHref, conditionHref, markerHref, profileHref } from "@/lib/routes"
import { preservationLabel, specimenFieldList } from "@/models/experiment"
import {
  getPublicReportById,
  getVisibleReportById,
  reportUsageImages,
  toReportUsage,
  type ReportImageResponse,
} from "@/models/experimental-report"
import { CheckCircle2, ExternalLink, HelpCircle, XCircle } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"

interface ReportPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: ReportPageProps): Promise<Metadata> {
  const { id } = await params
  // Metadata cannot read auth under cacheComponents, so only ever expose public reports here.
  const report = await getPublicReportById(id)
  if (!report) return { title: "Experimental Report | PanelMaker", robots: { index: false, follow: false } }
  const marker = report.antibody?.targetName ?? report.antibody?.name ?? "Unknown"
  return {
    title: `${marker}: Experimental Report #${report.id} | PanelMaker`,
    description: `Experimental validation report for ${marker} using ${report.experiment.imagingMethod?.label ?? "unknown method"} on ${report.experiment.species?.label ?? "unknown species"} ${report.experiment.tissue?.label ?? ""} tissue.`,
  }
}

function ReportQuality({ label }: { label: string | null }) {
  if (!label) return <NotAvailable />
  return <QualityBadge label={label} />
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "PUBLISHED":
      return (
        <Badge className="gap-1 border-success/20 bg-success/10 text-success">
          <CheckCircle2 className="h-3 w-3" />
          {VALIDATION_STATUS_LABELS.PUBLISHED}
        </Badge>
      )
    case "REJECTED":
      return (
        <Badge className="gap-1 border-destructive/20 bg-destructive/10 text-destructive">
          <XCircle className="h-3 w-3" />
          {VALIDATION_STATUS_LABELS.REJECTED}
        </Badge>
      )
    default:
      return (
        <Badge className="gap-1 border-warning/20 bg-warning/10 text-warning">
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
        <div className="h-3 w-3 rounded-full bg-muted-foreground/40" />
        <span className="text-sm font-medium">Unknown</span>
      </div>
    )
  }
  return works ? (
    <div className="flex items-center gap-2">
      <div className="h-3 w-3 rounded-full bg-success" />
      <span className="text-sm font-medium text-success">Works</span>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <div className="h-3 w-3 rounded-full bg-destructive" />
      <span className="text-sm font-medium text-destructive">Failed</span>
    </div>
  )
}

// Only some images carry a caption, so the whole block is dropped when none does. Once one image has
// one, the rest keep a labelled slot: "Image 2" with nothing under it would read as a rendering fault.
function ImageCaptions({ images }: { images: ReportImageResponse[] }) {
  if (!images.some((image) => image.caption?.trim())) return null
  const numbered = images.length > 1

  return (
    <dl className="space-y-2 text-sm">
      {images.map((image, index) => (
        <div key={image.url} className="space-y-0.5">
          {numbered && <dt className="text-xs font-medium text-muted-foreground">Image {index + 1}</dt>}
          <dd className="break-words whitespace-pre-wrap text-muted-foreground">
            {image.caption?.trim() ? image.caption : <NotAvailable />}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  const missing = children === null || children === undefined || children === ""
  return (
    <div className="space-y-0.5">
      <span className="block text-xs font-medium text-muted-foreground">{label}</span>
      <div className="text-sm font-medium">{missing ? <NotAvailable /> : children}</div>
    </div>
  )
}

// Viewer-aware (uncached): a report is shown only if the viewer may see it (public, own, or
// lab-shared, including unpublished lab work). Must not be wrapped in "use cache" because it reads auth.
async function ReportContent({ id }: { id: string }) {
  const user = await getSessionUser()
  const viewer = await resolveViewerContext(user?.id ?? null)
  const report = await getVisibleReportById(id, viewer)
  if (!report) notFound()

  const usage = toReportUsage(report)
  const antibodyLink = antibodyHref(usage.antibodyId)
  const preservation = preservationLabel(usage.specimen)
  const specimenFields = specimenFieldList(usage.specimen)

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
                  label={usage.markerName ?? usage.clone ?? usage.antibodyName}
                  size="sm"
                  className="gap-2"
                />
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Badge variant="secondary" title={usage.method}>
              {usage.methodShort}
            </Badge>
            <Badge variant="outline">{usage.species}</Badge>
            <WorksIndicator works={usage.works} />
          </div>

          <p className="text-sm text-muted-foreground">
            Part of{" "}
            <Link href={`/experiment/${usage.experimentId}`} className="text-primary hover:underline">
              {usage.experimentName ?? "this experiment"}
            </Link>
          </p>
        </div>

        <div className="space-y-3 border-t pt-6">
          <h2 className="text-lg font-semibold">Target &amp; Antibody</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
            <DetailRow label="Marker / Target">
              {usage.proteinId ? (
                <Link href={markerHref(usage.proteinId)} className="text-primary hover:underline">
                  {usage.markerName ?? "Unknown"}
                </Link>
              ) : (
                (usage.markerName ?? "Unknown")
              )}
            </DetailRow>
            <DetailRow label="Antibody">
              {antibodyLink ? (
                <Link href={antibodyLink} className="text-primary hover:underline">
                  {usage.antibodyName}
                </Link>
              ) : (
                usage.antibodyName
              )}
            </DetailRow>
            <DetailRow label="RRID">
              {usage.antibodyId ? <span className="font-mono">{usage.antibodyId}</span> : <NotAvailable />}
            </DetailRow>
            <DetailRow label="Clone">{usage.clone}</DetailRow>
            <DetailRow label="Vendor">{usage.antibodyVendor}</DetailRow>
            <DetailRow label="Catalog #">{usage.catalogNumber ?? "Not available"}</DetailRow>
            <DetailRow label="Host Species">{usage.hostSpecies ?? "Not available"}</DetailRow>
            <DetailRow label="Conjugate">{usage.conjugate ?? "Unconjugated"}</DetailRow>
          </div>
        </div>

        <div className="space-y-3 border-t pt-6">
          <h2 className="text-lg font-semibold">Sample &amp; Protocol</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
            <DetailRow label="Species">{usage.species}</DetailRow>
            <DetailRow label="Tissue">{usage.tissueLabel}</DetailRow>
            <DetailRow label="Preservation">{preservation ?? usage.fixation}</DetailRow>
            <DetailRow label="Method">{usage.method}</DetailRow>
            <DetailRow label="Dilution">{usage.dilution}</DetailRow>
            <DetailRow label="Antigen Retrieval">{usage.antigenRetrieval}</DetailRow>
            {specimenFields
              .filter((field) => field.label !== "Preservation")
              .map((field) => (
                <DetailRow key={field.label} label={field.label}>
                  <span title={field.hint}>{field.value}</span>
                </DetailRow>
              ))}
            {usage.specimen.protocolDoi && (
              <DetailRow label="Protocol">
                <a
                  href={doiUrl(usage.specimen.protocolDoi)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  {usage.specimen.protocolDoi}
                </a>
              </DetailRow>
            )}
            {usage.incubation && <DetailRow label="Incubation">{usage.incubation}</DetailRow>}
            {usage.fluorophore && <DetailRow label="Fluorophore">{usage.fluorophore}</DetailRow>}
            {usage.metalTag && <DetailRow label="Metal Tag">{usage.metalTag}</DetailRow>}
            {usage.cycleNumber !== null && <DetailRow label="Cycle Number">{usage.cycleNumber}</DetailRow>}
          </div>
        </div>

        <div className="space-y-3 border-t pt-6">
          <h2 className="text-lg font-semibold">Results</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
            <DetailRow label="Works">
              <WorksIndicator works={usage.works} />
            </DetailRow>
            <DetailRow label="Signal Quality">
              <ReportQuality label={usage.signalQuality} />
            </DetailRow>
            <DetailRow label="Specificity">
              <ReportQuality label={usage.specificity} />
            </DetailRow>
            {usage.cellTypes.length > 0 && (
              <DetailRow label="Cell Types">
                <span className="flex flex-wrap gap-x-1">
                  {usage.cellTypes.map((ct, idx) => (
                    <span key={ct.id}>
                      <Link href={cellTypeHref(ct.id)} className="text-primary hover:underline">
                        {ct.label}
                      </Link>
                      {idx < usage.cellTypes.length - 1 && ", "}
                    </span>
                  ))}
                </span>
              </DetailRow>
            )}
            {usage.subcellularId && (
              <DetailRow label="Subcellular Location">{usage.subcellularLabel ?? usage.subcellularId}</DetailRow>
            )}
            {usage.conditionId && (
              <DetailRow label="Condition">
                <Link href={conditionHref(usage.conditionId)} className="text-primary hover:underline">
                  {usage.conditionLabel ?? usage.conditionId}
                </Link>
              </DetailRow>
            )}
          </div>
          {usage.notes && (
            <div className="mt-4 space-y-1">
              <span className="block text-xs font-medium text-muted-foreground">Notes</span>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{usage.notes}</p>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {usage.images.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Images</h3>
            <ImageCarouselDialog images={reportUsageImages(usage)} title={`Report #${report.id}`} />
            <ImageCaptions images={usage.images} />
          </div>
        )}

        <div className="space-y-3 border-t pt-6 text-sm">
          <h3 className="font-semibold">Submission Info</h3>
          <div>
            <span className="text-muted-foreground block text-xs mb-0.5">Submitted by</span>
            {usage.submitterId ? (
              <Link href={profileHref(usage.submitterId)} className="font-medium text-primary hover:underline">
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
          {report.experiment.owningLab && (
            <div>
              <span className="text-muted-foreground block text-xs mb-0.5">Lab</span>
              <LabLink
                slug={report.experiment.owningLab.slug}
                name={report.experiment.owningLab.name}
                className="font-medium"
              />
            </div>
          )}
          <div>
            <span className="text-muted-foreground block text-xs mb-0.5">Date</span>
            <span className="font-medium">{formatLongDate(usage.createdAt)}</span>
          </div>
          {hasPublication(report.experiment) && (
            <div>
              <span className="text-muted-foreground block text-xs mb-0.5">Publication</span>
              {report.experiment.citation && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{report.experiment.citation}</p>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                {report.experiment.pmid && (
                  <a
                    href={pubmedUrl(report.experiment.pmid)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    PMID {report.experiment.pmid}
                  </a>
                )}
                {report.experiment.doi && (
                  <a
                    href={doiUrl(report.experiment.doi)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    DOI
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2 border-t pt-6">
          <h3 className="font-semibold">Related Pages</h3>
          {usage.proteinId && (
            <Link
              href={markerHref(usage.proteinId)}
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              View Marker: {usage.markerName}
            </Link>
          )}
          {antibodyLink && (
            <Link href={antibodyLink} className="flex items-center gap-2 text-sm text-primary hover:underline">
              <ExternalLink className="h-4 w-4" />
              View Antibody: {usage.antibodyId}
            </Link>
          )}
          {usage.cellTypes.map((ct) => (
            <Link
              key={ct.id}
              href={cellTypeHref(ct.id)}
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              View Cell Type: {ct.label}
            </Link>
          ))}
          {usage.conditionId && (
            <Link
              href={conditionHref(usage.conditionId)}
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              View Condition: {usage.conditionLabel}
            </Link>
          )}
        </div>
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

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <CustomBreadcrumbs items={[{ label: "Reports", href: "/browse" }, { label: `Report #${id}` }]} />
      <Suspense fallback={<ReportContentSkeleton />}>
        <ReportContent id={id} />
      </Suspense>
    </div>
  )
}
