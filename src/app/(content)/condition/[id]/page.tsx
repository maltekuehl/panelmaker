import { TermMarkerDetail, TermMarkerDetailSkeleton } from "@/components/detail/term-marker-detail"
import {
  aggregateMarkerEntries,
  getConditionById,
  getReportsForCondition,
  reportUsageImages,
  toReportUsage,
} from "@/models/experimental-report"
import type { Metadata } from "next"
import { cacheLife, cacheTag } from "next/cache"
import { notFound } from "next/navigation"
import { Suspense } from "react"

interface ConditionPageProps {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({ params }: ConditionPageProps): Promise<Metadata> {
  const { id } = await params
  const condition = await getConditionById(decodeURIComponent(id))
  if (!condition) return { title: "Condition Not Found | PanelMaker" }
  return {
    title: `${condition.label}: condition markers | PanelMaker`,
    description: `Validated antibody markers and experimental reports for ${condition.label} in spatial proteomics and multiplex imaging.`,
  }
}

async function ConditionContent({ id }: { id: string }) {
  "use cache"
  cacheLife("hours")
  cacheTag("browse")

  const [condition, reports] = await Promise.all([getConditionById(id), getReportsForCondition(id)])

  if (!condition) {
    notFound()
  }

  return (
    <TermMarkerDetail
      parent={{ label: "Conditions", href: "/browse?mode=reports" }}
      term={condition}
      markers={aggregateMarkerEntries(reports)}
      images={reports.map(toReportUsage).flatMap(reportUsageImages)}
      markersDescription={`Validated markers reported in ${condition.label}.`}
      externalLink={{
        href: `https://www.ebi.ac.uk/ols4/ontologies/doid/classes?obo_id=${encodeURIComponent(condition.id)}`,
        label: "View in Disease Ontology (OLS)",
      }}
    />
  )
}

export default async function ConditionPage({ params }: ConditionPageProps) {
  const { id } = await params
  const decodedId = decodeURIComponent(id)

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <Suspense fallback={<TermMarkerDetailSkeleton />}>
        <ConditionContent id={decodedId} />
      </Suspense>
    </div>
  )
}
