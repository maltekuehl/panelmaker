import type { Recommendation } from "@/lib/generated/prisma/enums"
import type { PublicationLink } from "@/lib/publication"
import type { ReportIssueEntry, ReportValidationEntry, VerdictCounts } from "@/models/experimental-report/transforms"
import type { CarouselImage } from "@/models/image/transforms"

export type OntologyRef = { id: string; label: string }

export type MemberRef = { id: string; name: string | null }

export type MarkerReport = {
  id: string
  submitter: string | null
  submitterId: string | null
  lab: string | null
  publication: PublicationLink | null
  dataSource: { name: string; url: string | null } | null
  method: string
  species: string
  recommendation: Recommendation | null
}

export type MarkerEntry = {
  // Grouping key for the table row. Equals proteinId when the antibody is linked to a protein,
  // otherwise a synthetic key, so it must never be used to build a /marker/ link.
  id: string
  // The UniProt accession, null when no protein is linked. Only this may drive a marker link.
  proteinId: string | null
  marker: string
  cellTypes: OntologyRef[]
  species: string
  tissue: string
  validatedMethods: string[]
  reportCount: number
  verdicts: VerdictCounts
  reports: MarkerReport[]
  images: CarouselImage[]
}

export type AntibodyEntry = {
  id: string
  rrid: string | null
  name: string
  target: string | null
  targetProteinId: string | null
  vendor: string | null
  clone: string | null
  reportCount: number
  verdicts: VerdictCounts
  reports: MarkerReport[]
  images: CarouselImage[]
}

export type ReportEntry = {
  id: string
  experimentId: string
  marker: string
  antibodyId: string | null
  antibodyName: string
  rrid: string | null
  species: string
  tissue: string
  method: string
  cellTypes: OntologyRef[]
  subcellular: string | null
  recommendation: Recommendation | null
  validations: ReportValidationEntry[]
  issues: ReportIssueEntry[]
  images: CarouselImage[]
  submitter: MemberRef | null
}

export type ExperimentEntry = {
  id: string
  name: string | null
  pmid: string | null
  doi: string | null
  method: string
  species: string
  tissue: string
  condition: string | null
  stainingCount: number
  usableCount: number
  antibodyCount: number
  images: CarouselImage[]
  createdAt: string
  submitter: MemberRef | null
}

export type PanelEntry = {
  id: string
  name: string
  description: string | null
  ownerId: string | null
  ownerName: string | null
  species: string | null
  method: string | null
  visibility: string
  cycleCount: number
  markerCount: number
  updatedAt: string
}
