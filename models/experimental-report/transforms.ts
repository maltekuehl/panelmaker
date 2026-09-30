import type { AntibodyEntry, MarkerEntry, MarkerReport, ReportEntry } from "@/components/browse/columns"
import type { CarouselImage, CarouselImageLink } from "@/components/browse/image-carousel-dialog"
import { ANTIGEN_RETRIEVAL_LABELS, SPECIFICITY_RANK } from "@/lib/constants"
import { antibodyHref, cellTypeHref, markerHref } from "@/lib/routes"
import { toSpecimenDetail, type SpecimenDetail } from "@/models/experiment/transforms"
import type { ReportRow } from "./queries"

export type ReportImageResponse = { url: string; caption: string | null }

export type ReportResponse = Omit<ReportRow, "images" | "fluorophore"> & {
  imageUrls: string[]
  images: ReportImageResponse[]
  fluorophore: string | null
}

export function toReportResponse(report: ReportRow): ReportResponse {
  const { images, ...rest } = report
  return {
    ...rest,
    fluorophore: report.fluorophore?.name ?? null,
    imageUrls: images.map((i) => i.url),
    images: images.map((i) => ({ url: i.url, caption: i.caption })),
  }
}

export type ReportUsage = {
  id: string
  experimentId: string
  experimentName: string | null
  species: string
  speciesId: string | null
  tissueLabel: string | null
  tissueId: string | null
  fixation: string | null
  method: string
  methodShort: string
  dilution: string | null
  incubation: string | null
  antigenRetrieval: string | null
  works: boolean | null
  signalQuality: string | null
  specificity: string | null
  fluorophore: string | null
  metalTag: string | null
  cycleNumber: number | null
  notes: string | null
  images: ReportImageResponse[]
  createdAt: string
  submitter: string
  submitterId: string | null
  submitterInstitution: string | null
  antibodyId: string
  antibodyDbId: string | null
  antibodyName: string
  antibodyVendor: string
  catalogNumber: string | null
  clone: string | null
  hostSpecies: string | null
  conjugate: string | null
  proteinId: string | null
  markerName: string | null
  cellTypes: { id: string; label: string }[]
  subcellularId: string | null
  subcellularLabel: string | null
  conditionId: string | null
  conditionLabel: string | null
  specimen: SpecimenDetail
  status: string
}

export function toReportUsage(report: ReportRow): ReportUsage {
  return {
    id: report.id,
    experimentId: report.experimentId,
    experimentName: report.experiment.name ?? null,
    species: report.experiment.species?.label ?? "Unknown",
    speciesId: report.experiment.species?.id ?? null,
    tissueLabel: report.experiment.tissue?.label ?? null,
    tissueId: report.experiment.tissue?.id ?? null,
    fixation: report.experiment.fixation ?? null,
    method: report.experiment.imagingMethod?.label ?? "Unknown",
    methodShort: report.experiment.imagingMethod?.shortLabel ?? "Unknown",
    dilution: report.dilution ?? null,
    incubation: report.incubation,
    antigenRetrieval: report.experiment.antigenRetrieval
      ? (ANTIGEN_RETRIEVAL_LABELS[report.experiment.antigenRetrieval] ?? report.experiment.antigenRetrieval)
      : null,
    works: report.works,
    signalQuality: report.signalQuality,
    specificity: report.specificity,
    fluorophore: report.fluorophore?.name ?? null,
    metalTag: report.metalTag,
    cycleNumber: report.cycleNumber,
    notes: report.notes,
    images: report.images.map((i) => ({ url: i.url, caption: i.caption })),
    createdAt: report.createdAt.toISOString(),
    submitter: report.experiment.submitter?.name ?? "Anonymous",
    submitterId: report.experiment.submitter?.id ?? null,
    submitterInstitution: report.experiment.submitter?.institution ?? null,
    // The canonical RRID, or "" when the antibody has none. Never a fabricated id: /antibody/[id]
    // resolves by RRID, so a made-up value renders a link that always 404s.
    antibodyId: report.antibody?.rrid ?? "",
    antibodyDbId: report.antibody?.id ?? null,
    antibodyName: report.antibody?.name ?? "Unknown",
    antibodyVendor: report.antibody?.vendorName ?? "Unknown",
    catalogNumber: report.antibody?.catalogNumber ?? null,
    clone: report.antibody?.cloneId ?? null,
    hostSpecies: report.antibody?.hostTaxon?.label ?? null,
    conjugate: report.antibody?.conjugate ?? null,
    proteinId: report.antibody?.targetProteinId ?? null,
    markerName: report.antibody?.targetName ?? report.antibody?.name ?? null,
    cellTypes: report.cellTypes.map((l) => ({ id: l.cellType.id, label: l.cellType.label })),
    subcellularId: report.subcellular?.id ?? null,
    subcellularLabel: report.subcellular?.label ?? null,
    conditionId: report.experiment.condition?.id ?? null,
    conditionLabel: report.experiment.condition?.label ?? null,
    specimen: toSpecimenDetail(report.experiment),
    status: report.status,
  }
}

