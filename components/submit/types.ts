import type { AntibodyRegistryValue } from "@/components/antibody-registry-combobox"
import type { FluorophoreOption } from "@/components/fluorophore-combobox"
import { DONOR_SEX_LABELS, PRESERVATION_LABELS, SAMPLE_TYPE_LABELS } from "@/lib/constants"
import { AntigenRetrieval, DonorSex, Preservation, SampleType, type Visibility } from "@/lib/generated/prisma/enums"
import { parseTaxonUid } from "@/models/taxon/id"

import type { OntologyValue } from "@/components/ontology-combobox"

export type { OntologyValue }
export type ProteinValue = { id: string; label: string; geneSymbol?: string | null }
export type ReferenceRole = "NUCLEAR" | "STRUCTURAL"

export type FovReference = {
  key: string
  role: ReferenceRole | ""
  label: string
  fluorophore: FluorophoreOption | null
  displayColor: string
}

// One field of view of the run. Rows reference it by url, so an image showing several markers is held
// once and appears under every antibody that ticks it.
export type Fov = { url: string; caption: string; references: FovReference[] }

// This antibody's channel in a field of view: its own colour and the cell types it shows there.
export type RowImage = { url: string; displayColor: string; cellTypeIds: string[] }

// What the image dialog edits before it is saved: the field of view, this antibody's channel in it, and
// the other antibodies of the run that are visible in it too.
export type FovDraft = {
  url: string
  caption: string
  references: FovReference[]
  displayColor: string
  cellTypes: OntologyValue[]
  sharedWith: string[]
}

export type ExperimentContext = {
  name: string
  description: string
  citation: string
  pmid: string
  doi: string
  species: OntologyValue | null
  tissue: OntologyValue | null
  preservation: string
  imagingMethod: OntologyValue | null
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
  images: RowImage[]
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
    imagingMethod: null,
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

let referenceCounter = 0

export function emptyReference(): FovReference {
  referenceCounter += 1
  return { key: `ref-${referenceCounter}`, role: "", label: "", fluorophore: null, displayColor: "" }
}

export function pruneFovs(fovs: Fov[], rows: AntibodyRow[]): Fov[] {
  const used = new Set(rows.flatMap((r) => r.images.map((im) => im.url)))
  return fovs.filter((f) => used.has(f.url))
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

export function isReferenceIncomplete(reference: FovReference): boolean {
  return !reference.role || !reference.label.trim()
}

export function validateRows(rows: AntibodyRow[], fovs: Fov[]): RowValidationError[] {
  const errors: RowValidationError[] = []
  const incompleteFovs = new Set(fovs.filter((f) => f.references.some(isReferenceIncomplete)).map((f) => f.url))
  for (const row of rows) {
    if (!row.markerName.trim()) errors.push({ key: row.key, field: "markerName", message: "Marker name is required" })
    if (row.images.length === 0) errors.push({ key: row.key, field: "images", message: "Add at least one image" })
    else if (row.images.some((im) => incompleteFovs.has(im.url)))
      errors.push({ key: row.key, field: "images", message: "Give every counterstain a role and a name" })
  }
  return errors
}

function displayColorPayload(color: string): string | undefined {
  return color.startsWith("#") ? color : undefined
}

function referencePayload(reference: FovReference) {
  return {
    role: reference.role as ReferenceRole,
    label: reference.label.trim(),
    fluorophoreId: reference.fluorophore?.id || undefined,
    displayColor: displayColorPayload(reference.displayColor),
  }
}

export function buildBatchPayload(context: ExperimentContext, rows: AntibodyRow[], fovs: Fov[]) {
  const fovByUrl = new Map(fovs.map((f) => [f.url, f]))
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
      imagingMethod: context.imagingMethod ?? undefined,
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
      images: row.images.map((img) => {
        const fov = fovByUrl.get(img.url)
        const cellTypeIds = new Set(row.cellTypes.map((c) => c.id))
        return {
          url: img.url,
          caption: fov?.caption.trim() || undefined,
          cellTypeIds: img.cellTypeIds.filter((id) => cellTypeIds.has(id)),
          displayColor: displayColorPayload(img.displayColor),
          references: fov?.references.length ? fov.references.map(referencePayload) : undefined,
        }
      }),
    })),
  }
}
