import type { AntibodyRegistryValue } from "@/components/antibody-registry-combobox"
import type { FluorophoreOption } from "@/components/fluorophore-combobox"
import { MultiplexMethod } from "@/lib/generated/prisma/enums"

export type OntologyValue = { id: string; label: string }
export type ProteinValue = { id: string; label: string; geneSymbol?: string | null }

export type ExperimentContext = {
  species: OntologyValue | null
  tissue: OntologyValue | null
  fixation: string
  method: MultiplexMethod | ""
  antigenRetrieval: string
  condition: OntologyValue | null
}

export type AntibodyRow = {
  key: string
  antibodyRegistry: AntibodyRegistryValue | null
  markerProtein: ProteinValue | null
  markerName: string
  cellTypes: OntologyValue[]
  dilution: string
  fluorophore: FluorophoreOption | null
  metalTag: string
  cycleNumber: string
  incubation: string
  antibodyVendor: string
  catalogNumber: string
  cloneId: string
  rrid: string
  hostSpecies: OntologyValue | null
  works: string
  signalQuality: string
  specificity: string
  subcellularLocation: OntologyValue | null
  locationNotDiscernible: boolean
  notes: string
}

export function emptyContext(): ExperimentContext {
  return {
    species: null,
    tissue: null,
    fixation: "FFPE",
    method: "",
    antigenRetrieval: "Citrate pH 6.0",
    condition: null,
  }
}

let rowCounter = 0

export function emptyRow(): AntibodyRow {
  rowCounter += 1
  return {
    key: `row-${rowCounter}`,
    antibodyRegistry: null,
    markerProtein: null,
    markerName: "",
    cellTypes: [],
    dilution: "",
    fluorophore: null,
    metalTag: "",
    cycleNumber: "",
    incubation: "",
    antibodyVendor: "",
    catalogNumber: "",
    cloneId: "",
    rrid: "",
    hostSpecies: null,
    works: "",
    signalQuality: "",
    specificity: "",
    subcellularLocation: null,
    locationNotDiscernible: false,
    notes: "",
  }
}

export function duplicateRow(row: AntibodyRow): AntibodyRow {
  rowCounter += 1
  return { ...row, key: `row-${rowCounter}`, cellTypes: [...row.cellTypes] }
}

const FLUOROPHORE_METHODS = new Set<MultiplexMethod>([
  MultiplexMethod.PATHOPLEX,
  MultiplexMethod.CODEX,
  MultiplexMethod.CYCIF,
  MultiplexMethod.IBEX,
])
const METAL_TAG_METHODS = new Set<MultiplexMethod>([MultiplexMethod.IMC, MultiplexMethod.MIBI])
const CYCLE_NUMBER_METHODS = new Set<MultiplexMethod>([
  MultiplexMethod.PATHOPLEX,
  MultiplexMethod.CODEX,
  MultiplexMethod.CYCIF,
  MultiplexMethod.IBEX,
])

export function methodNeedsFluorophore(method: MultiplexMethod | ""): boolean {
  return !!method && FLUOROPHORE_METHODS.has(method)
}

export function methodNeedsMetal(method: MultiplexMethod | ""): boolean {
  return !!method && METAL_TAG_METHODS.has(method)
}

export function methodNeedsCycle(method: MultiplexMethod | ""): boolean {
  return !!method && CYCLE_NUMBER_METHODS.has(method)
}

const SPECIES_LABEL_TO_ENUM: Record<string, string> = {
  "Homo sapiens": "HUMAN",
  "Mus musculus": "MOUSE",
  "Rattus norvegicus": "RAT",
  "Sus scrofa": "PIG",
  "Oryctolagus cuniculus": "RABBIT",
  "Danio rerio": "ZEBRAFISH",
}

export function mapSpeciesToEnum(label: string): string {
  return SPECIES_LABEL_TO_ENUM[label] ?? (label.toLowerCase().includes("primate") ? "NON_HUMAN_PRIMATE" : "OTHER")
}

export function extractOrganismId(speciesId: string): number | undefined {
  const match = speciesId.match(/txid(\d+)/)
  if (match?.[1]) return parseInt(match[1], 10)
  const numericMatch = speciesId.match(/(\d+)$/)
  if (numericMatch?.[1]) return parseInt(numericMatch[1], 10)
  return undefined
}

