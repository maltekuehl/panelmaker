import { TermMarkerDetail, TermMarkerDetailSkeleton } from "@/components/detail/term-marker-detail"
import { getCellTypeById } from "@/models/cell-type"
import { aggregateMarkerEntries, getImagesForCellType, getReportsForCellType } from "@/models/experimental-report"
import type { Metadata } from "next"
import { cacheLife, cacheTag } from "next/cache"
import { notFound } from "next/navigation"
import { Suspense } from "react"

interface CellTypePageProps {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({ params }: CellTypePageProps): Promise<Metadata> {
  const { id } = await params
  const cellType = await getCellTypeById(decodeURIComponent(id))
  if (!cellType) return { title: "Cell Type Not Found | PanelMaker" }
  return {
    title: `${cellType.label}: cell type markers | PanelMaker`,
    description: `Validated antibody markers and experimental reports for ${cellType.label} in spatial proteomics and multiplex imaging.`,
  }
}

async function CellTypeContent({ id }: { id: string }) {
  "use cache"
  cacheLife("hours")
  cacheTag("browse")

  const [cellType, reports, images] = await Promise.all([
    getCellTypeById(id),
    getReportsForCellType(id),
    getImagesForCellType(id),
  ])

  if (!cellType) {
    notFound()
  }

  return (
    <TermMarkerDetail
      parent={{ label: "Cell Types", href: "/browse?mode=markers" }}
      term={cellType}
      markers={aggregateMarkerEntries(reports)}
      images={images}
      markersDescription={`Validated markers associated with ${cellType.label}.`}
      hiddenColumns={["cellTypes"]}
      externalLink={{
        href: `https://www.ebi.ac.uk/ols4/ontologies/cl/classes?obo_id=${encodeURIComponent(cellType.id)}`,
        label: "View in Cell Ontology (OLS)",
      }}
    />
  )
}

export default async function CellTypePage({ params }: CellTypePageProps) {
  const { id } = await params
  const decodedId = decodeURIComponent(id)

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <Suspense fallback={<TermMarkerDetailSkeleton />}>
        <CellTypeContent id={decodedId} />
      </Suspense>
    </div>
  )
}
