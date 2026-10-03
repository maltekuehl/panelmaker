import { auth } from "@/auth"
import type { ExperimentEntry, PanelEntry, ReportEntry } from "@/components/browse/columns"
import { LabContent } from "@/components/lab/lab-content"
import { LabPageHeader } from "@/components/lab/lab-page-header"
import { labContentParsers, type LabView } from "@/lib/data-table"
import { getLabExperimentCount, getLabExperimentEntriesPage } from "@/models/experiment"
import { getLabContentFacets, getLabReportCount, getLabReportEntriesPage } from "@/models/experimental-report"
import { getLabBySlug, getUserLabRole } from "@/models/lab"
import { getLabPanelCount, getLabPanelEntriesPage } from "@/models/panel"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { createLoader, type SearchParams } from "nuqs/server"

interface LabPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<SearchParams>
}

const loadSearchParams = createLoader(labContentParsers)

export async function generateMetadata({ params }: LabPageProps): Promise<Metadata> {
  const { slug } = await params
  const lab = await getLabBySlug(slug)
  if (!lab) return { title: "Lab Not Found | PanelMaker" }
  if (!lab.isPublicProfile) {
    return { title: "Lab | PanelMaker", robots: { index: false, follow: false } }
  }
  return {
    title: `${lab.name} | PanelMaker`,
    description: lab.description ?? `${lab.name} on PanelMaker.`,
  }
}

export default async function LabPage({ params, searchParams }: LabPageProps) {
  const { slug } = await params

  const [lab, session, query] = await Promise.all([getLabBySlug(slug), auth(), loadSearchParams(searchParams)])

  if (!lab) {
    notFound()
  }

  const role = session?.user?.id ? await getUserLabRole(session.user.id, lab.id) : null

  // Non-members: only a public profile is shown (no lab content), otherwise the lab does not exist.
  if (!role) {
    if (!lab.isPublicProfile) {
      notFound()
    }
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        <LabPageHeader lab={lab} role={null} />
        {lab.description && (
          <div className="border-t pt-6">
            <p className="max-w-2xl text-sm text-muted-foreground">{lab.description}</p>
          </div>
        )}
      </div>
    )
  }

  // Members see all of the lab's experiments, reports, and panels regardless of visibility, with the same
  // server-side search / faceted filters / sorting / paging surface as browse. Counts and the report-derived
  // facet set are independent of the active filters; only the active view's page is fetched.
  const view: LabView = query.view
  const [experiments, reports, panels, facets, pageData] = await Promise.all([
    getLabExperimentCount(lab.id),
    getLabReportCount(lab.id),
    getLabPanelCount(lab.id),
    getLabContentFacets(lab.id),
    view === "reports"
      ? getLabReportEntriesPage(lab.id, query)
      : view === "panels"
        ? getLabPanelEntriesPage(lab.id, query)
        : getLabExperimentEntriesPage(lab.id, query),
  ])

  const counts: Record<LabView, number> = { experiments, reports, panels }
  const shared = { counts, facets, page: pageData.page, pageCount: pageData.pageCount, total: pageData.total }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <LabPageHeader lab={lab} role={role} />
      {view === "reports" ? (
        <LabContent {...shared} view="reports" rows={pageData.rows as ReportEntry[]} />
      ) : view === "panels" ? (
        <LabContent {...shared} view="panels" rows={pageData.rows as PanelEntry[]} />
      ) : (
        <LabContent {...shared} view="experiments" rows={pageData.rows as ExperimentEntry[]} />
      )}
    </div>
  )
}
