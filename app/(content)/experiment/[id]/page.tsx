import { auth } from "@/auth"
import { ImageCarouselDialog } from "@/components/browse/image-carousel-dialog"
import { MarkerUsagesTable } from "@/components/browse/marker-usages-table"
import { LabLink } from "@/components/lab/lab-link"
import { CustomBreadcrumbs } from "@/components/shared/custom-breadcrumbs"
import { Skeleton } from "@/components/ui/skeleton"
import { resolveViewerContext } from "@/lib/auth"
import { ANTIGEN_RETRIEVAL_LABELS, FIXATION_LABELS, METHOD_LABELS } from "@/lib/constants"
import { getExperimentById, getVisibleExperimentById } from "@/models/experiment"
import { getVisibleReportsForExperiment, reportUsageImages, toReportUsage } from "@/models/experimental-report"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"

interface ExperimentPageProps {
  params: Promise<{ id: string }>
}

function experimentTitle(name: string | null, id: string): string {
  return name ?? `Experiment ${id.slice(0, 8)}`
}

export async function generateMetadata({ params }: ExperimentPageProps): Promise<Metadata> {
  const { id } = await params
  const experiment = await getExperimentById(decodeURIComponent(id))
  if (!experiment || experiment.visibility !== "PUBLIC") return { title: "Experiment Not Found | PanelMaker" }
  const title = experimentTitle(experiment.name, experiment.id)
  return {
    title: `${title} — Experiment | PanelMaker`,
    description:
      experiment.description ??
      `Validation experiment using ${experiment.method ? (METHOD_LABELS[experiment.method] ?? experiment.method) : "an imaging method"} on ${experiment.species?.label ?? "unknown species"} ${experiment.tissue?.label ?? ""} tissue.`,
  }
}

function MetaItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{children}</span>
    </span>
  )
}

// Viewer-aware (uncached): renders the whole experiment for anyone who may see it (public, own, or
// lab-shared), including its unpublished (PENDING) lab stainings. Must not be wrapped in "use cache".
async function ExperimentContent({ id }: { id: string }) {
  const session = await auth()
  const viewer = await resolveViewerContext(session?.user?.id ?? null)

  const experiment = await getVisibleExperimentById(id, viewer)
  if (!experiment) {
    notFound()
  }

  const reports = await getVisibleReportsForExperiment(id, viewer)
  const usages = reports.map(toReportUsage)
  const images = usages.flatMap(reportUsageImages)

  const workingCount = usages.filter((u) => u.works === true).length
  const antibodyCount = new Set(usages.map((u) => u.antibodyId).filter(Boolean)).size
  const cellTypeCount = new Set(usages.flatMap((u) => u.cellTypes.map((c) => c.id))).size

  const method = experiment.method ? (METHOD_LABELS[experiment.method] ?? experiment.method) : null
  const fixation = experiment.fixation ? (FIXATION_LABELS[experiment.fixation] ?? experiment.fixation) : null
  const antigenRetrieval = experiment.antigenRetrieval
    ? (ANTIGEN_RETRIEVAL_LABELS[experiment.antigenRetrieval] ?? experiment.antigenRetrieval)
    : null

  const stats: { label: string; value: number }[] = [
    { label: "Stainings", value: usages.length },
    { label: "Working", value: workingCount },
    { label: "Antibodies", value: antibodyCount },
    { label: "Cell types", value: cellTypeCount },
  ]

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <div className="space-y-6 md:col-span-2">
        <div>
          <h1 className="mb-2 text-3xl font-bold tracking-tight">{experimentTitle(experiment.name, experiment.id)}</h1>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-sm">
            {method && <MetaItem label="Method">{method}</MetaItem>}
            {experiment.species && <MetaItem label="Species">{experiment.species.label}</MetaItem>}
            {experiment.tissue && <MetaItem label="Tissue">{experiment.tissue.label}</MetaItem>}
            {fixation && <MetaItem label="Fixation">{fixation}</MetaItem>}
            {antigenRetrieval && <MetaItem label="Antigen retrieval">{antigenRetrieval}</MetaItem>}
            {experiment.condition && (
              <MetaItem label="Condition">
                <Link href={`/condition/${experiment.condition.id}`} className="text-primary hover:underline">
                  {experiment.condition.label}
                </Link>
              </MetaItem>
            )}
            {experiment.submitter && (
              <MetaItem label="Submitter">
                <Link href={`/profile/${experiment.submitter.id}`} className="text-primary hover:underline">
                  {experiment.submitter.name ?? "Anonymous"}
                </Link>
              </MetaItem>
            )}
            {experiment.owningLab && (
              <MetaItem label="Lab">
                <LabLink slug={experiment.owningLab.slug} name={experiment.owningLab.name} />
              </MetaItem>
            )}
            <MetaItem label="Date">{experiment.createdAt.toLocaleDateString()}</MetaItem>
          </div>
        </div>

        {experiment.description && (
          <div className="border-t pt-6">
            <p className="text-sm text-muted-foreground">{experiment.description}</p>
          </div>
        )}

        <div className="space-y-4 border-t pt-6">
          <div>
            <h2 className="text-lg font-semibold">Stainings</h2>
            <p className="text-sm text-muted-foreground">
              Every antibody staining recorded in this experiment, with its validation result.
            </p>
          </div>
          <MarkerUsagesTable data={usages} />
        </div>
      </div>

      <div className="space-y-6">
        <dl className="space-y-2 text-sm">
          {stats.map((s) => (
            <div key={s.label} className="flex justify-between border-b pb-2">
              <dt className="text-muted-foreground">{s.label}</dt>
              <dd className="font-medium">{s.value}</dd>
            </div>
          ))}
        </dl>

        <div className="space-y-4">
          <h3 className="font-semibold">Images</h3>
          <ImageCarouselDialog images={images} title={experimentTitle(experiment.name, experiment.id)} />
        </div>
      </div>
    </div>
  )
}

function ExperimentContentSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <div className="space-y-6 md:col-span-2">
        <div>
          <Skeleton className="mb-2 h-9 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
      <div className="space-y-6">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  )
}

export default async function ExperimentPage({ params }: ExperimentPageProps) {
  const { id } = await params
  const decodedId = decodeURIComponent(id)

  return (
    <div className="container mx-auto space-y-6 px-4 py-6">
      <CustomBreadcrumbs
        items={[{ label: "Experiments", href: "/browse?mode=experiments" }, { label: "Experiment" }]}
      />
      <Suspense fallback={<ExperimentContentSkeleton />}>
        <ExperimentContent id={decodedId} />
      </Suspense>
    </div>
  )
}
