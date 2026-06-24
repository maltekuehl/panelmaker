export { FIXATION_LABELS } from "@/lib/constants"

export interface PanelMarker {
  id: string
  cycleId: string
  proteinId: string | null
  antibodyId: string | null
  fluorophoreId: string | null
  metalTag: string | null
  sortOrder: number
  fluorophore: {
    id: string
    name: string
    excitation: number
    emission: number
  } | null
  protein: {
    id: string
    label: string
    geneSymbol: string | null
  } | null
  antibody: {
    id: string
    rrid: string | null
    name: string
    conjugate: string | null
    hostTaxon: { id: string; label: string } | null
    vendorName: string | null
    catalogNumber: string | null
    cloneId: string | null
  } | null
}

export interface PanelCycle {
  id: string
  panelId: string
  name: string
  notes: string | null
  sortOrder: number
  markers: PanelMarker[]
}

export interface Panel {
  id: string
  name: string
  description: string | null
  species: { id: string; label: string } | null
  fixation: string | null
  condition: { id: string; label: string } | null
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
