import type { MarkerEntry } from "@/components/browse/columns"
import { FIXATION_LABELS, METHOD_LABELS, SPECIES_LABELS } from "@/lib/constants"
import { parseJsonArray } from "@/lib/transforms"
import type { ReportRow } from "./queries"

export type ReportResponse = Omit<ReportRow, "imageUrls"> & {
  imageUrls: string[]
}

export function toReportResponse(report: ReportRow): ReportResponse {
  return {
    ...report,
    imageUrls: parseJsonArray(report.imageUrls),
  }
}

export type ReportUsage = {
  id: string
  species: string
  tissueType: string
  fixation: string
  method: string
  dilution: string
  antigenRetrieval: string
  works: boolean | null
  signalQuality: string | null
  specificity: string | null
  fluorophore: string | null
  metalTag: string | null
  cycleNumber: number | null
  notes: string | null
  images: string[]
  createdAt: string
  submitter: string
  submitterId: string | null
  submitterInstitution: string | null
  antibodyId: string
  antibodyDbId: string | null
  antibodyName: string
  antibodyVendor: string
  catalogNumber: string | null
  clone: string
  hostSpecies: string | null
  conjugate: string | null
  proteinId: string | null
  markerName: string | null
  cellTypeId: string | null
  cellTypeLabel: string | null
  structureId: string | null
  structureLabel: string | null
  conditionId: string | null
  conditionLabel: string | null
  status: string
}

export function toReportUsage(report: ReportRow): ReportUsage {
  return {
    id: String(report.id),
    species: report.species ? (SPECIES_LABELS[report.species] ?? report.species) : "Unknown",
    tissueType: report.tissueType ?? "N/A",
    fixation: report.fixation ? (FIXATION_LABELS[report.fixation] ?? report.fixation) : "N/A",
    method: report.method ?? "Unknown",
    dilution: report.dilution ?? "N/A",
    antigenRetrieval: report.antigenRetrieval ?? "N/A",
    works: report.works,
    signalQuality: report.signalQuality,
    specificity: report.specificity,
    fluorophore: report.fluorophore,
    metalTag: report.metalTag,
    cycleNumber: report.cycleNumber,
    notes: report.notes,
    images: parseJsonArray(report.imageUrls),
    createdAt: report.createdAt.toISOString(),
    submitter: report.submitter?.name ?? "Anonymous",
    submitterId: report.submitter?.id ?? null,
    submitterInstitution: report.submitter?.institution ?? null,
    antibodyId: report.antibody?.rrid ?? `AB_${report.antibodyId ?? "unknown"}`,
    antibodyDbId: report.antibody?.id ?? null,
    antibodyName: report.antibody?.name ?? "Unknown",
    antibodyVendor: report.antibody?.vendorName ?? "Unknown",
    catalogNumber: report.antibody?.catalogNumber ?? null,
    clone: report.antibody?.cloneId ?? "N/A",
    hostSpecies: report.antibody?.sourceOrganism ?? null,
    conjugate: report.antibody?.conjugate ?? null,
    proteinId: report.antibody?.targetProteinId ?? null,
    markerName: report.antibody?.targetName ?? report.antibody?.name ?? null,
    cellTypeId: report.cellTypeId ?? null,
    cellTypeLabel: report.cellType?.label ?? null,
    structureId: report.structureId ?? null,
    structureLabel: report.structure?.label ?? null,
    conditionId: report.conditionId ?? null,
    conditionLabel: report.condition?.label ?? null,
    status: report.status,
  }
}

export function aggregateMarkerEntries(reports: ReportRow[]): MarkerEntry[] {
  const groups = new Map<
    string,
    { reports: ReportRow[]; marker: string; cellType: string; cellTypeId?: string; id: string }
  >()

  for (const report of reports) {
    const markerId = report.antibody?.targetProteinId ?? String(report.id)
    const cellTypeId = report.cellTypeId ?? "unknown"
    const key = `${markerId}::${cellTypeId}`

    if (!groups.has(key)) {
      groups.set(key, {
        reports: [],
        marker: report.antibody?.targetName ?? report.antibody?.name ?? `Report #${report.id}`,
        cellType: report.cellType?.label ?? "Unknown",
        cellTypeId: report.cellTypeId ?? undefined,
        id: markerId,
      })
    }

    groups.get(key)!.reports.push(report)
  }

  return Array.from(groups.values()).map((group) => {
    const methods = [...new Set(group.reports.map((r) => r.method).filter(Boolean))] as string[]
    const species = [
      ...new Set(
        group.reports.map((r) => (r.species ? (SPECIES_LABELS[r.species] ?? r.species) : null)).filter(Boolean),
      ),
    ] as string[]
    const tissues = [...new Set(group.reports.map((r) => r.tissueType).filter(Boolean))] as string[]

    return {
      id: group.id,
      marker: group.marker,
      cellType: group.cellType,
      cellTypeId: group.cellTypeId,
      species: species.join(", ") || "Unknown",
      tissue: tissues.join(", ") || "Unknown",
      validatedMethods: methods,
      reportCount: group.reports.length,
      reports: group.reports.map((r) => ({
        id: String(r.id),
        submitter: r.submitter?.name ?? "Anonymous",
        submitterId: r.submitter?.id ?? null,
        method: r.method ? (METHOD_LABELS[r.method] ?? r.method) : "Unknown",
        species: r.species ? (SPECIES_LABELS[r.species] ?? r.species) : "Unknown",
        works: r.works,
      })),
    }
  })
}