function buildRowNotes(row: AntibodyRow, context: ExperimentContext): string {
  const parts: string[] = []
  const ab = row.antibodyRegistry

  parts.push(`Marker: ${row.markerName}`)
  if (row.markerProtein) parts.push(`Protein: ${row.markerProtein.label} [${row.markerProtein.id}]`)
  parts.push(`Cell types: ${row.cellTypes.map((ct) => `${ct.label} [${ct.id}]`).join(", ")}`)
  if (context.species) parts.push(`Species: ${context.species.label} [${context.species.id}]`)
  if (context.tissue) parts.push(`Tissue: ${context.tissue.label} [${context.tissue.id}]`)

  const vendor = ab?.vendor || row.antibodyVendor
  const catalog = ab?.catalogNumber || row.catalogNumber
  const cloneId = ab?.cloneId || row.cloneId
  const rrid = ab?.citation || row.rrid

  if (vendor) parts.push(`Vendor: ${vendor}`)
  if (catalog) parts.push(`Catalog #: ${catalog}`)
  if (cloneId) parts.push(`Clone ID: ${cloneId}`)
  if (rrid) parts.push(`RRID: ${rrid}`)
  if (ab?.clonality) parts.push(`Clonality: ${ab.clonality}`)
  if (ab?.target) parts.push(`Target: ${ab.target}`)
  if (row.hostSpecies) parts.push(`Host species: ${row.hostSpecies.label} [${row.hostSpecies.id}]`)
  if (row.incubation) parts.push(`Incubation: ${row.incubation}`)
  if (row.locationNotDiscernible) {
    parts.push("Subcellular location: Not discernible")
  } else if (row.subcellularLocation) {
    parts.push(`Subcellular location: ${row.subcellularLocation.label} (${row.subcellularLocation.id})`)
  }
  if (context.condition?.label) parts.push(`Condition: ${context.condition.label} (${context.condition.id})`)
  if (row.notes) parts.push(`Notes: ${row.notes}`)

  return parts.join("\n")
}

export function isContextComplete(context: ExperimentContext): boolean {
  return !!(context.species && context.tissue && context.fixation && context.method && context.antigenRetrieval)
}

export const FIXATION_OPTIONS: { value: string; label: string }[] = [
  { value: "FFPE", label: "FFPE" },
  { value: "FRESH_FROZEN", label: "Fresh Frozen" },
  { value: "PFA", label: "PFA" },
  { value: "METHANOL", label: "Methanol" },
  { value: "ACETONE", label: "Acetone" },
  { value: "OTHER", label: "Other" },
]

export const METHOD_OPTIONS: { value: MultiplexMethod; label: string }[] = [
  { value: MultiplexMethod.PATHOPLEX, label: "PathoPlex" },
  { value: MultiplexMethod.CODEX, label: "CODEX / PhenoCycler" },
  { value: MultiplexMethod.CYCIF, label: "CyCIF" },
  { value: MultiplexMethod.IMC, label: "Imaging Mass Cytometry (IMC)" },
  { value: MultiplexMethod.MIBI, label: "MIBI-ToF" },
  { value: MultiplexMethod.IBEX, label: "IBEX" },
]

export const ANTIGEN_RETRIEVAL_OPTIONS: { value: string; label: string }[] = [
  { value: "Citrate pH 6.0", label: "Citrate pH 6.0" },
  { value: "Tris-EDTA pH 9.0", label: "Tris-EDTA pH 9.0" },
  { value: "Enzymatic", label: "Enzymatic (Pepsin/Trypsin)" },
  { value: "None", label: "None" },
]

export function fixationLabel(value: string): string {
  return FIXATION_OPTIONS.find((o) => o.value === value)?.label ?? value
}

export function methodLabel(value: MultiplexMethod | ""): string {
  return METHOD_OPTIONS.find((o) => o.value === value)?.label ?? value
}

export type RowValidationError = { key: string; field: keyof AntibodyRow; message: string }

export function validateRows(rows: AntibodyRow[]): RowValidationError[] {
  const errors: RowValidationError[] = []
  for (const row of rows) {
    if (!row.markerName.trim()) errors.push({ key: row.key, field: "markerName", message: "Marker name is required" })
    if (row.cellTypes.length === 0)
      errors.push({ key: row.key, field: "cellTypes", message: "At least one cell type is required" })
    if (!row.dilution.trim()) errors.push({ key: row.key, field: "dilution", message: "Dilution is required" })
  }
  return errors
}

export function buildBatchPayload(context: ExperimentContext, rows: AntibodyRow[]) {
  return {
    context: {
      species: mapSpeciesToEnum(context.species?.label ?? ""),
      tissueType: context.tissue?.label ?? "",
      fixation: context.fixation,
      method: context.method,
      antigenRetrieval: context.antigenRetrieval,
      condition: context.condition ?? undefined,
    },
    antibodies: rows.map((row) => ({
      antibodyData: row.antibodyRegistry ?? undefined,
      proteinData: row.markerProtein ?? undefined,
      markerName: row.markerName.trim(),
      rrid: row.rrid || row.antibodyRegistry?.citation || undefined,
      antibodyVendor: row.antibodyVendor || undefined,
      catalogNumber: row.catalogNumber || undefined,
      cloneId: row.cloneId || undefined,
      hostSpecies: row.hostSpecies?.label || undefined,
      cellTypes: row.cellTypes,
      dilution: row.dilution.trim(),
      fluorophoreId: row.fluorophore?.id || undefined,
      metalTag: row.metalTag || undefined,
      cycleNumber: row.cycleNumber ? Number(row.cycleNumber) : undefined,
      works: row.works === "Yes" ? true : row.works === "No" ? false : undefined,
      signalQuality: row.signalQuality || undefined,
      specificity: row.specificity || undefined,
      subcellularLocation: row.locationNotDiscernible ? undefined : (row.subcellularLocation ?? undefined),
      notes: buildRowNotes(row, context),
    })),
  }
}