export function reportUsageImages(usage: ReportUsage): CarouselImage[] {
  const links: CarouselImageLink[] = []
  if (usage.proteinId && usage.markerName) {
    links.push({ label: usage.markerName, href: markerHref(usage.proteinId) })
  }
  const abHref = antibodyHref(usage.antibodyId)
  if (abHref) {
    links.push({ label: usage.antibodyName, href: abHref })
  }
  for (const cellType of usage.cellTypes) {
    links.push({ label: cellType.label, href: cellTypeHref(cellType.id) })
  }

  const facts: string[] = []
  if (usage.subcellularLabel) facts.push(usage.subcellularLabel)
  if (usage.tissueLabel) facts.push(usage.tissueLabel)
  if (usage.species && usage.species !== "Unknown") facts.push(usage.species)

  const title = usage.markerName ?? usage.antibodyName
  return usage.images.map((image) => ({ src: image.url, caption: image.caption, title, links, facts }))
}

type SortAccessor<T> = (entry: T) => string | number

function sortEntries<T>(
  entries: T[],
  accessors: Record<string, SortAccessor<T>>,
  sort?: string | null,
  order: string = "desc",
): T[] {
  const accessor = sort ? accessors[sort] : undefined
  if (!accessor) return entries

  const direction = order === "asc" ? 1 : -1
  return [...entries].sort((a, b) => {
    const aValue = accessor(a)
    const bValue = accessor(b)
    if (aValue < bValue) return -direction
    if (aValue > bValue) return direction
    return 0
  })
}

const joinedCellTypes = (cellTypes: { label: string }[]) =>
  cellTypes
    .map((c) => c.label)
    .join(", ")
    .toLowerCase()

const MARKER_SORT_ACCESSORS: Record<string, SortAccessor<MarkerEntry>> = {
  marker: (entry) => entry.marker.toLowerCase(),
  cellType: (entry) => joinedCellTypes(entry.cellTypes),
  species: (entry) => entry.species.toLowerCase(),
  tissue: (entry) => entry.tissue.toLowerCase(),
  methods: (entry) => entry.validatedMethods.join(", ").toLowerCase(),
  reportCount: (entry) => entry.reportCount,
}

const ANTIBODY_SORT_ACCESSORS: Record<string, SortAccessor<AntibodyEntry>> = {
  name: (entry) => entry.name.toLowerCase(),
  target: (entry) => (entry.target ?? "").toLowerCase(),
  rrid: (entry) => (entry.rrid ?? "").toLowerCase(),
  vendor: (entry) => (entry.vendor ?? "").toLowerCase(),
  clone: (entry) => (entry.clone ?? "").toLowerCase(),
  reportCount: (entry) => entry.reportCount,
}

const REPORT_SORT_ACCESSORS: Record<string, SortAccessor<ReportEntry>> = {
  marker: (entry) => entry.marker.toLowerCase(),
  member: (entry) => (entry.submitter?.name ?? "").toLowerCase(),
  antibodyName: (entry) => entry.antibodyName.toLowerCase(),
  cellType: (entry) => joinedCellTypes(entry.cellTypes),
  subcellular: (entry) => (entry.subcellular ?? "").toLowerCase(),
  species: (entry) => entry.species.toLowerCase(),
  tissue: (entry) => entry.tissue.toLowerCase(),
  method: (entry) => entry.method.toLowerCase(),
  specificity: (entry) => SPECIFICITY_RANK[entry.specificity as keyof typeof SPECIFICITY_RANK] ?? -1,
  works: (entry) => (entry.works === null ? -1 : entry.works ? 1 : 0),
}

export function sortMarkerEntries(entries: MarkerEntry[], sort?: string | null, order: string = "desc"): MarkerEntry[] {
  return sortEntries(entries, MARKER_SORT_ACCESSORS, sort, order)
}

export function sortAntibodyEntries(
  entries: AntibodyEntry[],
  sort?: string | null,
  order: string = "desc",
): AntibodyEntry[] {
  return sortEntries(entries, ANTIBODY_SORT_ACCESSORS, sort, order)
}

export function sortReportEntries(entries: ReportEntry[], sort?: string | null, order: string = "desc"): ReportEntry[] {
  return sortEntries(entries, REPORT_SORT_ACCESSORS, sort, order)
}

const MAX_ENTRY_IMAGES = 12

