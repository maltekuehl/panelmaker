import type { AntibodyRegistryValue } from "@/components/antibody-registry-combobox"
import type { FluorophoreOption } from "@/components/fluorophore-combobox"
import { AntigenRetrieval, MultiplexMethod } from "@/lib/generated/prisma/enums"

export type OntologyValue = { id: string; label: string }
export type ProteinValue = { id: string; label: string; geneSymbol?: string | null }

export type ExperimentContext = {
  name: string
  description: string
  species: OntologyValue | null
  tissue: OntologyValue | null
  fixation: string
  method: MultiplexMethod | ""
  antigenRetrieval: AntigenRetrieval | ""
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
    name: "",
    description: "",
    species: null,
    tissue: null,
    fixation: "FFPE",
    method: "",
    antigenRetrieval: "",
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

export function extractOrganismId(speciesId: string): number | undefined {
  const match = speciesId.match(/txid(\d+)/)
  if (match?.[1]) return parseInt(match[1], 10)
  const numericMatch = speciesId.match(/(\d+)$/)
  if (numericMatch?.[1]) return parseInt(numericMatch[1], 10)
  return undefined
}

export function isContextComplete(_context: ExperimentContext): boolean {
  return true
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

export const ANTIGEN_RETRIEVAL_OPTIONS: { value: AntigenRetrieval; label: string }[] = [
  { value: AntigenRetrieval.CITRATE_PH6, label: "Citrate pH 6.0" },
  { value: AntigenRetrieval.TRIS_EDTA_PH9, label: "Tris-EDTA pH 9.0" },
  { value: AntigenRetrieval.ENZYMATIC, label: "Enzymatic (Pepsin/Trypsin)" },
  { value: AntigenRetrieval.NONE, label: "None" },
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
  }
  return errors
}

export function buildBatchPayload(context: ExperimentContext, rows: AntibodyRow[]) {
  return {
    context: {
      name: context.name.trim() || undefined,
      description: context.description.trim() || undefined,
      species: context.species ?? undefined,
      tissue: context.tissue ?? undefined,
      fixation: context.fixation || undefined,
      method: context.method || undefined,
      antigenRetrieval: context.antigenRetrieval || undefined,
      condition: context.condition ?? undefined,
    },
    antibodies: rows.map((row) => ({
      antibodyData: row.antibodyRegistry ?? undefined,
      proteinData: row.markerProtein ?? undefined,
      markerName: row.markerName.trim(),
      rrid: row.rrid || row.antibodyRegistry?.citation || undefined,
      vendor: row.antibodyVendor || undefined,
      catalogNumber: row.catalogNumber || undefined,
      cloneId: row.cloneId || undefined,
      hostSpecies: row.hostSpecies ?? undefined,
      cellTypes: row.cellTypes,
      dilution: row.dilution.trim() || undefined,
      incubation: row.incubation || undefined,
      fluorophoreId: row.fluorophore?.id || undefined,
      metalTag: row.metalTag || undefined,
      cycleNumber: row.cycleNumber ? Number(row.cycleNumber) : undefined,
      works: row.works === "Yes" ? true : row.works === "No" ? false : undefined,
      signalQuality: row.signalQuality || undefined,
      specificity: row.specificity || undefined,
      subcellularLocation: row.locationNotDiscernible ? undefined : (row.subcellularLocation ?? undefined),
      notes: row.notes || undefined,
    })),
  }
}
