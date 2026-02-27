import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const PLACEHOLDER_IMAGES = [
  "https://placehold.co/800x600/1a1a2e/e0e0e0?text=IF+CD3+FITC",
  "https://placehold.co/800x600/16213e/e0e0e0?text=CODEX+Cycle1",
  "https://placehold.co/800x600/0f3460/e0e0e0?text=IMC+Panel",
  "https://placehold.co/800x600/1a1a2e/e0e0e0?text=CyCIF+Overlay",
  "https://placehold.co/800x600/533483/e0e0e0?text=MIBI+Kidney",
  "https://placehold.co/800x600/2b2d42/e0e0e0?text=IHC+DAB",
  "https://placehold.co/800x600/0b0c10/00ff88?text=IF+AF488",
  "https://placehold.co/800x600/0b0c10/ff4444?text=IF+AF647",
  "https://placehold.co/800x600/0b0c10/ffcc00?text=CODEX+Merge",
  "https://placehold.co/800x600/1a1a2e/66ccff?text=IMC+142Nd",
]

function getReportImages(index: number): string {
  const count = (index % 3) + 1
  const start = index % PLACEHOLDER_IMAGES.length
  const images: string[] = []
  for (let i = 0; i < count; i++) {
    images.push(PLACEHOLDER_IMAGES[(start + i) % PLACEHOLDER_IMAGES.length])
  }
  return JSON.stringify(images)
}

// Stable user IDs so reports can reference them reliably across re-runs
const USERS = [
  {
    id: "seed_user_nolan_garry",
    name: "Garry Nolan",
    email: "gnolan@stanford.edu",
    institution: "Stanford Nolan Lab",
  },
  {
    id: "seed_user_angelo_mike",
    name: "Michael Angelo",
    email: "mangelo@stanford.edu",
    institution: "Stanford University",
  },
  {
    id: "seed_user_lin_jia",
    name: "Jia-Ren Lin",
    email: "jrlin@hms.harvard.edu",
    institution: "Harvard Tissue Atlas (Sorger Lab)",
  },
  {
    id: "seed_user_goltsev_yury",
    name: "Yury Goltsev",
    email: "ygoltsev@stanford.edu",
    institution: "Stanford Nolan Lab",
  },
  {
    id: "seed_user_krummel_matt",
    name: "Matthew Krummel",
    email: "mkrummel@ucsf.edu",
    institution: "UCSF Krummel Lab",
  },
  {
    id: "seed_user_broad_user1",
    name: "Asaf Rotem",
    email: "arotem@broadinstitute.org",
    institution: "Broad Institute",
  },
  {
    id: "seed_user_hta_user1",
    name: "Sandro Santagata",
    email: "ssantagata@hms.harvard.edu",
    institution: "Harvard Tissue Atlas",
  },
  {
    id: "seed_user_weill_user1",
    name: "Diane Mathis",
    email: "dmathis@hms.harvard.edu",
    institution: "Weill Institute / HMS",
  },
  {
    id: "seed_user_yale_user1",
    name: "David Hafler",
    email: "david.hafler@yale.edu",
    institution: "Yale School of Medicine",
  },
  {
    id: "seed_user_msk_user1",
    name: "Dana Pe'er",
    email: "peerdana@mskcc.org",
    institution: "Memorial Sloan Kettering",
  },
  {
    id: "seed_user_puelles_victor",
    name: "Victor Puelles",
    email: "vpuelles@ukaachen.de",
    institution: "Complex Tissue Lab, RWTH Aachen",
  },
]

const PROTEINS = [
  { id: "P07766", label: "CD3 epsilon", geneSymbol: "CD3E", ensemblGeneId: "ENSG00000198851" },
  { id: "P06139", label: "CD4", geneSymbol: "CD4", ensemblGeneId: "ENSG00000010610" },
  { id: "P01732", label: "CD8 alpha", geneSymbol: "CD8A", ensemblGeneId: "ENSG00000153563" },
  { id: "P11836", label: "CD20", geneSymbol: "MS4A1", ensemblGeneId: "ENSG00000156738" },
  { id: "P06729", label: "CD45", geneSymbol: "PTPRC", ensemblGeneId: "ENSG00000081237" },
  { id: "P31996", label: "CD68", geneSymbol: "CD68", ensemblGeneId: "ENSG00000129226" },
  { id: "P15391", label: "CD19", geneSymbol: "CD19", ensemblGeneId: "ENSG00000177455" },
  { id: "Q9BZS1", label: "FoxP3", geneSymbol: "FOXP3", ensemblGeneId: "ENSG00000049768" },
  { id: "Q86VB7", label: "CD163", geneSymbol: "CD163", ensemblGeneId: "ENSG00000177575" },
  { id: "P46531", label: "PD-1", geneSymbol: "PDCD1", ensemblGeneId: "ENSG00000188389" },
  { id: "Q9NZQ7", label: "PD-L1", geneSymbol: "CD274", ensemblGeneId: "ENSG00000120217" },
  { id: "P04233", label: "HLA-DR alpha", geneSymbol: "HLA-DRA", ensemblGeneId: "ENSG00000204287" },
  { id: "P08581", label: "MET", geneSymbol: "MET", ensemblGeneId: "ENSG00000105976" },
  { id: "P16284", label: "CD31", geneSymbol: "PECAM1", ensemblGeneId: "ENSG00000261371" },
  { id: "P35968", label: "VEGFR2", geneSymbol: "KDR", ensemblGeneId: "ENSG00000128052" },
  { id: "P49917", label: "Ki67", geneSymbol: "MKI67", ensemblGeneId: "ENSG00000148773" },
  { id: "P02533", label: "Keratin 14", geneSymbol: "KRT14", ensemblGeneId: "ENSG00000186081" },
  { id: "P05067", label: "E-Cadherin", geneSymbol: "CDH1", ensemblGeneId: "ENSG00000039068" },
  { id: "P08670", label: "Vimentin", geneSymbol: "VIM", ensemblGeneId: "ENSG00000026025" },
  { id: "P62736", label: "Alpha-SMA", geneSymbol: "ACTA2", ensemblGeneId: "ENSG00000107796" },
  { id: "PANCK", label: "Pan-Cytokeratin", geneSymbol: null, ensemblGeneId: null },
]

