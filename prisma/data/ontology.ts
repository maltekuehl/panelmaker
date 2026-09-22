export type OntologyTermDef = { id: string; label: string; partOfIds: string[] }

export const CELL_TYPES: { id: string; label: string; parentIds: string[] }[] = [
  { id: "CL:0000084", label: "T cell", parentIds: ["CL:0000542"] },
  { id: "CL:0000624", label: "CD4-positive T cell", parentIds: ["CL:0000084"] },
  { id: "CL:0000625", label: "CD8-positive T cell", parentIds: ["CL:0000084"] },
  { id: "CL:0000815", label: "Regulatory T cell", parentIds: ["CL:0000624"] },
  { id: "CL:0000236", label: "B cell", parentIds: ["CL:0000542"] },
  { id: "CL:0000235", label: "Macrophage", parentIds: ["CL:0000145"] },
  { id: "CL:0000988", label: "Hematopoietic cell", parentIds: [] },
  { id: "CL:0000451", label: "Dendritic cell", parentIds: ["CL:0000145"] },
  { id: "CL:0000066", label: "Epithelial cell", parentIds: [] },
  { id: "CL:0000499", label: "Stromal cell", parentIds: [] },
  { id: "CL:0000057", label: "Fibroblast", parentIds: ["CL:0000499"] },
  { id: "CL:0000115", label: "Endothelial cell", parentIds: [] },
  { id: "CL:0000576", label: "Monocyte", parentIds: ["CL:0000145"] },
  { id: "CL:0000097", label: "Mast cell", parentIds: ["CL:0000145"] },
  { id: "CL:0000623", label: "Natural killer cell", parentIds: ["CL:0000542"] },
]

// UBERON tissues (replaces old AnatomicalStructure seeding)
export const TISSUES: OntologyTermDef[] = [
  { id: "UBERON:0002370", label: "Thymus", partOfIds: ["UBERON:0002193"] },
  { id: "UBERON:0002106", label: "Spleen", partOfIds: ["UBERON:0002193"] },
  { id: "UBERON:0000160", label: "Intestine", partOfIds: ["UBERON:0001009"] },
  { id: "UBERON:0002048", label: "Lung", partOfIds: ["UBERON:0001009"] },
  { id: "UBERON:0002107", label: "Liver", partOfIds: ["UBERON:0001009"] },
  { id: "UBERON:0002113", label: "Kidney", partOfIds: ["UBERON:0001008"] },
  { id: "UBERON:0000029", label: "Lymph Node", partOfIds: ["UBERON:0002193"] },
  { id: "UBERON:0002372", label: "Tonsil", partOfIds: ["UBERON:0002193"] },
  { id: "UBERON:0000310", label: "Breast", partOfIds: ["UBERON:0001009"] },
  { id: "UBERON:0001264", label: "Pancreas", partOfIds: ["UBERON:0001009"] },
]

// GO Cellular Component terms for subcellular localization
export const CELLULAR_COMPONENTS: OntologyTermDef[] = [
  { id: "GO:0005634", label: "nucleus", partOfIds: ["GO:0005623"] },
  { id: "GO:0005886", label: "plasma membrane", partOfIds: ["GO:0071944"] },
  { id: "GO:0005737", label: "cytoplasm", partOfIds: ["GO:0005623"] },
  { id: "GO:0005829", label: "cytosol", partOfIds: ["GO:0005737"] },
  { id: "GO:0005739", label: "mitochondrion", partOfIds: ["GO:0005737"] },
  { id: "GO:0005730", label: "nucleolus", partOfIds: ["GO:0005634"] },
  { id: "GO:0009986", label: "cell surface", partOfIds: ["GO:0005886"] },
  { id: "GO:0031012", label: "extracellular matrix", partOfIds: ["GO:0005576"] },
  { id: "GO:0005604", label: "basement membrane", partOfIds: ["GO:0031012"] },
  { id: "GO:0005576", label: "extracellular region", partOfIds: [] },
]

// Maps tissueType string to a seeded UBERON Tissue id.
// Reports that had a structureId already had the canonical UBERON id; those without
// need to be looked up from the free-text tissueType string.
export const TISSUE_TYPE_TO_UBERON: Record<string, string> = {
  "Spleen": "UBERON:0002106",
  "Thymus": "UBERON:0002370",
  "Colon": "UBERON:0000160",
  "Colon tumor": "UBERON:0000160",
  "Intestine": "UBERON:0000160",
  "Lung": "UBERON:0002048",
  "Lung tumor": "UBERON:0002048",
  "Liver": "UBERON:0002107",
  "Kidney": "UBERON:0002113",
  "Lymph node": "UBERON:0000029",
  "Breast tumor": "UBERON:0000310",
  "Breast": "UBERON:0000310",
  "Tonsil": "UBERON:0002372",
  "Pancreas": "UBERON:0001264",
}

export const DISEASE_CONDITIONS: { id: string; label: string }[] = [
  { id: "DOID:162", label: "cancer" },
  { id: "DOID:1612", label: "breast cancer" },
  { id: "DOID:0050861", label: "colorectal cancer" },
  { id: "DOID:1324", label: "lung cancer" },
  { id: "DOID:8923", label: "skin melanoma" },
  { id: "DOID:363", label: "uterine cancer" },
  { id: "DOID:10283", label: "prostate cancer" },
  { id: "DOID:3571", label: "liver cancer" },
  { id: "DOID:1793", label: "pancreatic cancer" },
  { id: "DOID:3068", label: "glioblastoma" },
  { id: "DOID:0080600", label: "COVID-19" },
  { id: "DOID:9352", label: "type 2 diabetes mellitus" },
  { id: "DOID:10763", label: "hypertension" },
  { id: "DOID:2377", label: "multiple sclerosis" },
  { id: "DOID:7148", label: "rheumatoid arthritis" },
  { id: "DOID:9008", label: "ulcerative colitis" },
  { id: "DOID:8778", label: "Crohn disease" },
  { id: "DOID:10652", label: "Alzheimer disease" },
  { id: "DOID:2914", label: "immune system disease" },
  { id: "DOID:417", label: "autoimmune disease" },
]

// ChEBI terms for fixative chemistry. Every id was resolved on OLS4 (`/api/ontologies/chebi/terms`)
// and is a current, non-obsolete term.
export const FIXATIVES: { id: string; label: string }[] = [
  { id: "CHEBI:16842", label: "formaldehyde" },
  { id: "CHEBI:752978", label: "paraformaldehyde" },
  { id: "CHEBI:17790", label: "methanol" },
  { id: "CHEBI:15347", label: "acetone" },
  { id: "CHEBI:64276", label: "glutaraldehyde" },
]

// HsapDv for human donors and MmusDv for mouse. HsapDv:0000087 is obsolete and was replaced by
// HsapDv:0000258, which is what is seeded here.
export const DEVELOPMENTAL_STAGES: { id: string; label: string }[] = [
  { id: "HsapDv:0000258", label: "adult stage" },
  { id: "HsapDv:0000266", label: "young adult stage" },
  { id: "HsapDv:0000227", label: "late adult stage" },
  { id: "HsapDv:0000261", label: "infant stage" },
  { id: "MmusDv:0000136", label: "prime adult stage" },
  { id: "MmusDv:0000153", label: "young adult stage" },
  { id: "MmusDv:0000134", label: "late adult stage" },
]
