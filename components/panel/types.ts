export interface PanelMarker {
  id: string
  gene: string
  antibody: string
  cellType: string
  fluorophore: string
  host: string
  color: string // tailwind class for background color e.g. "bg-green-500"
}

export interface PanelCycle {
  id: string
  name: string
  markers: PanelMarker[]
}

export interface Panel {
  id: string
  name: string
  description: string
  species: string
  type: string // e.g. FFPE
  condition: string // tissue/organ/disease
  cycles: PanelCycle[]
}
