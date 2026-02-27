export type Species = "HUMAN" | "MOUSE" | "RAT" | "NON_HUMAN_PRIMATE" | "PIG" | "RABBIT" | "ZEBRAFISH" | "OTHER"

export type Fixation = "FFPE" | "FRESH_FROZEN" | "PFA" | "ACETONE" | "METHANOL" | "OTHER"

export const SPECIES_LABELS: Record<Species, string> = {
  HUMAN: "Homo sapiens",
  MOUSE: "Mus musculus",
  RAT: "Rattus norvegicus",
  NON_HUMAN_PRIMATE: "Non-human primate",
  PIG: "Sus scrofa",
  RABBIT: "Oryctolagus cuniculus",
  ZEBRAFISH: "Danio rerio",
  OTHER: "Other",
}

export const SPECIES_ORGANISM_IDS: Record<Species, number | null> = {
  HUMAN: 9606,
  MOUSE: 10090,
  RAT: 10116,
  NON_HUMAN_PRIMATE: null,
  PIG: 9823,
  RABBIT: 9986,
  ZEBRAFISH: 7955,
  OTHER: null,
}

export const FIXATION_LABELS: Record<Fixation, string> = {
  FFPE: "FFPE",
  FRESH_FROZEN: "Fresh Frozen",
  PFA: "PFA",
  ACETONE: "Acetone",
  METHANOL: "Methanol",
  OTHER: "Other",
}

export interface PanelMarker {
  id: number
  cycleId: number
  proteinId: string | null
  antibodyId: number | null
  fluorophore: string | null
  metalTag: string | null
  sortOrder: number
  protein: {
    id: string
    label: string
    geneSymbol: string | null
  } | null
  antibody: {
    id: number
    rrid: string | null
    name: string
    conjugate: string | null
    sourceOrganism: string | null
    vendorName: string | null
    catalogNumber: string | null
    cloneId: string | null
  } | null
}

export interface PanelCycle {
  id: number
  panelId: number
  name: string
  notes: string | null
  sortOrder: number
  markers: PanelMarker[]
}

export interface Panel {
  id: number
  name: string
  description: string | null
  species: Species | null
  fixation: Fixation | null
  condition: string | null
  ownerId: string
  isPublic: boolean
  createdAt: string
  updatedAt: string
  owner: {
    id: string
    name: string | null
  } | null
  cycles: PanelCycle[]
}
