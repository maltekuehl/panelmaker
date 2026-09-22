export type ProteinDef = {
  id: string
  label: string
  geneSymbol: string | null
  ensemblGeneId: string | null
}

// Protein.id is the UniProt accession. It drives /marker/{id}, UniProt enrichment and HPA
// lookups, so every entry below is verified against rest.uniprotkb.
export const PROTEINS: ProteinDef[] = [
  { id: "P07766", label: "CD3 epsilon", geneSymbol: "CD3E", ensemblGeneId: "ENSG00000198851" },
  { id: "P01730", label: "CD4", geneSymbol: "CD4", ensemblGeneId: "ENSG00000010610" },
  { id: "P01732", label: "CD8 alpha", geneSymbol: "CD8A", ensemblGeneId: "ENSG00000153563" },
  { id: "P11836", label: "CD20", geneSymbol: "MS4A1", ensemblGeneId: "ENSG00000156738" },
  { id: "P08575", label: "CD45", geneSymbol: "PTPRC", ensemblGeneId: "ENSG00000081237" },
  { id: "P34810", label: "CD68", geneSymbol: "CD68", ensemblGeneId: "ENSG00000129226" },
  { id: "P15391", label: "CD19", geneSymbol: "CD19", ensemblGeneId: "ENSG00000177455" },
  { id: "Q9BZS1", label: "FoxP3", geneSymbol: "FOXP3", ensemblGeneId: "ENSG00000049768" },
  { id: "Q86VB7", label: "CD163", geneSymbol: "CD163", ensemblGeneId: "ENSG00000177575" },
  { id: "Q15116", label: "PD-1", geneSymbol: "PDCD1", ensemblGeneId: "ENSG00000188389" },
  { id: "Q9NZQ7", label: "PD-L1", geneSymbol: "CD274", ensemblGeneId: "ENSG00000120217" },
  { id: "P01903", label: "HLA-DR alpha", geneSymbol: "HLA-DRA", ensemblGeneId: "ENSG00000204287" },
  { id: "P08581", label: "MET", geneSymbol: "MET", ensemblGeneId: "ENSG00000105976" },
  { id: "P16284", label: "CD31", geneSymbol: "PECAM1", ensemblGeneId: "ENSG00000261371" },
  { id: "P35968", label: "VEGFR2", geneSymbol: "KDR", ensemblGeneId: "ENSG00000128052" },
  { id: "P46013", label: "Ki67", geneSymbol: "MKI67", ensemblGeneId: "ENSG00000148773" },
  { id: "P02533", label: "Keratin 14", geneSymbol: "KRT14", ensemblGeneId: "ENSG00000186847" },
  { id: "P12830", label: "E-Cadherin", geneSymbol: "CDH1", ensemblGeneId: "ENSG00000039068" },
  { id: "P08670", label: "Vimentin", geneSymbol: "VIM", ensemblGeneId: "ENSG00000026025" },
  { id: "P62736", label: "Alpha-SMA", geneSymbol: "ACTA2", ensemblGeneId: "ENSG00000107796" },
  { id: "PANCK", label: "Pan-Cytokeratin", geneSymbol: null, ensemblGeneId: null },
]

// Map proteinId -> GO CC id for subcellular localization (used to assign subcellularId to reports)
export const PROTEIN_SUBCELLULAR: Record<string, string> = {
  P07766: "GO:0005886", // CD3 epsilon - plasma membrane
  P01730: "GO:0005886", // CD4 - plasma membrane
  P01732: "GO:0005886", // CD8 alpha - plasma membrane
  P11836: "GO:0009986", // CD20 - cell surface
  P08575: "GO:0005886", // CD45 - plasma membrane
  P34810: "GO:0005737", // CD68 - cytoplasm (lysosomal)
  P15391: "GO:0005886", // CD19 - plasma membrane
  Q9BZS1: "GO:0005634", // FoxP3 - nucleus
  Q86VB7: "GO:0005886", // CD163 - plasma membrane
  Q15116: "GO:0005886", // PD-1 - plasma membrane
  Q9NZQ7: "GO:0005886", // PD-L1 - plasma membrane
  P01903: "GO:0005886", // HLA-DR alpha - plasma membrane
  P08581: "GO:0005886", // MET - plasma membrane
  P16284: "GO:0009986", // CD31 - cell surface
  P35968: "GO:0005886", // VEGFR2 - plasma membrane
  P46013: "GO:0005634", // Ki67 - nucleus
  P02533: "GO:0005737", // Keratin 14 - cytoplasm
  P12830: "GO:0005886", // E-Cadherin - plasma membrane
  P08670: "GO:0005737", // Vimentin - cytoplasm
  P62736: "GO:0005737", // Alpha-SMA - cytoplasm
  PANCK: "GO:0005737", // Pan-Cytokeratin - cytoplasm
}

export type CellTypeMarkerDef = { cellTypeId: string; proteinId: string; isCanonical: boolean }

export const CELL_TYPE_MARKERS: CellTypeMarkerDef[] = [
  { cellTypeId: "CL:0000084", proteinId: "P07766", isCanonical: true },
  { cellTypeId: "CL:0000084", proteinId: "P08575", isCanonical: false },
  { cellTypeId: "CL:0000624", proteinId: "P07766", isCanonical: true },
  { cellTypeId: "CL:0000624", proteinId: "P01730", isCanonical: true },
  { cellTypeId: "CL:0000625", proteinId: "P07766", isCanonical: true },
  { cellTypeId: "CL:0000625", proteinId: "P01732", isCanonical: true },
  { cellTypeId: "CL:0000815", proteinId: "Q9BZS1", isCanonical: true },
  { cellTypeId: "CL:0000815", proteinId: "P01730", isCanonical: true },
  { cellTypeId: "CL:0000815", proteinId: "P07766", isCanonical: false },
  { cellTypeId: "CL:0000236", proteinId: "P15391", isCanonical: true },
  { cellTypeId: "CL:0000236", proteinId: "P11836", isCanonical: true },
  { cellTypeId: "CL:0000235", proteinId: "P34810", isCanonical: true },
  { cellTypeId: "CL:0000235", proteinId: "Q86VB7", isCanonical: false },
  { cellTypeId: "CL:0000235", proteinId: "P01903", isCanonical: false },
  { cellTypeId: "CL:0000451", proteinId: "P01903", isCanonical: true },
  { cellTypeId: "CL:0000451", proteinId: "P34810", isCanonical: false },
  { cellTypeId: "CL:0000066", proteinId: "PANCK", isCanonical: true },
  { cellTypeId: "CL:0000066", proteinId: "P12830", isCanonical: true },
  { cellTypeId: "CL:0000066", proteinId: "P02533", isCanonical: false },
  { cellTypeId: "CL:0000057", proteinId: "P62736", isCanonical: true },
  { cellTypeId: "CL:0000057", proteinId: "P08670", isCanonical: false },
  { cellTypeId: "CL:0000115", proteinId: "P16284", isCanonical: true },
  { cellTypeId: "CL:0000576", proteinId: "P08575", isCanonical: true },
  { cellTypeId: "CL:0000576", proteinId: "P34810", isCanonical: false },
  { cellTypeId: "CL:0000623", proteinId: "P08575", isCanonical: true },
]