const CELL_TYPES = [
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

const STRUCTURES = [
  { id: "UBERON:0002370", label: "Thymus", partOfIds: ["UBERON:0000178"] },
  { id: "UBERON:0002106", label: "Spleen", partOfIds: ["UBERON:0000178"] },
  { id: "UBERON:0000160", label: "Intestine", partOfIds: ["UBERON:0001009"] },
  { id: "UBERON:0002048", label: "Lung", partOfIds: ["UBERON:0001009"] },
  { id: "UBERON:0002107", label: "Liver", partOfIds: ["UBERON:0001009"] },
  { id: "UBERON:0002113", label: "Kidney", partOfIds: ["UBERON:0001008"] },
  { id: "UBERON:0000082", label: "Lymph Node", partOfIds: ["UBERON:0000178"] },
  { id: "UBERON:0001723", label: "Tonsil", partOfIds: ["UBERON:0000178"] },
]

// [rrid, name, catalogNumber, cloneId, clonality, sourceOrganism, targetSpecies, targetProteinId, targetName, applications, vendorName, vendorUrl, citationCount]
type AntibodyDef = {
  rrid: string
  name: string
  catalogNumber: string
  cloneId: string | null
  clonality: "MONOCLONAL" | "POLYCLONAL" | "RECOMBINANT"
  sourceOrganism: "MOUSE" | "RABBIT" | "RAT" | "GOAT" | "HAMSTER" | "CAMELID"
  targetSpecies: string[]
  targetProteinId: string
  targetName: string
  applications: string[]
  vendorName: string
  vendorUrl: string
  citationCount: number
  conjugate?: string
}

const ANTIBODIES: AntibodyDef[] = [
  {
    rrid: "RRID:AB_314056",
    name: "Anti-CD3 epsilon (UCHT1)",
    catalogNumber: "300402",
    cloneId: "UCHT1",
    clonality: "MONOCLONAL",
    sourceOrganism: "MOUSE",
    targetSpecies: ["Homo sapiens"],
    targetProteinId: "P07766",
    targetName: "CD3 epsilon",
    applications: ["IF", "CODEX", "FC"],
    vendorName: "BioLegend",
    vendorUrl: "https://www.biolegend.com",
    citationCount: 512,
    conjugate: "FITC",
  },
  {
    rrid: "RRID:AB_443425",
    name: "Anti-CD3 epsilon (SP7)",
    catalogNumber: "ab16669",
    cloneId: "SP7",
    clonality: "MONOCLONAL",
    sourceOrganism: "RABBIT",
    targetSpecies: ["Homo sapiens"],
    targetProteinId: "P07766",
    targetName: "CD3 epsilon",
    applications: ["IF", "IHC"],
    vendorName: "Abcam",
    vendorUrl: "https://www.abcam.com",
    citationCount: 245,
  },
  {
    rrid: "RRID:AB_395943",
    name: "Anti-CD4 (RPA-T4)",
    catalogNumber: "300502",
    cloneId: "RPA-T4",
    clonality: "MONOCLONAL",
    sourceOrganism: "MOUSE",
    targetSpecies: ["Homo sapiens"],
    targetProteinId: "P06139",
    targetName: "CD4",
    applications: ["IF", "CODEX", "FC"],
    vendorName: "BioLegend",
    vendorUrl: "https://www.biolegend.com",
    citationCount: 389,
    conjugate: "PE",
  },
  {
    rrid: "RRID:AB_10643421",
    name: "Anti-CD4 (EPR6855)",
    catalogNumber: "ab133616",
    cloneId: "EPR6855",
    clonality: "RECOMBINANT",
    sourceOrganism: "RABBIT",
    targetSpecies: ["Homo sapiens"],
    targetProteinId: "P06139",
    targetName: "CD4",
    applications: ["IF", "IHC", "CYCIF"],
    vendorName: "Abcam",
    vendorUrl: "https://www.abcam.com",
    citationCount: 178,
  },
  {
    rrid: "RRID:AB_314126",
    name: "Anti-CD8 alpha (RPA-T8)",
    catalogNumber: "301002",
    cloneId: "RPA-T8",
    clonality: "MONOCLONAL",
    sourceOrganism: "MOUSE",
    targetSpecies: ["Homo sapiens"],
    targetProteinId: "P01732",
    targetName: "CD8 alpha",
    applications: ["IF", "CODEX", "FC"],
    vendorName: "BioLegend",
    vendorUrl: "https://www.biolegend.com",
    citationCount: 421,
    conjugate: "AF647",
  },
  {
    rrid: "RRID:AB_443426",
    name: "Anti-CD8 alpha (4B11)",
    catalogNumber: "ab17147",
    cloneId: "4B11",
    clonality: "MONOCLONAL",
    sourceOrganism: "MOUSE",
    targetSpecies: ["Homo sapiens"],
    targetProteinId: "P01732",
    targetName: "CD8 alpha",
    applications: ["IF", "IHC"],
    vendorName: "Abcam",
    vendorUrl: "https://www.abcam.com",
    citationCount: 134,
  },
  {
    rrid: "RRID:AB_563543",
    name: "Anti-CD19 (BT51E)",
    catalogNumber: "NCL-L-CD19-163",
    cloneId: "BT51E",
    clonality: "MONOCLONAL",
    sourceOrganism: "MOUSE",
    targetSpecies: ["Homo sapiens"],
    targetProteinId: "P15391",
    targetName: "CD19",
    applications: ["IF", "IHC"],
    vendorName: "Leica",
    vendorUrl: "https://www.leicabiosystems.com",
    citationCount: 87,
  },
  {
    rrid: "RRID:AB_2074649",
    name: "Anti-CD20 (EP459Y)",
    catalogNumber: "ab78237",
    cloneId: "EP459Y",
    clonality: "MONOCLONAL",
    sourceOrganism: "RABBIT",
    targetSpecies: ["Homo sapiens"],
    targetProteinId: "P11836",
    targetName: "CD20",
    applications: ["IF", "IHC", "CYCIF"],
    vendorName: "Abcam",
    vendorUrl: "https://www.abcam.com",
    citationCount: 203,
  },
  {
    rrid: "RRID:AB_2892867",
    name: "Anti-CD45 (2B11+PD7/26)",
    catalogNumber: "ab10558",
    cloneId: "2B11+PD7/26",
    clonality: "MONOCLONAL",
    sourceOrganism: "MOUSE",
    targetSpecies: ["Homo sapiens"],
    targetProteinId: "P06729",
    targetName: "CD45",
    applications: ["IF", "IHC", "CODEX"],
    vendorName: "Abcam",
    vendorUrl: "https://www.abcam.com",
    citationCount: 318,
  },
  {
    rrid: "RRID:AB_2074650",
    name: "Anti-CD45 (HI30)",
    catalogNumber: "304002",
    cloneId: "HI30",
    clonality: "MONOCLONAL",
    sourceOrganism: "MOUSE",
    targetSpecies: ["Homo sapiens"],
    targetProteinId: "P06729",
    targetName: "CD45",
    applications: ["IF", "FC", "CODEX"],
    vendorName: "BioLegend",
    vendorUrl: "https://www.biolegend.com",
    citationCount: 456,
    conjugate: "APC",
  },
  {
    rrid: "RRID:AB_927185",
    name: "Anti-CD68 (KP1)",
    catalogNumber: "M0814",
    cloneId: "KP1",
    clonality: "MONOCLONAL",
    sourceOrganism: "MOUSE",
    targetSpecies: ["Homo sapiens"],
    targetProteinId: "P31996",
    targetName: "CD68",
    applications: ["IF", "IHC", "CODEX", "CYCIF"],
    vendorName: "Dako",
    vendorUrl: "https://www.agilent.com/dako",
    citationCount: 672,
  },
  {
    rrid: "RRID:AB_443427",
    name: "Anti-CD68 (EPR20545)",
    catalogNumber: "ab213363",
    cloneId: "EPR20545",
    clonality: "RECOMBINANT",
    sourceOrganism: "RABBIT",
    targetSpecies: ["Homo sapiens"],
    targetProteinId: "P31996",
    targetName: "CD68",
    applications: ["IF", "IHC"],
    vendorName: "Abcam",
    vendorUrl: "https://www.abcam.com",
    citationCount: 94,
  },
  {
    rrid: "RRID:AB_2650493",
    name: "Anti-FoxP3 (236A/E7)",
    catalogNumber: "ab20034",
    cloneId: "236A/E7",
    clonality: "MONOCLONAL",
    sourceOrganism: "MOUSE",
    targetSpecies: ["Homo sapiens"],
    targetProteinId: "Q9BZS1",
    targetName: "FoxP3",
    applications: ["IF", "IHC"],
    vendorName: "Abcam",
    vendorUrl: "https://www.abcam.com",
    citationCount: 445,
  },
  {
    rrid: "RRID:AB_1236477",
    name: "Anti-FoxP3 (PCH101)",
    catalogNumber: "14-4776-82",
    cloneId: "PCH101",
    clonality: "MONOCLONAL",
    sourceOrganism: "RAT",
    targetSpecies: ["Homo sapiens"],
    targetProteinId: "Q9BZS1",
    targetName: "FoxP3",
    applications: ["IF", "FC"],
    vendorName: "Thermo Fisher",
    vendorUrl: "https://www.thermofisher.com",
    citationCount: 891,
  },
  {
    rrid: "RRID:AB_2716564",
    name: "Anti-PD-1 (NAT105)",
    catalogNumber: "ab52587",
    cloneId: "NAT105",
    clonality: "MONOCLONAL",
    sourceOrganism: "MOUSE",
    targetSpecies: ["Homo sapiens"],
    targetProteinId: "P46531",
    targetName: "PD-1",
    applications: ["IF", "IHC", "CYCIF"],
    vendorName: "Abcam",
    vendorUrl: "https://www.abcam.com",
    citationCount: 267,
  },
  {
    rrid: "RRID:AB_2810960",
    name: "Anti-PD-L1 (28-8)",
    catalogNumber: "ab205921",
    cloneId: "28-8",
    clonality: "MONOCLONAL",
    sourceOrganism: "RABBIT",
    targetSpecies: ["Homo sapiens"],
    targetProteinId: "Q9NZQ7",
    targetName: "PD-L1",
    applications: ["IF", "IHC", "CYCIF"],
    vendorName: "Abcam",
    vendorUrl: "https://www.abcam.com",
    citationCount: 512,
  },
  {
    rrid: "RRID:AB_2860866",
    name: "Anti-HLA-DR (LN3)",
    catalogNumber: "14-9956-82",
    cloneId: "LN3",
    clonality: "MONOCLONAL",
    sourceOrganism: "MOUSE",
    targetSpecies: ["Homo sapiens"],
    targetProteinId: "P04233",
    targetName: "HLA-DR alpha",
    applications: ["IF", "IHC", "CODEX"],
    vendorName: "Thermo Fisher",
    vendorUrl: "https://www.thermofisher.com",
    citationCount: 198,
  },
  {
    rrid: "RRID:AB_2864622",
    name: "Anti-Ki67 (16A8)",
    catalogNumber: "652402",
    cloneId: "16A8",
    clonality: "MONOCLONAL",
    sourceOrganism: "MOUSE",
    targetSpecies: ["Homo sapiens"],
    targetProteinId: "P49917",
    targetName: "Ki67",
    applications: ["IF", "IHC", "CODEX", "CYCIF"],
    vendorName: "BioLegend",
    vendorUrl: "https://www.biolegend.com",
    citationCount: 734,
    conjugate: "AF488",
  },
  {
    rrid: "RRID:AB_302459",
    name: "Anti-Ki67 (SP6)",
    catalogNumber: "ab16667",
    cloneId: "SP6",
    clonality: "MONOCLONAL",
    sourceOrganism: "RABBIT",
    targetSpecies: ["Homo sapiens"],
    targetProteinId: "P49917",
    targetName: "Ki67",
    applications: ["IF", "IHC"],
    vendorName: "Abcam",
    vendorUrl: "https://www.abcam.com",
    citationCount: 543,
  },
  {
    rrid: "RRID:AB_2810957",
    name: "Anti-E-Cadherin (24E10)",
    catalogNumber: "3195",
    cloneId: "24E10",
    clonality: "MONOCLONAL",
    sourceOrganism: "RABBIT",
    targetSpecies: ["Homo sapiens"],
    targetProteinId: "P05067",
    targetName: "E-Cadherin",
    applications: ["IF", "IHC", "CYCIF"],
    vendorName: "Cell Signaling Technology",
    vendorUrl: "https://www.cellsignal.com",
    citationCount: 612,
  },
  {
    rrid: "RRID:AB_2891175",
    name: "Anti-Vimentin (D21H3)",
    catalogNumber: "5741",
    cloneId: "D21H3",
    clonality: "MONOCLONAL",
    sourceOrganism: "RABBIT",
    targetSpecies: ["Homo sapiens"],
    targetProteinId: "P08670",
    targetName: "Vimentin",
    applications: ["IF", "IHC", "CYCIF", "CODEX"],
    vendorName: "Cell Signaling Technology",
    vendorUrl: "https://www.cellsignal.com",
    citationCount: 489,
  },
  {
    rrid: "RRID:AB_2223500",
    name: "Anti-Alpha-SMA (1A4)",
    catalogNumber: "ab7817",
    cloneId: "1A4",
    clonality: "MONOCLONAL",
    sourceOrganism: "MOUSE",
    targetSpecies: ["Homo sapiens"],
    targetProteinId: "P62736",
    targetName: "Alpha-SMA",
    applications: ["IF", "IHC", "IMC"],
    vendorName: "Abcam",
    vendorUrl: "https://www.abcam.com",
    citationCount: 823,
  },
  {
    rrid: "RRID:AB_2924631",
    name: "Anti-CD31 (JC70A)",
    catalogNumber: "M0823",
    cloneId: "JC70A",
    clonality: "MONOCLONAL",
    sourceOrganism: "MOUSE",
    targetSpecies: ["Homo sapiens"],
    targetProteinId: "P16284",
    targetName: "CD31",
    applications: ["IF", "IHC", "CYCIF"],
    vendorName: "Dako",
    vendorUrl: "https://www.agilent.com/dako",
    citationCount: 378,
  },
  {
    rrid: "RRID:AB_2832070",
    name: "Anti-CD163 (EPR19518)",
    catalogNumber: "ab182422",
    cloneId: "EPR19518",
    clonality: "RECOMBINANT",
    sourceOrganism: "RABBIT",
    targetSpecies: ["Homo sapiens"],
    targetProteinId: "Q86VB7",
    targetName: "CD163",
    applications: ["IF", "IHC", "CODEX"],
    vendorName: "Abcam",
    vendorUrl: "https://www.abcam.com",
    citationCount: 156,
  },
  {
    rrid: "RRID:AB_2756012",
    name: "Anti-Pan-Cytokeratin (AE1/AE3)",
    catalogNumber: "MA5-13156",
    cloneId: "AE1/AE3",
    clonality: "MONOCLONAL",
    sourceOrganism: "MOUSE",
    targetSpecies: ["Homo sapiens"],
    targetProteinId: "PANCK",
    targetName: "Pan-Cytokeratin",
    applications: ["IF", "IHC", "CODEX", "CYCIF", "IMC"],
    vendorName: "Thermo Fisher",
    vendorUrl: "https://www.thermofisher.com",
    citationCount: 1024,
  },
]

async function seedUsers() {
  return Promise.all(
    USERS.map((u) =>
      prisma.user.upsert({
        where: { id: u.id },
        update: { name: u.name, email: u.email, institution: u.institution },
        create: {
          id: u.id,
          name: u.name,
          email: u.email,
          institution: u.institution,
        },
      }),
    ),
  )
}

async function seedCellTypes() {
  return Promise.all(
    CELL_TYPES.map((ct) =>
      prisma.cellType.upsert({
        where: { id: ct.id },
        update: { label: ct.label, parentIds: JSON.stringify(ct.parentIds) },
        create: {
          id: ct.id,
          label: ct.label,
          parentIds: JSON.stringify(ct.parentIds),
        },
      }),
    ),
  )
}

async function seedStructures() {
  return Promise.all(
    STRUCTURES.map((s) =>
      prisma.anatomicalStructure.upsert({
        where: { id: s.id },
        update: { label: s.label, partOfIds: JSON.stringify(s.partOfIds) },
        create: {
          id: s.id,
          label: s.label,
          partOfIds: JSON.stringify(s.partOfIds),
        },
      }),
    ),
  )
}

async function seedProteins() {
  return Promise.all(
    PROTEINS.map((p) =>
      prisma.protein.upsert({
        where: { id: p.id },
        update: { label: p.label, geneSymbol: p.geneSymbol, ensemblGeneId: p.ensemblGeneId },
        create: {
          id: p.id,
          label: p.label,
          geneSymbol: p.geneSymbol,
          ensemblGeneId: p.ensemblGeneId,
        },
      }),
    ),
  )
}

async function seedCellTypeMarkers() {
  const markers: Array<{ cellTypeId: string; proteinId: string; isCanonical: boolean }> = [
    { cellTypeId: "CL:0000084", proteinId: "P07766", isCanonical: true },
    { cellTypeId: "CL:0000084", proteinId: "P06729", isCanonical: false },
    { cellTypeId: "CL:0000624", proteinId: "P07766", isCanonical: true },
    { cellTypeId: "CL:0000624", proteinId: "P06139", isCanonical: true },
    { cellTypeId: "CL:0000625", proteinId: "P07766", isCanonical: true },
    { cellTypeId: "CL:0000625", proteinId: "P01732", isCanonical: true },
    { cellTypeId: "CL:0000815", proteinId: "Q9BZS1", isCanonical: true },
    { cellTypeId: "CL:0000815", proteinId: "P06139", isCanonical: true },
    { cellTypeId: "CL:0000815", proteinId: "P07766", isCanonical: false },
    { cellTypeId: "CL:0000236", proteinId: "P15391", isCanonical: true },
    { cellTypeId: "CL:0000236", proteinId: "P11836", isCanonical: true },
    { cellTypeId: "CL:0000235", proteinId: "P31996", isCanonical: true },
    { cellTypeId: "CL:0000235", proteinId: "Q86VB7", isCanonical: false },
    { cellTypeId: "CL:0000235", proteinId: "P04233", isCanonical: false },
    { cellTypeId: "CL:0000451", proteinId: "P04233", isCanonical: true },
    { cellTypeId: "CL:0000451", proteinId: "P31996", isCanonical: false },
    { cellTypeId: "CL:0000066", proteinId: "PANCK", isCanonical: true },
    { cellTypeId: "CL:0000066", proteinId: "P05067", isCanonical: true },
    { cellTypeId: "CL:0000066", proteinId: "P02533", isCanonical: false },
    { cellTypeId: "CL:0000057", proteinId: "P62736", isCanonical: true },
    { cellTypeId: "CL:0000057", proteinId: "P08670", isCanonical: false },
    { cellTypeId: "CL:0000115", proteinId: "P16284", isCanonical: true },
    { cellTypeId: "CL:0000576", proteinId: "P06729", isCanonical: true },
    { cellTypeId: "CL:0000576", proteinId: "P31996", isCanonical: false },
    { cellTypeId: "CL:0000623", proteinId: "P06729", isCanonical: true },
  ]

  return Promise.all(
    markers.map((m) =>
      prisma.cellTypeMarker.upsert({
        where: { cellTypeId_proteinId: { cellTypeId: m.cellTypeId, proteinId: m.proteinId } },
        update: {},
        create: { cellTypeId: m.cellTypeId, proteinId: m.proteinId, isCanonical: m.isCanonical, source: "HuBMAP" },
      }),
    ),
  )
}

async function seedAntibodies() {
  const results = []
  for (const ab of ANTIBODIES) {
    const created = await prisma.antibody.upsert({
      where: { rrid: ab.rrid },
      update: {
        name: ab.name,
        catalogNumber: ab.catalogNumber,
        cloneId: ab.cloneId,
        clonality: ab.clonality,
        sourceOrganism: ab.sourceOrganism,
        targetSpecies: JSON.stringify(ab.targetSpecies),
        targetProteinId: ab.targetProteinId,
        targetName: ab.targetName,
        applications: JSON.stringify(ab.applications),
        vendorName: ab.vendorName,
        vendorUrl: ab.vendorUrl,
        citationCount: ab.citationCount,
        conjugate: ab.conjugate ?? null,
      },
      create: {
        rrid: ab.rrid,
        name: ab.name,
        catalogNumber: ab.catalogNumber,
        cloneId: ab.cloneId,
        clonality: ab.clonality,
        sourceOrganism: ab.sourceOrganism,
        targetSpecies: JSON.stringify(ab.targetSpecies),
        targetProteinId: ab.targetProteinId,
        targetName: ab.targetName,
        applications: JSON.stringify(ab.applications),
        vendorName: ab.vendorName,
        vendorUrl: ab.vendorUrl,
        citationCount: ab.citationCount,
        conjugate: ab.conjugate ?? null,
      },
    })
    results.push(created)
  }
  return results
}

type ReportInput = {
  antibodyRrid: string
  cellTypeId: string
  structureId?: string
  species: "HUMAN" | "MOUSE"
  tissueType: string
  fixation: "FFPE" | "FRESH_FROZEN" | "PFA" | "METHANOL"
  method: "CODEX" | "CYCIF" | "IMC" | "MIBI" | "IBEX" | "IF" | "IHC"
  fluorophore?: string
  metalTag?: string
  dilution: string
  antigenRetrieval?: string
  status: "VALIDATED" | "PENDING" | "REJECTED"
  works: boolean
  signalQuality: "EXCELLENT" | "GOOD" | "MODERATE" | "POOR"
  specificity: "HIGH" | "MODERATE" | "LOW"
  submitterId: string
  notes?: string
}

async function seedExperimentalReports(antibodyMap: Record<string, number>) {
  const reports: ReportInput[] = [
    // --- Garry Nolan (heavy contributor, CODEX specialist) ---
    {
      antibodyRrid: "RRID:AB_314056",
      cellTypeId: "CL:0000084",
      structureId: "UBERON:0002106",
      species: "HUMAN",
      tissueType: "Spleen",
      fixation: "FFPE",
      method: "CODEX",
      fluorophore: "Cy3",
      dilution: "1:200",
      antigenRetrieval: "Tris-EDTA pH 9.0",
      status: "VALIDATED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_nolan_garry",
      notes: "Excellent staining in periarteriolar lymphoid sheath",
    },
    {
      antibodyRrid: "RRID:AB_395943",
      cellTypeId: "CL:0000624",
      structureId: "UBERON:0002106",
      species: "HUMAN",
      tissueType: "Spleen",
      fixation: "FFPE",
      method: "CODEX",
      fluorophore: "AF488",
      dilution: "1:200",
      antigenRetrieval: "Tris-EDTA pH 9.0",
      status: "VALIDATED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_nolan_garry",
    },
    {
      antibodyRrid: "RRID:AB_314126",
      cellTypeId: "CL:0000625",
      structureId: "UBERON:0002106",
      species: "HUMAN",
      tissueType: "Spleen",
      fixation: "FFPE",
      method: "CODEX",
      fluorophore: "AF647",
      dilution: "1:200",
      antigenRetrieval: "Tris-EDTA pH 9.0",
      status: "VALIDATED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_nolan_garry",
    },
    {
      antibodyRrid: "RRID:AB_927185",
      cellTypeId: "CL:0000235",
      structureId: "UBERON:0002106",
      species: "HUMAN",
      tissueType: "Spleen",
      fixation: "FFPE",
      method: "CODEX",
      fluorophore: "AF555",
      dilution: "1:100",
      antigenRetrieval: "Citrate pH 6.0",
      status: "VALIDATED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_nolan_garry",
    },
    {
      antibodyRrid: "RRID:AB_2074650",
      cellTypeId: "CL:0000988",
      structureId: "UBERON:0002106",
      species: "HUMAN",
      tissueType: "Spleen",
      fixation: "FFPE",
      method: "CODEX",
      fluorophore: "Cy5",
      dilution: "1:100",
      antigenRetrieval: "Tris-EDTA pH 9.0",
      status: "VALIDATED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_nolan_garry",
    },
    {
      antibodyRrid: "RRID:AB_2892867",
      cellTypeId: "CL:0000576",
      structureId: "UBERON:0002106",
      species: "HUMAN",
      tissueType: "Spleen",
      fixation: "FFPE",
      method: "CODEX",
      fluorophore: "AF750",
      dilution: "1:100",
      antigenRetrieval: "Tris-EDTA pH 9.0",
      status: "VALIDATED",
      works: true,
      signalQuality: "GOOD",
      specificity: "HIGH",
      submitterId: "seed_user_nolan_garry",
    },
    {
      antibodyRrid: "RRID:AB_2864622",
      cellTypeId: "CL:0000066",
      structureId: "UBERON:0000160",
      species: "HUMAN",
      tissueType: "Colon",
      fixation: "FFPE",
      method: "CODEX",
      fluorophore: "AF488",
      dilution: "1:200",
      antigenRetrieval: "Tris-EDTA pH 9.0",
      status: "VALIDATED",
      works: true,
      signalQuality: "GOOD",
      specificity: "HIGH",
      submitterId: "seed_user_nolan_garry",
    },
    {
      antibodyRrid: "RRID:AB_2860866",
      cellTypeId: "CL:0000451",
      structureId: "UBERON:0002106",
      species: "HUMAN",
      tissueType: "Spleen",
      fixation: "FFPE",
      method: "CODEX",
      fluorophore: "Cy3",
      dilution: "1:100",
      antigenRetrieval: "Tris-EDTA pH 9.0",
      status: "VALIDATED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_nolan_garry",
    },

    // --- Michael Angelo (MIBI specialist) ---
    {
      antibodyRrid: "RRID:AB_927185",
      cellTypeId: "CL:0000235",
      species: "HUMAN",
      tissueType: "Breast tumor",
      fixation: "FFPE",
      method: "MIBI",
      metalTag: "89Y",
      dilution: "1:100",
      status: "VALIDATED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_angelo_mike",
      notes: "Validated for MIBI-TOF on FFPE breast cancer sections",
    },
    {
      antibodyRrid: "RRID:AB_314056",
      cellTypeId: "CL:0000084",
      species: "HUMAN",
      tissueType: "Breast tumor",
      fixation: "FFPE",
      method: "MIBI",
      metalTag: "141Pr",
      dilution: "1:200",
      status: "VALIDATED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_angelo_mike",
    },
    {
      antibodyRrid: "RRID:AB_2756012",
      cellTypeId: "CL:0000066",
      species: "HUMAN",
      tissueType: "Breast tumor",
      fixation: "FFPE",
      method: "MIBI",
      metalTag: "115In",
      dilution: "1:500",
      status: "VALIDATED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_angelo_mike",
    },
    {
      antibodyRrid: "RRID:AB_2891175",
      cellTypeId: "CL:0000057",
      species: "HUMAN",
      tissueType: "Breast tumor",
      fixation: "FFPE",
      method: "MIBI",
      metalTag: "174Yb",
      dilution: "1:200",
      status: "VALIDATED",
      works: true,
      signalQuality: "GOOD",
      specificity: "HIGH",
      submitterId: "seed_user_angelo_mike",
    },
    {
      antibodyRrid: "RRID:AB_2223500",
      cellTypeId: "CL:0000057",
      species: "HUMAN",
      tissueType: "Breast tumor",
      fixation: "FFPE",
      method: "MIBI",
      metalTag: "145Nd",
      dilution: "1:500",
      status: "VALIDATED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_angelo_mike",
    },
    {
      antibodyRrid: "RRID:AB_395943",
      cellTypeId: "CL:0000624",
      species: "HUMAN",
      tissueType: "Lung tumor",
      fixation: "FFPE",
      method: "MIBI",
      metalTag: "143Nd",
      dilution: "1:200",
      status: "VALIDATED",
      works: true,
      signalQuality: "GOOD",
      specificity: "HIGH",
      submitterId: "seed_user_angelo_mike",
    },

    // --- Jia-Ren Lin / Harvard (CyCIF specialist, very prolific) ---
    {
      antibodyRrid: "RRID:AB_10643421",
      cellTypeId: "CL:0000624",
      structureId: "UBERON:0002370",
      species: "HUMAN",
      tissueType: "Thymus",
      fixation: "FFPE",
      method: "CYCIF",
      fluorophore: "AF488",
      dilution: "1:200",
      antigenRetrieval: "Tris-EDTA pH 9.0",
      status: "VALIDATED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_lin_jia",
    },
    {
      antibodyRrid: "RRID:AB_443426",
      cellTypeId: "CL:0000625",
      structureId: "UBERON:0002370",
      species: "HUMAN",
      tissueType: "Thymus",
      fixation: "FFPE",
      method: "CYCIF",
      fluorophore: "AF555",
      dilution: "1:200",
      antigenRetrieval: "Tris-EDTA pH 9.0",
      status: "VALIDATED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_lin_jia",
    },
    {
      antibodyRrid: "RRID:AB_2074649",
      cellTypeId: "CL:0000236",
      structureId: "UBERON:0002370",
      species: "HUMAN",
      tissueType: "Thymus",
      fixation: "FFPE",
      method: "CYCIF",
      fluorophore: "AF647",
      dilution: "1:100",
      antigenRetrieval: "Tris-EDTA pH 9.0",
      status: "VALIDATED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_lin_jia",
    },
    {
      antibodyRrid: "RRID:AB_2810957",
      cellTypeId: "CL:0000066",
      structureId: "UBERON:0000160",
      species: "HUMAN",
      tissueType: "Colon",
      fixation: "FFPE",
      method: "CYCIF",
      fluorophore: "AF488",
      dilution: "1:400",
      antigenRetrieval: "Citrate pH 6.0",
      status: "VALIDATED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_lin_jia",
    },
    {
      antibodyRrid: "RRID:AB_2891175",
      cellTypeId: "CL:0000057",
      structureId: "UBERON:0000160",
      species: "HUMAN",
      tissueType: "Colon",
      fixation: "FFPE",
      method: "CYCIF",
      fluorophore: "AF555",
      dilution: "1:200",
      antigenRetrieval: "Citrate pH 6.0",
      status: "VALIDATED",
      works: true,
      signalQuality: "GOOD",
      specificity: "HIGH",
      submitterId: "seed_user_lin_jia",
    },
    {
      antibodyRrid: "RRID:AB_2810960",
      cellTypeId: "CL:0000066",
      structureId: "UBERON:0000160",
      species: "HUMAN",
      tissueType: "Colon",
      fixation: "FFPE",
      method: "CYCIF",
      fluorophore: "AF647",
      dilution: "1:200",
      antigenRetrieval: "Tris-EDTA pH 9.0",
      status: "VALIDATED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_lin_jia",
      notes: "PD-L1 on tumor cells, clear membrane staining",
    },
    {
      antibodyRrid: "RRID:AB_2716564",
      cellTypeId: "CL:0000625",
      species: "HUMAN",
      tissueType: "Lung tumor",
      fixation: "FFPE",
      method: "CYCIF",
      fluorophore: "AF488",
      dilution: "1:200",
      antigenRetrieval: "Tris-EDTA pH 9.0",
      status: "VALIDATED",
      works: true,
      signalQuality: "GOOD",
      specificity: "MODERATE",
      submitterId: "seed_user_lin_jia",
      notes: "Some background in germinal centers",
    },
    {
      antibodyRrid: "RRID:AB_302459",
      cellTypeId: "CL:0000066",
      structureId: "UBERON:0000160",
      species: "HUMAN",
      tissueType: "Colon tumor",
      fixation: "FFPE",
      method: "CYCIF",
      fluorophore: "AF555",
      dilution: "1:400",
      antigenRetrieval: "Tris-EDTA pH 9.0",
      status: "VALIDATED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_lin_jia",
    },
    {
      antibodyRrid: "RRID:AB_2924631",
      cellTypeId: "CL:0000115",
      structureId: "UBERON:0000160",
      species: "HUMAN",
      tissueType: "Colon",
      fixation: "FFPE",
      method: "CYCIF",
      fluorophore: "AF647",
      dilution: "1:100",
      antigenRetrieval: "Citrate pH 6.0",
      status: "VALIDATED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_lin_jia",
    },

    // --- Yury Goltsev (CODEX, mouse tissues) ---
    {
      antibodyRrid: "RRID:AB_314056",
      cellTypeId: "CL:0000084",
      structureId: "UBERON:0002370",
      species: "MOUSE",
      tissueType: "Thymus",
      fixation: "PFA",
      method: "CODEX",
      fluorophore: "Cy3",
      dilution: "1:200",
      status: "VALIDATED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_goltsev_yury",
      notes: "Cross-reacts with mouse CD3e",
    },
    {
      antibodyRrid: "RRID:AB_395943",
      cellTypeId: "CL:0000624",
      structureId: "UBERON:0002370",
      species: "MOUSE",
      tissueType: "Thymus",
      fixation: "PFA",
      method: "CODEX",
      fluorophore: "AF488",
      dilution: "1:200",
      status: "VALIDATED",
      works: true,
      signalQuality: "GOOD",
      specificity: "HIGH",
      submitterId: "seed_user_goltsev_yury",
    },
    {
      antibodyRrid: "RRID:AB_2650493",
      cellTypeId: "CL:0000815",
      structureId: "UBERON:0002370",
      species: "MOUSE",
      tissueType: "Thymus",
      fixation: "PFA",
      method: "CODEX",
      fluorophore: "AF647",
      dilution: "1:100",
      antigenRetrieval: "Citrate pH 6.0",
      status: "VALIDATED",
      works: true,
      signalQuality: "GOOD",
      specificity: "HIGH",
      submitterId: "seed_user_goltsev_yury",
    },
    {
      antibodyRrid: "RRID:AB_2864622",
      cellTypeId: "CL:0000988",
      structureId: "UBERON:0002106",
      species: "MOUSE",
      tissueType: "Spleen",
      fixation: "PFA",
      method: "CODEX",
      fluorophore: "AF555",
      dilution: "1:200",
      status: "VALIDATED",
      works: true,
      signalQuality: "GOOD",
      specificity: "HIGH",
      submitterId: "seed_user_goltsev_yury",
    },

    // --- Sandro Santagata (IMC, tumor microenvironment) ---
    {
      antibodyRrid: "RRID:AB_2223500",
      cellTypeId: "CL:0000057",
      structureId: "UBERON:0002048",
      species: "HUMAN",
      tissueType: "Lung",
      fixation: "FFPE",
      method: "IMC",
      metalTag: "145Nd",
      dilution: "1:500",
      status: "VALIDATED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_hta_user1",
    },
    {
      antibodyRrid: "RRID:AB_927185",
      cellTypeId: "CL:0000235",
      structureId: "UBERON:0002048",
      species: "HUMAN",
      tissueType: "Lung tumor",
      fixation: "FFPE",
      method: "IMC",
      metalTag: "89Y",
      dilution: "1:100",
      status: "VALIDATED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_hta_user1",
    },
    {
      antibodyRrid: "RRID:AB_2756012",
      cellTypeId: "CL:0000066",
      structureId: "UBERON:0002048",
      species: "HUMAN",
      tissueType: "Lung tumor",
      fixation: "FFPE",
      method: "IMC",
      metalTag: "115In",
      dilution: "1:500",
      status: "VALIDATED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_hta_user1",
    },
    {
      antibodyRrid: "RRID:AB_2860866",
      cellTypeId: "CL:0000451",
      structureId: "UBERON:0002048",
      species: "HUMAN",
      tissueType: "Lung tumor",
      fixation: "FFPE",
      method: "IMC",
      metalTag: "159Tb",
      dilution: "1:100",
      status: "VALIDATED",
      works: true,
      signalQuality: "GOOD",
      specificity: "HIGH",
      submitterId: "seed_user_hta_user1",
    },
    {
      antibodyRrid: "RRID:AB_2716564",
      cellTypeId: "CL:0000625",
      structureId: "UBERON:0002048",
      species: "HUMAN",
      tissueType: "Lung tumor",
      fixation: "FFPE",
      method: "IMC",
      metalTag: "168Er",
      dilution: "1:200",
      status: "VALIDATED",
      works: true,
      signalQuality: "GOOD",
      specificity: "MODERATE",
      submitterId: "seed_user_hta_user1",
    },

    // --- Matthew Krummel (UCSF, IF and fresh frozen) ---
    {
      antibodyRrid: "RRID:AB_314056",
      cellTypeId: "CL:0000084",
      species: "HUMAN",
      tissueType: "Lymph node",
      fixation: "FRESH_FROZEN",
      method: "IF",
      fluorophore: "AF647",
      dilution: "1:100",
      status: "VALIDATED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_krummel_matt",
    },
    {
      antibodyRrid: "RRID:AB_2650493",
      cellTypeId: "CL:0000815",
      species: "HUMAN",
      tissueType: "Lymph node",
      fixation: "FRESH_FROZEN",
      method: "IF",
      fluorophore: "AF488",
      dilution: "1:50",
      status: "VALIDATED",
      works: true,
      signalQuality: "GOOD",
      specificity: "HIGH",
      submitterId: "seed_user_krummel_matt",
    },
    {
      antibodyRrid: "RRID:AB_1236477",
      cellTypeId: "CL:0000815",
      species: "HUMAN",
      tissueType: "Tonsil",
      fixation: "FFPE",
      method: "IF",
      fluorophore: "AF555",
      dilution: "1:100",
      antigenRetrieval: "Citrate pH 6.0",
      status: "VALIDATED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_krummel_matt",
    },
    {
      antibodyRrid: "RRID:AB_2716564",
      cellTypeId: "CL:0000625",
      species: "HUMAN",
      tissueType: "Tonsil",
      fixation: "FFPE",
      method: "IF",
      fluorophore: "AF647",
      dilution: "1:200",
      antigenRetrieval: "Tris-EDTA pH 9.0",
      status: "VALIDATED",
      works: true,
      signalQuality: "GOOD",
      specificity: "MODERATE",
      submitterId: "seed_user_krummel_matt",
      notes: "Some cross-reactivity with germinal center B cells at this dilution",
    },
    {
      antibodyRrid: "RRID:AB_2810960",
      cellTypeId: "CL:0000066",
      species: "HUMAN",
      tissueType: "Tonsil",
      fixation: "FFPE",
      method: "IF",
      fluorophore: "AF488",
      dilution: "1:400",
      antigenRetrieval: "Tris-EDTA pH 9.0",
      status: "PENDING",
      works: true,
      signalQuality: "GOOD",
      specificity: "HIGH",
      submitterId: "seed_user_krummel_matt",
    },

    // --- Broad Institute user (liver studies) ---
    {
      antibodyRrid: "RRID:AB_927185",
      cellTypeId: "CL:0000235",
      structureId: "UBERON:0002107",
      species: "HUMAN",
      tissueType: "Liver",
      fixation: "FFPE",
      method: "CODEX",
      fluorophore: "Cy3",
      dilution: "1:100",
      antigenRetrieval: "Citrate pH 6.0",
      status: "VALIDATED",
      works: true,
      signalQuality: "GOOD",
      specificity: "HIGH",
      submitterId: "seed_user_broad_user1",
    },
    {
      antibodyRrid: "RRID:AB_2924631",
      cellTypeId: "CL:0000115",
      structureId: "UBERON:0002107",
      species: "HUMAN",
      tissueType: "Liver",
      fixation: "FFPE",
      method: "CODEX",
      fluorophore: "AF488",
      dilution: "1:100",
      antigenRetrieval: "Citrate pH 6.0",
      status: "VALIDATED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_broad_user1",
    },
    {
      antibodyRrid: "RRID:AB_443427",
      cellTypeId: "CL:0000235",
      structureId: "UBERON:0002107",
      species: "HUMAN",
      tissueType: "Liver",
      fixation: "FFPE",
      method: "CODEX",
      fluorophore: "AF647",
      dilution: "1:200",
      antigenRetrieval: "Citrate pH 6.0",
      status: "PENDING",
      works: true,
      signalQuality: "MODERATE",
      specificity: "MODERATE",
      submitterId: "seed_user_broad_user1",
      notes: "Works but noisier than KP1 clone",
    },

    // --- Yale user (fewer submissions, IHC focused) ---
    {
      antibodyRrid: "RRID:AB_443425",
      cellTypeId: "CL:0000084",
      species: "HUMAN",
      tissueType: "Lymph node",
      fixation: "FFPE",
      method: "IHC",
      dilution: "1:100",
      antigenRetrieval: "Citrate pH 6.0",
      status: "VALIDATED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_yale_user1",
    },
    {
      antibodyRrid: "RRID:AB_2832070",
      cellTypeId: "CL:0000235",
      species: "HUMAN",
      tissueType: "Lymph node",
      fixation: "FFPE",
      method: "IHC",
      dilution: "1:200",
      antigenRetrieval: "Tris-EDTA pH 9.0",
      status: "VALIDATED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_yale_user1",
    },

    // --- MSK user (single submission with negative result) ---
    {
      antibodyRrid: "RRID:AB_302459",
      cellTypeId: "CL:0000057",
      species: "HUMAN",
      tissueType: "Pancreas",
      fixation: "METHANOL",
      method: "IF",
      fluorophore: "AF488",
      dilution: "1:400",
      status: "REJECTED",
      works: false,
      signalQuality: "POOR",
      specificity: "LOW",
      submitterId: "seed_user_msk_user1",
      notes: "Methanol fixation incompatible with this clone, no signal observed",
    },

    // --- Weill/HMS user (mouse models) ---
    {
      antibodyRrid: "RRID:AB_314056",
      cellTypeId: "CL:0000084",
      species: "MOUSE",
      tissueType: "Spleen",
      fixation: "PFA",
      method: "IF",
      fluorophore: "AF647",
      dilution: "1:200",
      status: "VALIDATED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_weill_user1",
    },
    {
      antibodyRrid: "RRID:AB_1236477",
      cellTypeId: "CL:0000815",
      species: "MOUSE",
      tissueType: "Spleen",
      fixation: "PFA",
      method: "IF",
      fluorophore: "AF488",
      dilution: "1:100",
      status: "VALIDATED",
      works: true,
      signalQuality: "GOOD",
      specificity: "HIGH",
      submitterId: "seed_user_weill_user1",
    },
    {
      antibodyRrid: "RRID:AB_395943",
      cellTypeId: "CL:0000624",
      species: "MOUSE",
      tissueType: "Spleen",
      fixation: "PFA",
      method: "IF",
      fluorophore: "AF555",
      dilution: "1:200",
      status: "VALIDATED",
      works: true,
      signalQuality: "GOOD",
      specificity: "HIGH",
      submitterId: "seed_user_weill_user1",
    },

    // --- Victor Puelles (Complex Tissue Lab, kidney specialist, CODEX) ---
    {
      antibodyRrid: "RRID:AB_314056",
      cellTypeId: "CL:0000084",
      structureId: "UBERON:0002113",
      species: "HUMAN",
      tissueType: "Kidney",
      fixation: "FFPE",
      method: "CODEX",
      fluorophore: "FITC",
      dilution: "1:200",
      antigenRetrieval: "Tris-EDTA pH 9.0",
      status: "VALIDATED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_puelles_victor",
    },
    {
      antibodyRrid: "RRID:AB_443425",
      cellTypeId: "CL:0000624",
      structureId: "UBERON:0002113",
      species: "HUMAN",
      tissueType: "Kidney",
      fixation: "FFPE",
      method: "CODEX",
      fluorophore: "PE",
      dilution: "1:100",
      antigenRetrieval: "Tris-EDTA pH 9.0",
      status: "VALIDATED",
      works: true,
      signalQuality: "GOOD",
      specificity: "HIGH",
      submitterId: "seed_user_puelles_victor",
    },
    {
      antibodyRrid: "RRID:AB_395943",
      cellTypeId: "CL:0000625",
      structureId: "UBERON:0002113",
      species: "HUMAN",
      tissueType: "Kidney",
      fixation: "FFPE",
      method: "CODEX",
      fluorophore: "AF647",
      dilution: "1:100",
      antigenRetrieval: "Tris-EDTA pH 9.0",
      status: "VALIDATED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_puelles_victor",
    },
    {
      antibodyRrid: "RRID:AB_927185",
      cellTypeId: "CL:0000066",
      structureId: "UBERON:0002113",
      species: "HUMAN",
      tissueType: "Kidney",
      fixation: "FFPE",
      method: "CODEX",
      fluorophore: "BV421",
      dilution: "1:200",
      antigenRetrieval: "Citrate pH 6.0",
      status: "VALIDATED",
      works: true,
      signalQuality: "GOOD",
      specificity: "HIGH",
      submitterId: "seed_user_puelles_victor",
    },
    {
      antibodyRrid: "RRID:AB_314126",
      cellTypeId: "CL:0000576",
      structureId: "UBERON:0002113",
      species: "HUMAN",
      tissueType: "Kidney",
      fixation: "FFPE",
      method: "CODEX",
      fluorophore: "APC",
      dilution: "1:150",
      antigenRetrieval: "Tris-EDTA pH 9.0",
      status: "VALIDATED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_puelles_victor",
    },
    {
      antibodyRrid: "RRID:AB_563543",
      cellTypeId: "CL:0000235",
      structureId: "UBERON:0002113",
      species: "HUMAN",
      tissueType: "Kidney",
      fixation: "FFPE",
      method: "CODEX",
      fluorophore: "PE-Cy7",
      dilution: "1:100",
      antigenRetrieval: "Tris-EDTA pH 9.0",
      status: "VALIDATED",
      works: true,
      signalQuality: "GOOD",
      specificity: "MODERATE",
      submitterId: "seed_user_puelles_victor",
    },
    {
      antibodyRrid: "RRID:AB_2074649",
      cellTypeId: "CL:0000115",
      structureId: "UBERON:0002113",
      species: "HUMAN",
      tissueType: "Kidney",
      fixation: "FFPE",
      method: "CODEX",
      fluorophore: "BV510",
      dilution: "1:200",
      antigenRetrieval: "Citrate pH 6.0",
      status: "VALIDATED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_puelles_victor",
    },
  ]

  for (let i = 0; i < reports.length; i++) {
    const r = reports[i]
    const antibodyId = antibodyMap[r.antibodyRrid]
    if (antibodyId === undefined) {
      throw new Error(`Antibody not found for RRID: ${r.antibodyRrid}`)
    }

    await prisma.experimentalReport.create({
      data: {
        antibodyId,
        cellTypeId: r.cellTypeId,
        structureId: r.structureId,
        species: r.species,
        tissueType: r.tissueType,
        fixation: r.fixation,
        method: r.method,
        fluorophore: r.fluorophore,
        metalTag: r.metalTag,
        dilution: r.dilution,
        antigenRetrieval: r.antigenRetrieval,
        status: r.status,
        works: r.works,
        signalQuality: r.signalQuality,
        specificity: r.specificity,
        submitterId: r.submitterId,
        notes: r.notes,
        isPublic: true,
        imageUrls: getReportImages(i),
      },
    })
  }

  return reports.length
}

async function seedPanels(antibodyMap: Record<string, number>) {
  const nolanId = "seed_user_nolan_garry"
  const linId = "seed_user_lin_jia"

  const panel1 = await prisma.panel.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: "Immune Cell Profiling - Spleen (CODEX)",
      description:
        "Multi-cycle CODEX panel for comprehensive immune cell typing in human spleen. Covers T cells, B cells, myeloid and structural markers across 3 imaging cycles.",
      species: "HUMAN",
      fixation: "FFPE",
      ownerId: nolanId,
      isPublic: true,
    },
  })

  const p1c1 = await prisma.panelCycle.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      panelId: panel1.id,
      name: "Cycle 1",
      notes: "T cell lineage markers — CD3, CD4, CD8 for T cell subset identification",
      sortOrder: 0,
    },
  })

  const p1c2 = await prisma.panelCycle.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      panelId: panel1.id,
      name: "Cycle 2",
      notes: "B cell and myeloid markers — CD20, CD68, HLA-DR for antigen-presenting cells",
      sortOrder: 1,
    },
  })

  const p1c3 = await prisma.panelCycle.upsert({
    where: { id: 3 },
    update: {},
    create: {
      id: 3,
      panelId: panel1.id,
      name: "Cycle 3",
      notes: "Activation and adhesion markers — CD2 for co-stimulation readout",
      sortOrder: 2,
    },
  })

  const p1c1Count = await prisma.panelMarker.count({ where: { cycleId: p1c1.id } })
  if (p1c1Count === 0) {
    await prisma.panelMarker.createMany({
      data: [
        {
          cycleId: p1c1.id,
          proteinId: "P07766",
          antibodyId: antibodyMap["RRID:AB_314056"],
          fluorophore: "Cy3",
          sortOrder: 0,
        },
        {
          cycleId: p1c1.id,
          proteinId: "P06139",
          antibodyId: antibodyMap["RRID:AB_395943"],
          fluorophore: "AF488",
          sortOrder: 1,
        },
        {
          cycleId: p1c1.id,
          proteinId: "P01732",
          antibodyId: antibodyMap["RRID:AB_314126"],
          fluorophore: "AF647",
          sortOrder: 2,
        },
      ],
    })
  }

  const p1c2Count = await prisma.panelMarker.count({ where: { cycleId: p1c2.id } })
  if (p1c2Count === 0) {
    await prisma.panelMarker.createMany({
      data: [
        {
          cycleId: p1c2.id,
          proteinId: "P15391",
          antibodyId: antibodyMap["RRID:AB_563543"],
          fluorophore: "AF488",
          sortOrder: 0,
        },
        {
          cycleId: p1c2.id,
          proteinId: "P31996",
          antibodyId: antibodyMap["RRID:AB_927185"],
          fluorophore: "AF647",
          sortOrder: 1,
        },
        {
          cycleId: p1c2.id,
          proteinId: "P04233",
          antibodyId: antibodyMap["RRID:AB_2860866"],
          fluorophore: "AF750",
          sortOrder: 2,
        },
      ],
    })
  }

  const p1c3Count = await prisma.panelMarker.count({ where: { cycleId: p1c3.id } })
  if (p1c3Count === 0) {
    await prisma.panelMarker.createMany({
      data: [
        {
          cycleId: p1c3.id,
          proteinId: "P06729",
          antibodyId: antibodyMap["RRID:AB_2074650"],
          fluorophore: "PE",
          sortOrder: 0,
        },
      ],
    })
  }

  const panel2 = await prisma.panel.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      name: "Tumor Microenvironment - CyCIF Core Panel",
      description:
        "4-cycle CyCIF panel for comprehensive TME characterization in FFPE. Covers epithelial, immune, stromal, and checkpoint markers across iterative staining rounds.",
      species: "HUMAN",
      fixation: "FFPE",
      ownerId: linId,
      isPublic: true,
    },
  })

  const p2c1 = await prisma.panelCycle.upsert({
    where: { id: 4 },
    update: {},
    create: {
      id: 4,
      panelId: panel2.id,
      name: "Cycle 1",
      notes: "Epithelial and structural markers — pan-CK for tumor cells, SMA for stroma",
      sortOrder: 0,
    },
  })

  const p2c2 = await prisma.panelCycle.upsert({
    where: { id: 5 },
    update: {},
    create: {
      id: 5,
      panelId: panel2.id,
      name: "Cycle 2",
      notes: "Immune cell identification — CD31 for vasculature, PCAM for endothelial cells",
      sortOrder: 1,
    },
  })

  const p2c3 = await prisma.panelCycle.upsert({
    where: { id: 6 },
    update: {},
    create: {
      id: 6,
      panelId: panel2.id,
      name: "Cycle 3",
      notes: "Immune checkpoint markers — PD-L1 and Notch1 for immune evasion assessment",
      sortOrder: 2,
    },
  })

  const p2c4 = await prisma.panelCycle.upsert({
    where: { id: 7 },
    update: {},
    create: {
      id: 7,
      panelId: panel2.id,
      name: "Cycle 4",
      notes: "DNA damage and repair — LIG4 for double-strand break repair capacity",
      sortOrder: 3,
    },
  })

  const p2c1Count = await prisma.panelMarker.count({ where: { cycleId: p2c1.id } })
  if (p2c1Count === 0) {
    await prisma.panelMarker.createMany({
      data: [
        {
          cycleId: p2c1.id,
          proteinId: "PANCK",
          antibodyId: antibodyMap["RRID:AB_2756012"],
          fluorophore: "AF488",
          sortOrder: 0,
        },
        {
          cycleId: p2c1.id,
          proteinId: "P62736",
          antibodyId: antibodyMap["RRID:AB_2223500"],
          fluorophore: "AF647",
          sortOrder: 1,
        },
      ],
    })
  }

  const p2c2Count = await prisma.panelMarker.count({ where: { cycleId: p2c2.id } })
  if (p2c2Count === 0) {
    await prisma.panelMarker.createMany({
      data: [
        {
          cycleId: p2c2.id,
          proteinId: "P16284",
          antibodyId: antibodyMap["RRID:AB_2924631"],
          fluorophore: "AF555",
          sortOrder: 0,
        },
        {
          cycleId: p2c2.id,
          proteinId: "P05067",
          antibodyId: antibodyMap["RRID:AB_2810957"],
          fluorophore: "AF750",
          sortOrder: 1,
        },
      ],
    })
  }

  const p2c3Count = await prisma.panelMarker.count({ where: { cycleId: p2c3.id } })
  if (p2c3Count === 0) {
    await prisma.panelMarker.createMany({
      data: [
        {
          cycleId: p2c3.id,
          proteinId: "Q9NZQ7",
          antibodyId: antibodyMap["RRID:AB_2810960"],
          fluorophore: "AF488",
          sortOrder: 0,
        },
        {
          cycleId: p2c3.id,
          proteinId: "P46531",
          antibodyId: antibodyMap["RRID:AB_2716564"],
          fluorophore: "AF647",
          sortOrder: 1,
        },
      ],
    })
  }

  const p2c4Count = await prisma.panelMarker.count({ where: { cycleId: p2c4.id } })
  if (p2c4Count === 0) {
    await prisma.panelMarker.createMany({
      data: [
        {
          cycleId: p2c4.id,
          proteinId: "P49917",
          antibodyId: antibodyMap["RRID:AB_2864622"],
          fluorophore: "PE",
          sortOrder: 0,
        },
      ],
    })
  }

  return 2
}

