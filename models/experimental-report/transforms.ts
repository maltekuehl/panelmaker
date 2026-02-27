import type { MarkerEntry } from "@/components/browse/columns"
import type { ReportRow } from "./queries"

export type ReportResponse = Omit<ReportRow, "imageUrls"> & {
  imageUrls: string[]
}

function parseJsonArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function toReportResponse(report: ReportRow): ReportResponse {
  return {
    ...report,
    imageUrls: parseJsonArray(report.imageUrls),
  }
}

const SPECIES_LABELS: Record<string, string> = {
  HUMAN: "Homo sapiens",
  MOUSE: "Mus musculus",
  RAT: "Rattus norvegicus",
  NON_HUMAN_PRIMATE: "Non-human primate",
  PIG: "Sus scrofa",
  RABBIT: "Oryctolagus cuniculus",
  ZEBRAFISH: "Danio rerio",
  OTHER: "Other",
}

const FIXATION_LABELS: Record<string, string> = {
  FFPE: "FFPE",
  FRESH_FROZEN: "Fresh Frozen",
  PFA: "PFA",
  ACETONE: "Acetone",
  METHANOL: "Methanol",
  OTHER: "Other",
}

const VALIDATION_CATEGORY: Record<string, 0 | 1 | 2 | 3 | 4> = {
  PENDING: 1,
  VALIDATED: 3,
  REJECTED: 0,
}

export type ReportUsage = {
  id: string
  species: string
  tissueType: string
  fixation: string
  method: string
  dilution: string
  antigenRetrieval: string
  validationCategory: number
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
  antibodyDbId: number | null
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
    validationCategory: VALIDATION_CATEGORY[report.status] ?? 0,
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
    status: report.status,
  }
}

export function toMarkerEntry(report: ReportRow): MarkerEntry {
  const markerName = report.antibody?.targetName ?? report.antibody?.name ?? `Report #${report.id}`
  const cellTypeLabel = report.cellType?.label ?? "Unknown"
  const species = report.species ? (SPECIES_LABELS[report.species] ?? report.species) : "Unknown"
  const tissue = report.tissueType ?? "Unknown"
  const methods = report.method ? [report.method] : []
  const validationCategory = VALIDATION_CATEGORY[report.status] ?? 0

  return {
    id: report.antibody?.targetProteinId ?? String(report.id),
    marker: markerName,
    cellType: cellTypeLabel,
    cellTypeId: report.cellTypeId ?? undefined,
    species,
    tissue,
    validatedMethods: methods,
    validationCategory,
  }
}
