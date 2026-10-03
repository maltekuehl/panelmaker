import { MarkerUsagesTable } from "@/components/browse/marker-usages-table"
import { DetailLayout, DetailSection, ImagesSection } from "@/components/detail/detail-layout"
import { MetaRow } from "@/components/detail/detail-meta"
import { EditExperimentDialog } from "@/components/experiment/edit-experiment-dialog"
import { LabLink } from "@/components/lab/lab-link"
import { CustomBreadcrumbs } from "@/components/shared/custom-breadcrumbs"
import { DataSourceAttribution } from "@/components/shared/data-source-attribution"
import { Skeleton } from "@/components/ui/skeleton"
import { getSessionUser, resolveViewerContext } from "@/lib/auth"
import { ANTIGEN_RETRIEVAL_LABELS } from "@/lib/constants"
import { doiUrl, hasPublication, pubmedUrl } from "@/lib/publication"
import { conditionHref, profileHref } from "@/lib/routes"
import {
  getExperimentById,
  getVisibleExperimentById,
  hasSpecimenDetail,
  preservationLabel,
  specimenFieldList,
  toSpecimenDetail,
} from "@/models/experiment"
import {
  getVisibleReportsForExperiment,
  isUsable,
  reportUsageImages,
  toReportUsage,
} from "@/models/experimental-report"
import { canEditExperiment } from "@/models/lab"
import { format } from "date-fns"
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
    title: `${title}: experiment | PanelMaker`,
    description:
      experiment.description ??
      `Validation experiment using ${experiment.imagingMethod?.label ?? "an imaging method"} on ${experiment.species?.label ?? "unknown species"} ${experiment.tissue?.label ?? ""} tissue.`,
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
  const user = await getSessionUser()
  const viewer = await resolveViewerContext(user?.id ?? null)

  const [experiment, reports] = await Promise.all([
    getVisibleExperimentById(id, viewer),
    getVisibleReportsForExperiment(id, viewer),
  ])
  if (!experiment) {
    notFound()
  }

  const usages = reports.map(toReportUsage)
  const images = usages.flatMap(reportUsageImages)

  const usableCount = usages.filter((u) => isUsable(u.recommendation)).length
  const antibodyCount = new Set(usages.map((u) => u.antibodyId).filter(Boolean)).size
  const cellTypeCount = new Set(usages.flatMap((u) => u.cellTypes.map((c) => c.id))).size

  const canEdit = canEditExperiment(viewer, experiment)
  const title = experimentTitle(experiment.name, experiment.id)

  const method = experiment.imagingMethod?.label ?? null
  const specimen = toSpecimenDetail(experiment)
  const preservation = preservationLabel(specimen)
  const specimenFields = specimenFieldList(specimen)
  const antigenRetrieval = experiment.antigenRetrieval
    ? (ANTIGEN_RETRIEVAL_LABELS[experiment.antigenRetrieval] ?? experiment.antigenRetrieval)
    : null

  const stats: { label: string; value: number }[] = [
    { label: "Stainings", value: usages.length },
    { label: "Usable", value: usableCount },
    { label: "Antibodies", value: antibodyCount },
    { label: "Cell types", value: cellTypeCount },
  ]

  return (
    <>
      <CustomBreadcrumbs items={[{ label: "Experiments", href: "/browse?mode=experiments" }, { label: title }]} />
      <DetailLayout
        aside={
          <>
            <dl className="space-y-2 text-sm">
              {stats.map((s) => (
                <div key={s.label} className="flex justify-between border-b pb-2">
                  <dt className="text-muted-foreground">{s.label}</dt>
                  <dd className="font-medium">{s.value}</dd>
                </div>
              ))}
            </dl>

            <ImagesSection images={images} title={title} />
          </>
        }
      >
        <div>
          <div className="mb-2 flex items-start justify-between gap-4">
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            <EditExperimentDialog
              canEdit={canEdit}
              experiment={{
                id: experiment.id,
                name: experiment.name,
                description: experiment.description,
                citation: experiment.citation,
                species: experiment.species,
                preservation: experiment.preservation,
                specimen: {
                  preservationText: experiment.preservationText ?? "",
                  fixative: experiment.fixative,
                  fixativeConcentration: experiment.fixativeConcentration ?? "",
                  antigenRetrievalText: experiment.antigenRetrievalText ?? "",
                  sampleType: experiment.sampleType ?? "",
                  sectionThicknessUm: experiment.sectionThicknessUm?.toString() ?? "",
                  donorSex: experiment.donorSex ?? "",
                  donorAge: experiment.donorAge ?? "",
                  developmentalStage: experiment.developmentalStage,
                },
                pmid: experiment.pmid,
                doi: experiment.doi,
              }}
            />
          </div>
          <MetaRow>
            {method && <MetaItem label="Method">{method}</MetaItem>}
            {experiment.species && <MetaItem label="Species">{experiment.species.label}</MetaItem>}
            {experiment.tissue && <MetaItem label="Tissue">{experiment.tissue.label}</MetaItem>}
            {preservation && <MetaItem label="Preservation">{preservation}</MetaItem>}
            {antigenRetrieval && <MetaItem label="Antigen retrieval">{antigenRetrieval}</MetaItem>}
            {experiment.condition && (
              <MetaItem label="Condition">
                <Link href={conditionHref(experiment.condition.id)} className="text-primary hover:underline">
                  {experiment.condition.label}
                </Link>
              </MetaItem>
            )}
            {experiment.submitter && (
              <MetaItem label="Submitter">
                <Link href={profileHref(experiment.submitter.id)} className="text-primary hover:underline">
                  {experiment.submitter.name ?? "Anonymous"}
                </Link>
              </MetaItem>
            )}
            {experiment.owningLab && (
              <MetaItem label="Lab">
                <LabLink slug={experiment.owningLab.slug} name={experiment.owningLab.name} />
              </MetaItem>
            )}
            <MetaItem label="Date">{format(experiment.createdAt, "MMM d, yyyy")}</MetaItem>
          </MetaRow>
        </div>

        {experiment.description && (
          <div className="border-t pt-6">
            <p className="text-sm text-muted-foreground">{experiment.description}</p>
          </div>
        )}

        {hasPublication(experiment) && (
          <DetailSection title="Publication" className="space-y-2">
            {experiment.citation && <p className="text-sm text-muted-foreground">{experiment.citation}</p>}
            <MetaRow>
              {experiment.pmid && (
                <MetaItem label="PMID">
                  <a
                    href={pubmedUrl(experiment.pmid)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    {experiment.pmid}
                  </a>
                </MetaItem>
              )}
              {experiment.doi && (
                <MetaItem label="DOI">
                  <a
                    href={doiUrl(experiment.doi)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    {experiment.doi}
                  </a>
                </MetaItem>
              )}
            </MetaRow>
          </DetailSection>
        )}

        {experiment.source && (
          <DetailSection title="Source" className="space-y-2">
            <p className="text-sm text-muted-foreground">Imported from an external dataset.</p>
            <DataSourceAttribution source={experiment.source} />
          </DetailSection>
        )}

        {hasSpecimenDetail(specimen) && (
          <DetailSection
            title="Specimen & donor"
            description="How the sample was preserved and who it came from, as recorded by the submitter."
          >
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
              {specimenFields.map((field) => (
                <div key={field.label} className="space-y-1">
                  <span className="block text-xs font-medium text-muted-foreground">{field.label}</span>
                  <span className="text-sm font-medium" title={field.hint}>
                    {field.value}
                  </span>
                </div>
              ))}
              {specimen.protocolDoi && (
                <div className="space-y-1">
                  <span className="block text-xs font-medium text-muted-foreground">Protocol</span>
                  <a
                    href={doiUrl(specimen.protocolDoi)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {specimen.protocolDoi}
                  </a>
                </div>
              )}
            </div>
          </DetailSection>
        )}

        <DetailSection
          title="Stainings"
          description="Every antibody staining recorded in this experiment, with its validation result."
        >
          <MarkerUsagesTable data={usages} />
        </DetailSection>
      </DetailLayout>
    </>
  )
}

function ExperimentContentSkeleton() {
  return (
    <>
      <Skeleton className="h-5 w-64" />
      <DetailLayout
        aside={
          <>
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-48 w-full" />
          </>
        }
      >
        <div>
          <Skeleton className="mb-2 h-9 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Skeleton className="h-64 w-full" />
      </DetailLayout>
    </>
  )
}

export default async function ExperimentPage({ params }: ExperimentPageProps) {
  const { id } = await params
  const decodedId = decodeURIComponent(id)

  return (
    <div className="container mx-auto space-y-6 px-4 py-6">
      <Suspense fallback={<ExperimentContentSkeleton />}>
        <ExperimentContent id={decodedId} />
      </Suspense>
    </div>
  )
}