async function resetDatabase() {
  console.log("Resetting database...")
  await prisma.panelMarker.deleteMany()
  await prisma.panelCycle.deleteMany()
  await prisma.panel.deleteMany()
  await prisma.experimentalReport.deleteMany()
  await prisma.cellTypeMarker.deleteMany()
  await prisma.cellTypeStructure.deleteMany()
  await prisma.antibody.deleteMany()
  await prisma.protein.deleteMany()
  await prisma.cellType.deleteMany()
  await prisma.anatomicalStructure.deleteMany()
  await prisma.review.deleteMany()
  await prisma.chatMessage.deleteMany()
  await prisma.chatRateLimit.deleteMany()
  await prisma.rateLimit.deleteMany()
  await prisma.blogPost.deleteMany()
  await prisma.authenticator.deleteMany()
  await prisma.verificationToken.deleteMany()
  await prisma.account.deleteMany()
  await prisma.session.deleteMany()
  await prisma.user.deleteMany()
  console.log("Database reset complete")
}

async function main() {
  await resetDatabase()
  const users = await seedUsers()
  const cellTypes = await seedCellTypes()
  const structures = await seedStructures()
  const proteins = await seedProteins()
  await seedCellTypeMarkers()
  const antibodies = await seedAntibodies()

  const antibodyMap: Record<string, number> = {}
  for (const ab of antibodies) {
    if (ab.rrid) {
      antibodyMap[ab.rrid] = ab.id
    }
  }

  const reportCount = await seedExperimentalReports(antibodyMap)
  const panelCount = await seedPanels(antibodyMap)

  console.log("Seed data created successfully")
  console.log(`  ${users.length} users`)
  console.log(`  ${cellTypes.length} cell types`)
  console.log(`  ${structures.length} anatomical structures (incl. kidney, lymph node, tonsil)`)
  console.log(`  ${proteins.length} proteins`)
  console.log(`  25 cell type markers`)
  console.log(`  ${antibodies.length} antibodies`)
  console.log(`  ${reportCount} experimental reports`)
  console.log(`  ${panelCount} panels with cycles and markers`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
