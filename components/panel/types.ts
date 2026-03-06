import type { Fixation, Species } from "@prisma/client"
export { FIXATION_LABELS, SPECIES_LABELS } from "@/lib/constants"
export type { Fixation, Species } from "@prisma/client"

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