function collectImages(reports: ReportRow[], cap = MAX_ENTRY_IMAGES): CarouselImage[] {
  const items: CarouselImage[] = []
  const seen = new Set<string>()
  for (const report of reports) {
    for (const item of reportUsageImages(toReportUsage(report))) {
      if (seen.has(item.src)) continue
      seen.add(item.src)
      items.push(item)
      if (items.length >= cap) return items
    }
  }
  return items
}

function toMarkerReport(r: ReportRow): MarkerReport {
  const { citation, doi, pmid } = r.experiment
  return {
    id: String(r.id),
    submitter: r.experiment.submitter?.name ?? null,
    submitterId: r.experiment.submitter?.id ?? null,
    lab: r.experiment.owningLab?.name ?? null,
    publication: citation || doi || pmid ? { citation, doi, pmid } : null,
    method: r.experiment.imagingMethod?.shortLabel ?? "Unknown",
    species: r.experiment.species?.label ?? "Unknown",
    works: r.works,
  }
}

export function aggregateMarkerEntries(reports: ReportRow[]): MarkerEntry[] {
  const groups = new Map<string, { reports: ReportRow[]; marker: string; id: string; proteinId: string | null }>()

  for (const report of reports) {
    const proteinId = report.antibody?.targetProteinId ?? null
    // Antibodies with no linked protein (secondaries, and primaries whose target was never resolved to
    // UniProt) still deserve a row, but they group by antibody rather than by protein and they must not
    // produce a /marker/ link: that route resolves a UniProt accession and would 404.
    const groupKey = proteinId ?? (report.antibody?.id ? `antibody:${report.antibody.id}` : `report:${report.id}`)

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        reports: [],
        marker: report.antibody?.targetName ?? report.antibody?.name ?? "Unlinked antibody",
        id: groupKey,
        proteinId,
      })
    }

    groups.get(groupKey)!.reports.push(report)
  }

  return Array.from(groups.values()).map((group) => {
    const methods = [
      ...new Set(group.reports.map((r) => r.experiment.imagingMethod?.shortLabel).filter(Boolean)),
    ] as string[]
    const species = [...new Set(group.reports.map((r) => r.experiment.species?.label).filter(Boolean))] as string[]
    const tissues = [...new Set(group.reports.map((r) => r.experiment.tissue?.label).filter(Boolean))] as string[]

    const cellTypeMap = new Map<string, string>()
    for (const r of group.reports) {
      for (const link of r.cellTypes) {
        cellTypeMap.set(link.cellType.id, link.cellType.label)
      }
    }
    const cellTypes = [...cellTypeMap.entries()].map(([id, label]) => ({ id, label }))

    return {
      id: group.id,
      proteinId: group.proteinId,
      marker: group.marker,
      cellTypes,
      species: species.join(", ") || "Unknown",
      tissue: tissues.join(", ") || "Unknown",
      validatedMethods: methods,
      reportCount: group.reports.length,
      images: collectImages(group.reports),
      reports: group.reports.map(toMarkerReport),
    }
  })
}

export function aggregateAntibodyEntries(reports: ReportRow[]): AntibodyEntry[] {
  const groups = new Map<string, { reports: ReportRow[]; antibody: NonNullable<ReportRow["antibody"]> }>()

  for (const report of reports) {
    if (!report.antibody) continue
    const key = report.antibody.id
    if (!groups.has(key)) {
      groups.set(key, { reports: [], antibody: report.antibody })
    }
    groups.get(key)!.reports.push(report)
  }

  return Array.from(groups.values()).map(({ reports: rows, antibody }) => ({
    id: antibody.id,
    rrid: antibody.rrid,
    name: antibody.name,
    target: antibody.targetName,
    targetProteinId: antibody.targetProteinId,
    vendor: antibody.vendorName,
    clone: antibody.cloneId,
    reportCount: rows.length,
    images: collectImages(rows),
    reports: rows.map(toMarkerReport),
  }))
}

export function toReportEntry(report: ReportRow): ReportEntry {
  return {
    id: report.id,
    experimentId: report.experimentId,
    marker: report.antibody?.targetName ?? report.antibody?.name ?? "Unlinked antibody",
    antibodyId: report.antibody?.id ?? null,
    antibodyName: report.antibody?.name ?? "Unknown",
    rrid: report.antibody?.rrid ?? null,
    species: report.experiment.species?.label ?? "Unknown",
    tissue: report.experiment.tissue?.label ?? "Unknown",
    method: report.experiment.imagingMethod?.shortLabel ?? "Unknown",
    cellTypes: report.cellTypes.map((l) => ({ id: l.cellType.id, label: l.cellType.label })),
    subcellular: report.subcellular?.label ?? null,
    specificity: report.specificity,
    works: report.works,
    images: collectImages([report]),
    submitter: report.experiment.submitter
      ? { id: report.experiment.submitter.id, name: report.experiment.submitter.name }
      : null,
  }
}
