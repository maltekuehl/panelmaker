import { MarkerEntry } from "@/components/browse/columns"

export interface CellTypeDetails {
  id: string
  name: string
  ontologyId: string // CL:0000000
  description: string
  synonyms: string[]
  markers: string[] // IDs of markers
  images: string[]
}

export interface MarkerUsage {
  id: string
  species: string
  tissue: string
  method: string
  clone: string
  dilution: string
  antigenRetrieval: string
  subcellularLocation: string
  validationCategory: number
  submitter: string
  images: string[]
  antibodyId: string
  antibodyVendor: string
  hostSpecies: string
  condition: string
}

export interface MarkerDetails extends MarkerEntry {
  geneId: string // ENSG...
  proteinName: string
  uniprotId: string
  description: string
  subcellularLocation: string // General location
  relatedCellTypes: string[] // IDs of cell types
  images: string[]
  cellTypeId: string // Added this
  usages: MarkerUsage[]
}

export const mockCellTypes: CellTypeDetails[] = [
  {
    id: "t-cells",
    name: "T cells",
    ontologyId: "CL:0000084",
    description:
      "A type of lymphocyte that plays a central role in cell-mediated immunity. T cells can be distinguished from other lymphocytes, such as B cells and natural killer cells, by the presence of a T-cell receptor on the cell surface.",
    synonyms: ["T lymphocyte", "T-cell"],
    markers: ["1", "5"], // CD3e, FoxP3
    images: ["/assets/placeholder-1.jpg", "/assets/placeholder-2.jpg"],
  },
  {
    id: "b-cells",
    name: "B cells",
    ontologyId: "CL:0000236",
    description:
      "A type of white blood cell of the lymphocyte subtype. They function in the humoral immunity component of the adaptive immune system by secreting antibodies.",
    synonyms: ["B lymphocyte", "B-cell"],
    markers: ["2"], // CD19
    images: ["/assets/placeholder-3.jpg"],
  },
  {
    id: "macrophages",
    name: "Macrophages",
    ontologyId: "CL:0000235",
    description:
      "A type of white blood cell of the immune system that engulfs and digests cellular debris, foreign substances, microbes, cancer cells, and anything else that does not have the type of protein specific to healthy body cells on its surface.",
    synonyms: ["Histiocyte"],
    markers: ["3", "4"], // CD68, CD163
    images: ["/assets/placeholder-4.jpg"],
  },
  {
    id: "epithelial-cells",
    name: "Epithelial cells",
    ontologyId: "CL:0000066",
    description:
      "Cells that line the surfaces of your body. They are found on your skin, blood vessels, urinary tract, and organs.",
    synonyms: ["Epithelium"],
    markers: ["6"], // PanCK
    images: ["/assets/placeholder-5.jpg"],
  },
]

