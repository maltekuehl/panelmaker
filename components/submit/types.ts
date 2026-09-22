import type { AntibodyRegistryValue } from "@/components/antibody-registry-combobox"
import type { FluorophoreOption } from "@/components/fluorophore-combobox"
import type { ImagingMethodOption } from "@/components/imaging-method-select"
import { DONOR_SEX_LABELS, PRESERVATION_LABELS, SAMPLE_TYPE_LABELS } from "@/lib/constants"
import { AntigenRetrieval, DonorSex, Preservation, SampleType, type Visibility } from "@/lib/generated/prisma/enums"
import { parseTaxonUid } from "@/models/taxon/id"

import type { OntologyValue } from "@/components/ontology-combobox"

export type { OntologyValue }
export type ProteinValue = { id: string; label: string; geneSymbol?: string | null }
export type ReportImageInput = { url: string; caption: string; cellTypeIds: string[] }

export type ExperimentContext = {
  name: string
  description: string
  citation: string
  pmid: string
  doi: string
  species: OntologyValue | null
  tissue: OntologyValue | null
  preservation: string
  imagingMethodId: string
  antigenRetrieval: AntigenRetrieval | ""
  condition: OntologyValue | null
  visibility: Visibility
  sharedLabIds: string[]
  protocolDoi: string
  specimen: SpecimenContext
}

// Every field here is optional on the server and lives behind one collapsed section in the form.
export type SpecimenContext = {
  preservationText: string
  fixative: OntologyValue | null
  fixativeConcentration: string
  antigenRetrievalText: string
  sampleType: string
  sectionThicknessUm: string
  donorSex: string
  donorAge: string
  developmentalStage: OntologyValue | null
}

// One serialisation for the specimen fields, shared by the submit form and the experiment edit dialog.
export function specimenPayload(specimen: SpecimenContext) {
  return {
    preservationText: specimen.preservationText.trim() || undefined,
    fixative: specimen.fixative ?? undefined,
    fixativeConcentration: specimen.fixativeConcentration.trim() || undefined,
    antigenRetrievalText: specimen.antigenRetrievalText.trim() || undefined,
    sampleType: specimen.sampleType || undefined,
    sectionThicknessUm: specimen.sectionThicknessUm.trim() || undefined,
    donorSex: specimen.donorSex || undefined,
    donorAge: specimen.donorAge.trim() || undefined,
    developmentalStage: specimen.developmentalStage ?? undefined,
  }
}

export function emptySpecimen(): SpecimenContext {
  return {
    preservationText: "",
    fixative: null,
    fixativeConcentration: "",
    antigenRetrievalText: "",
    sampleType: "",
    sectionThicknessUm: "",
    donorSex: "",
    donorAge: "",
    developmentalStage: null,
  }
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
  images: ReportImageInput[]
}

export function emptyContext(): ExperimentContext {
  return {
    name: "",
    description: "",
    citation: "",
    pmid: "",
    doi: "",
    species: null,
    tissue: null,
    preservation: "FFPE",
    imagingMethodId: "",
    antigenRetrieval: "",
    condition: null,
    visibility: "PRIVATE",
    sharedLabIds: [],
    protocolDoi: "",
    specimen: emptySpecimen(),
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
    images: [],
  }
}

export function duplicateRow(row: AntibodyRow): AntibodyRow {
  rowCounter += 1
  return { ...row, key: `row-${rowCounter}`, cellTypes: [...row.cellTypes], images: [] }
}

export function methodNeedsFluorophore(method: ImagingMethodOption | null): boolean {
  return method?.detection === "FLUORESCENCE"
}

export function methodNeedsMetalTag(method: ImagingMethodOption | null): boolean {
  return method?.detection === "MASS"
}

export function methodNeedsCycle(method: ImagingMethodOption | null): boolean {
  return method?.cyclic === true
}

export function extractOrganismId(speciesId: string): number | undefined {
  const uid = parseTaxonUid(speciesId)
  return uid ? parseInt(uid, 10) : undefined
}

export function isContextComplete(context: ExperimentContext): boolean {
  return context.name.trim().length > 0
}

export const PRESERVATION_OPTIONS: { value: string; label: string }[] = Object.values(Preservation).map((value) => ({
  value,
  label: PRESERVATION_LABELS[value],
}))

export const SAMPLE_TYPE_OPTIONS: { value: string; label: string }[] = Object.values(SampleType).map((value) => ({
  value,
  label: SAMPLE_TYPE_LABELS[value],
}))

export const DONOR_SEX_OPTIONS: { value: string; label: string }[] = Object.values(DonorSex).map((value) => ({
  value,
  label: DONOR_SEX_LABELS[value],
}))

// HsapDv for a human donor, MmusDv for a mouse one. Any other species has no species-specific
// developmental stage ontology on OLS4, so the field is offered only for those two.
export function developmentalStageOntology(species: OntologyValue | null): "hsapdv" | "mmusdv" | null {
  const uid = species ? parseTaxonUid(species.id) : null
  if (uid === "9606") return "hsapdv"
  if (uid === "10090") return "mmusdv"
  return null
}

export const ANTIGEN_RETRIEVAL_OPTIONS: { value: AntigenRetrieval; label: string }[] = [
  { value: AntigenRetrieval.CITRATE_PH6, label: "Citrate pH 6.0" },
  { value: AntigenRetrieval.TRIS_EDTA_PH9, label: "Tris-EDTA pH 9.0" },
  { value: AntigenRetrieval.ENZYMATIC, label: "Enzymatic (Pepsin/Trypsin)" },
  { value: AntigenRetrieval.NONE, label: "None" },
]

export function preservationOptionLabel(value: string): string {
  return PRESERVATION_OPTIONS.find((o) => o.value === value)?.label ?? value
}

export type RowValidationError = { key: string; field: keyof AntibodyRow; message: string }

export function validateRows(rows: AntibodyRow[]): RowValidationError[] {
  const errors: RowValidationError[] = []
  for (const row of rows) {
    if (!row.markerName.trim()) errors.push({ key: row.key, field: "markerName", message: "Marker name is required" })
    if (row.images.length === 0) errors.push({ key: row.key, field: "images", message: "Add at least one image" })
  }
  return errors
}

export function buildBatchPayload(context: ExperimentContext, rows: AntibodyRow[]) {
  return {
    context: {
      name: context.name.trim(),
      description: context.description.trim() || undefined,
      citation: context.citation.trim() || undefined,
      pmid: context.pmid.trim() || undefined,
      doi: context.doi.trim() || undefined,
      species: context.species ?? undefined,
      tissue: context.tissue ?? undefined,
      preservation: context.preservation || undefined,
      imagingMethodId: context.imagingMethodId || undefined,
      antigenRetrieval: context.antigenRetrieval || undefined,
      condition: context.condition ?? undefined,
      visibility: context.visibility,
      sharedLabIds: context.sharedLabIds,
      protocolDoi: context.protocolDoi.trim() || undefined,
      ...specimenPayload(context.specimen),
    },
    antibodies: rows.map((row) => ({
      antibodyData: row.antibodyRegistry ?? undefined,
      proteinData: row.markerProtein ?? undefined,
      markerName: row.markerName.trim(),
      rrid: row.rrid || row.antibodyRegistry?.citation || undefined,
      antibodyVendor: row.antibodyVendor || undefined,
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
      images: row.images.map((img) => ({
        url: img.url,
        caption: img.caption.trim() || undefined,
        cellTypeIds: img.cellTypeIds,
      })),
    })),
  }
}