export const mockMarkers: MarkerDetails[] = [
  {
    id: "1",
    marker: "CD3e",
    cellType: "T cells",
    cellTypeId: "t-cells",
    species: "Homo sapiens",
    tissue: "FFPE",
    validatedMethods: ["IF", "CODEX"],
    validationCategory: 4,
    geneId: "ENSG00000198851",
    proteinName: "T-cell surface glycoprotein CD3 epsilon chain",
    uniprotId: "P07766",
    description:
      "Part of the TCR-CD3 complex present on T-lymphocyte cell surface that plays an essential role in adaptive immune response.",
    subcellularLocation: "Membrane",
    relatedCellTypes: ["t-cells"],
    images: ["/assets/marker-cd3.jpg"],
    usages: [
      {
        id: "u1",
        species: "Homo sapiens",
        tissue: "FFPE",
        method: "IF",
        clone: "SP7",
        dilution: "1:100",
        antigenRetrieval: "Citrate pH 6.0",
        subcellularLocation: "Membrane",
        validationCategory: 4,
        submitter: "Lab A",
        images: [],
        antibodyId: "RRID:AB_443425",
        antibodyVendor: "Abcam",
        hostSpecies: "Rabbit",
        condition: "Normal Tonsil",
      },
      {
        id: "u2",
        species: "Homo sapiens",
        tissue: "FFPE",
        method: "CODEX",
        clone: "UCHT1",
        dilution: "1:200",
        antigenRetrieval: "Tris-EDTA pH 9.0",
        subcellularLocation: "Membrane",
        validationCategory: 4,
        submitter: "Lab B",
        images: [],
        antibodyId: "RRID:AB_314056",
        antibodyVendor: "BioLegend",
        hostSpecies: "Mouse",
        condition: "Normal Tonsil",
      },
    ],
  },
  {
    id: "2",
    marker: "CD19",
    cellType: "B cells",
    cellTypeId: "b-cells",
    species: "Homo sapiens",
    tissue: "FFPE",
    validatedMethods: ["IF", "PathoPlex"],
    validationCategory: 4,
    geneId: "ENSG00000177455",
    proteinName: "B-lymphocyte antigen CD19",
    uniprotId: "P15391",
    description: "Functions as coreceptor for the B-cell antigen receptor complex (BCR) on B-lymphocytes.",
    subcellularLocation: "Membrane",
    relatedCellTypes: ["b-cells"],
    images: ["/assets/marker-cd19.jpg"],
    usages: [
      {
        id: "u3",
        species: "Homo sapiens",
        tissue: "FFPE",
        method: "IF",
        clone: "BT51E",
        dilution: "1:50",
        antigenRetrieval: "Tris-EDTA pH 9.0",
        subcellularLocation: "Membrane",
        validationCategory: 4,
        submitter: "Lab C",
        images: [],
        antibodyId: "RRID:AB_563543",
        antibodyVendor: "Leica",
        hostSpecies: "Mouse",
        condition: "Normal Tonsil",
      },
    ],
  },
  {
    id: "3",
    marker: "CD68",
    cellType: "Macrophages",
    cellTypeId: "macrophages",
    species: "Mus musculus",
    tissue: "FF",
    validatedMethods: ["IF"],
    validationCategory: 3,
    geneId: "ENSMUSG00000018680",
    proteinName: "Macrosialin",
    uniprotId: "P31996",
    description: "A transmembrane glycoprotein that is highly expressed by human monocytes and tissue macrophages.",
    subcellularLocation: "Membrane, Lysosome",
    relatedCellTypes: ["macrophages"],
    images: ["/assets/marker-cd68.jpg"],
    usages: [],
  },
  {
    id: "4",
    marker: "CD163",
    cellType: "Macrophages (M2)",
    cellTypeId: "macrophages",
    species: "Homo sapiens",
    tissue: "FFPE",
    validatedMethods: ["IF", "CODEX", "MIBI-Tof"],
    validationCategory: 4,
    geneId: "ENSG00000177575",
    proteinName: "Scavenger receptor cysteine-rich type 1 protein M130",
    uniprotId: "Q86VB7",
    description:
      "Acute phase-regulated receptor involved in clearance and endocytosis of hemoglobin/haptoglobin complexes by macrophages.",
    subcellularLocation: "Membrane",
    relatedCellTypes: ["macrophages"],
    images: ["/assets/marker-cd163.jpg"],
    usages: [],
  },
  {
    id: "5",
    marker: "FoxP3",
    cellType: "T regs",
    cellTypeId: "t-cells",
    species: "Homo sapiens",
    tissue: "FFPE",
    validatedMethods: ["IF"],
    validationCategory: 2,
    geneId: "ENSG00000049768",
    proteinName: "Forkhead box protein P3",
    uniprotId: "Q9BZS1",
    description:
      "Transcriptional regulator which is crucial for the development and inhibitory function of regulatory T-cells (Treg).",
    subcellularLocation: "Nucleus",
    relatedCellTypes: ["t-cells"],
    images: ["/assets/marker-foxp3.jpg"],
    usages: [],
  },
  {
    id: "6",
    marker: "PanCK",
    cellType: "Epithelial cells",
    cellTypeId: "epithelial-cells",
    species: "Homo sapiens",
    tissue: "FFPE",
    validatedMethods: ["IF", "PathoPlex", "CODEX"],
    validationCategory: 4,
    geneId: "N/A",
    proteinName: "Pan-Cytokeratin",
    uniprotId: "N/A",
    description: "Broad spectrum cytokeratin marker used to identify epithelial cells.",
    subcellularLocation: "Cytoplasm",
    relatedCellTypes: ["epithelial-cells"],
    images: ["/assets/marker-panck.jpg"],
    usages: [],
  },
]

export async function getCellType(id: string) {
  return mockCellTypes.find((ct) => ct.id === id)
}

export async function getMarker(id: string) {
  return mockMarkers.find((m) => m.id === id)
}

export async function getMarkersForCellType(cellTypeId: string) {
  const cellType = mockCellTypes.find((ct) => ct.id === cellTypeId)
  if (!cellType) return []
  return mockMarkers.filter((m) => cellType.markers.includes(m.id))
}

export async function getCellTypesForMarker(markerId: string) {
  const marker = mockMarkers.find((m) => m.id === markerId)
  if (!marker) return []
  return mockCellTypes.filter((ct) => marker.relatedCellTypes.includes(ct.id))
}

export async function getUsagesForAntibody(antibodyId: string): Promise<MarkerUsage[]> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 100))

  const allUsages: MarkerUsage[] = []
  mockMarkers.forEach((marker) => {
    if (marker.usages) {
      marker.usages.forEach((usage) => {
        if (usage.antibodyId === antibodyId) {
          // Add marker info to usage for context if needed, though usage has species/tissue
          // We might want to know WHICH marker this usage belongs to
          allUsages.push({ ...usage, markerName: marker.marker } as any)
        }
      })
    }
  })
  return allUsages
}
