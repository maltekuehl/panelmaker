import { PrismaPg } from "@prisma/adapter-pg"
import "dotenv/config"
import { mkdir } from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"
import { PrismaClient } from "../lib/generated/prisma/client"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// Deterministic PRNG so re-running the seed produces the same demo images.
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Fluorophore-like marker channel colors layered over blue "nuclei".
const SEED_CHANNEL_COLORS = ["#00ff88", "#ff4d4d", "#4d9bff", "#ffd24d", "#c44dff", "#4dffe0"]

function blobLayer(
  w: number,
  h: number,
  color: string,
  rng: () => number,
  n: number,
  rMin: number,
  rMax: number,
): string {
  let s = ""
  for (let i = 0; i < n; i++) {
    const cx = Math.round(rng() * w)
    const cy = Math.round(rng() * h)
    const r = Math.round(rMin + rng() * (rMax - rMin))
    const o = (0.3 + rng() * 0.55).toFixed(2)
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="${o}"/>`
  }
  return s
}

function blobSvg(w: number, h: number, color: string, rng: () => number): string {
  const nuclei = blobLayer(w, h, "#2f5fd0", rng, 55, 3, 9)
  const marker = blobLayer(w, h, color, rng, 16, 10, 30)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs><filter id="b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3.2"/></filter></defs>
    <rect width="${w}" height="${h}" fill="#070710"/>
    <g filter="url(#b)">${nuclei}${marker}</g>
  </svg>`
}

const SEED_UPLOADS_DIR = path.resolve(process.cwd(), process.env.UPLOADS_DIR ?? "./data/uploads")
const SEED_IMAGE_POOL_SIZE = 12
let SEED_IMAGE_POOL: string[] = []

async function generateSeedBlobImages(): Promise<string[]> {
  await mkdir(SEED_UPLOADS_DIR, { recursive: true })
  const urls: string[] = []
  for (let i = 0; i < SEED_IMAGE_POOL_SIZE; i++) {
    const rng = mulberry32(0x5eed_0000 + i)
    const color = SEED_CHANNEL_COLORS[i % SEED_CHANNEL_COLORS.length]
    const svg = blobSvg(640, 512, color, rng)
    const filename = `seed-blob-${i}.webp`
    await sharp(Buffer.from(svg)).webp({ quality: 82 }).toFile(path.join(SEED_UPLOADS_DIR, filename))
    urls.push(`/uploads/${filename}`)
  }
  return urls
}

function getReportImages(index: number): string[] {
  if (SEED_IMAGE_POOL.length === 0) return []
  const count = (index % 3) + 1
  const start = index % SEED_IMAGE_POOL.length
  const images: string[] = []
  for (let i = 0; i < count; i++) {
    images.push(SEED_IMAGE_POOL[(start + i) % SEED_IMAGE_POOL.length])
  }
  return images
}

// Stable user IDs so reports can reference them reliably across re-runs
const USERS = [
  {
    id: "seed_user_bendall_sean",
    name: "Sean Bendall",
    email: "sbendall@stanford.edu",
    institution: "Stanford University",
    institutionId: "ror:00f54p054",
  },
  {
    id: "seed_user_angelo_mike",
    name: "Michael Angelo",
    email: "mangelo@stanford.edu",
    institution: "Stanford University",
    institutionId: "ror:00f54p054",
  },
  {
    id: "seed_user_lin_jia",
    name: "Jia-Ren Lin",
    email: "jrlin@hms.harvard.edu",
    institution: "Harvard Medical School",
    institutionId: "ror:03vek6s52",
  },
  {
    id: "seed_user_goltsev_yury",
    name: "Yury Goltsev",
    email: "ygoltsev@stanford.edu",
    institution: "Stanford University",
    institutionId: "ror:00f54p054",
  },
  {
    id: "seed_user_krummel_matt",
    name: "Matthew Krummel",
    email: "mkrummel@ucsf.edu",
    institution: "University of California, San Francisco",
    institutionId: "ror:043mz5j54",
  },
  {
    id: "seed_user_broad_user1",
    name: "Asaf Rotem",
    email: "arotem@broadinstitute.org",
    institution: "Broad Institute",
    institutionId: "ror:05a0ya142",
  },
  {
    id: "seed_user_hta_user1",
    name: "Sandro Santagata",
    email: "ssantagata@hms.harvard.edu",
    institution: "Harvard Medical School",
    institutionId: "ror:03vek6s52",
  },
  {
    id: "seed_user_weill_user1",
    name: "Diane Mathis",
    email: "dmathis@hms.harvard.edu",
    institution: "Harvard Medical School",
    institutionId: "ror:03vek6s52",
  },
  {
    id: "seed_user_yale_user1",
    name: "David Hafler",
    email: "david.hafler@yale.edu",
    institution: "Yale University",
    institutionId: "ror:047mzgq16",
  },
  {
    id: "seed_user_msk_user1",
    name: "Dana Pe'er",
    email: "peerdana@mskcc.org",
    institution: "Memorial Sloan Kettering Cancer Center",
    institutionId: "ror:02yrq0923",
  },
  {
    id: "seed_user_puelles_victor",
    name: "Victor Puelles",
    email: "victor.puelles@clin.au.dk",
    institution: "Aarhus University",
    institutionId: "ror:01aj84f44",
  },
  {
    id: "seed_user_puelles_member",
    name: "Marie Sorensen",
    email: "marie.sorensen@clin.au.dk",
    institution: "Aarhus University",
    institutionId: "ror:01aj84f44",
  },
]

// Stable lab IDs. The owner is created with the OWNER role; memberIds become MEMBERs.
const LABS: {
  id: string
  name: string
  slug: string
  institution: string
  institutionId: string
  description: string
  website: string | null
  isPublicProfile: boolean
  ownerId: string
  memberIds: string[]
}[] = [
  {
    id: "seed_lab_puelles",
    name: "Puelles Lab",
    slug: "puelles-lab",
    institution: "Aarhus University",
    institutionId: "ror:01aj84f44",
    description: "Spatial proteomics of the kidney and complex tissue architecture.",
    website: "https://www.au.dk/",
    isPublicProfile: true,
    ownerId: "seed_user_puelles_victor",
    memberIds: ["seed_user_puelles_member"],
  },
  {
    id: "seed_lab_stanford",
    name: "Bendall Lab",
    slug: "bendall-lab",
    institution: "Stanford University",
    institutionId: "ror:00f54p054",
    description: "Spatial single-cell biology and CODEX multiplexed tissue imaging.",
    website: "https://www.bendalllab.com/",
    isPublicProfile: true,
    ownerId: "seed_user_bendall_sean",
    memberIds: ["seed_user_angelo_mike", "seed_user_goltsev_yury"],
  },
  {
    id: "seed_lab_hms_lsp",
    name: "Laboratory of Systems Pharmacology",
    slug: "lsp-harvard",
    institution: "Harvard Medical School",
    institutionId: "ror:03vek6s52",
    description: "Tissue imaging with CyCIF and tumor microenvironment profiling.",
    website: "https://labsyspharm.org/",
    isPublicProfile: true,
    ownerId: "seed_user_lin_jia",
    memberIds: ["seed_user_hta_user1", "seed_user_weill_user1"],
  },
  {
    id: "seed_lab_ucsf_krummel",
    name: "Krummel Lab",
    slug: "krummel-lab",
    institution: "University of California, San Francisco",
    institutionId: "ror:043mz5j54",
    description: "Immune cell dynamics and the tumor immune microenvironment.",
    website: null,
    isPublicProfile: false,
    ownerId: "seed_user_krummel_matt",
    memberIds: [],
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

// NCBI taxonomy IDs for all organisms referenced by antibody hosts and report species
const TAXA = [
  { id: "NCBI:txid9606", label: "Homo sapiens" },
  { id: "NCBI:txid10090", label: "Mus musculus" },
  { id: "NCBI:txid10116", label: "Rattus norvegicus" },
  { id: "NCBI:txid9986", label: "Oryctolagus cuniculus" },
  { id: "NCBI:txid9925", label: "Capra hircus" },
  { id: "NCBI:txid9793", label: "Equus asinus" },
  { id: "NCBI:txid10036", label: "Mesocricetus auratus" },
]

// Map old sourceOrganism enum values to Taxon ids
const SOURCE_ORGANISM_TO_TAXON: Record<string, string> = {
  MOUSE: "NCBI:txid10090",
  RABBIT: "NCBI:txid9986",
  RAT: "NCBI:txid10116",
  GOAT: "NCBI:txid9925",
  HAMSTER: "NCBI:txid10036",
  DONKEY: "NCBI:txid9793",
}

// UBERON tissues (replaces old AnatomicalStructure seeding)
const TISSUES = [
  { id: "UBERON:0002370", label: "Thymus", partOfIds: ["UBERON:0000178"] },
  { id: "UBERON:0002106", label: "Spleen", partOfIds: ["UBERON:0000178"] },
  { id: "UBERON:0000160", label: "Intestine", partOfIds: ["UBERON:0001009"] },
  { id: "UBERON:0002048", label: "Lung", partOfIds: ["UBERON:0001009"] },
  { id: "UBERON:0002107", label: "Liver", partOfIds: ["UBERON:0001009"] },
  { id: "UBERON:0002113", label: "Kidney", partOfIds: ["UBERON:0001008"] },
  { id: "UBERON:0000082", label: "Lymph Node", partOfIds: ["UBERON:0000178"] },
  { id: "UBERON:0001723", label: "Tonsil", partOfIds: ["UBERON:0000178"] },
  { id: "UBERON:0000310", label: "Breast", partOfIds: ["UBERON:0001009"] },
  { id: "UBERON:0001264", label: "Pancreas", partOfIds: ["UBERON:0001009"] },
]

// GO Cellular Component terms for subcellular localization
const CELLULAR_COMPONENTS = [
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

// Map proteinId -> GO CC id for subcellular localization (used to assign subcellularId to reports)
const PROTEIN_SUBCELLULAR: Record<string, string> = {
  P07766: "GO:0005886", // CD3 epsilon - plasma membrane
  P06139: "GO:0005886", // CD4 - plasma membrane
  P01732: "GO:0005886", // CD8 alpha - plasma membrane
  P11836: "GO:0009986", // CD20 - cell surface
  P06729: "GO:0005886", // CD45 - plasma membrane
  P31996: "GO:0005737", // CD68 - cytoplasm (lysosomal)
  P15391: "GO:0005886", // CD19 - plasma membrane
  Q9BZS1: "GO:0005634", // FoxP3 - nucleus
  Q86VB7: "GO:0005886", // CD163 - plasma membrane
  P46531: "GO:0005886", // PD-1 - plasma membrane
  Q9NZQ7: "GO:0005886", // PD-L1 - plasma membrane
  P04233: "GO:0005886", // HLA-DR alpha - plasma membrane
  P08581: "GO:0005886", // MET - plasma membrane
  P16284: "GO:0009986", // CD31 - cell surface
  P35968: "GO:0005886", // VEGFR2 - plasma membrane
  P49917: "GO:0005634", // Ki67 - nucleus
  P02533: "GO:0005737", // Keratin 14 - cytoplasm
  P05067: "GO:0005886", // E-Cadherin - plasma membrane
  P08670: "GO:0005737", // Vimentin - cytoplasm
  P62736: "GO:0005737", // Alpha-SMA - cytoplasm
  PANCK: "GO:0005737", // Pan-Cytokeratin - cytoplasm
}

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
    conjugate: "AF555",
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
    conjugate: "AF647",
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

const BLOG_POSTS = [
  {
    title: "Designing Your First Spatial Proteomics Panel: A Practical Guide",
    slug: "designing-first-spatial-proteomics-panel",
    excerpt:
      "A step-by-step walkthrough for researchers new to multiplexed tissue imaging, covering marker selection, fluorophore assignment, and common pitfalls to avoid.",
    content: `Spatial proteomics has transformed how we study tissue architecture, but designing your first antibody panel can feel overwhelming. Whether you are working with CODEX, CyCIF, or IMC, the principles of good panel design remain the same.

## Start with your biological question

Before selecting a single antibody, clearly define which cell types and tissue compartments matter for your study. A panel built around a focused hypothesis will always outperform a panel that tries to measure everything at once.

## Choose canonical markers first

Begin with well-validated lineage markers: CD3 for T cells, CD20 for B cells, CD68 for macrophages, PanCK for epithelial cells, and CD31 for endothelium. These anchors let you confidently identify major populations before layering on functional or activation markers.

## Mind the spectral overlap

For fluorescence-based methods, spectral overlap between fluorophores is the single biggest source of artifacts. Assign your brightest fluorophores (e.g., AF488, PE) to low-abundance targets, and use dimmer channels for highly expressed markers. Tools like PanelMaker can flag problematic overlap automatically.

## Validate each antibody independently

Never skip single-plex validation on your target tissue and fixation. An antibody that works beautifully on tonsil FFPE may fail completely on fresh-frozen kidney. Record signal quality, specificity, and optimal dilution for every combination.

## Iterate and share

Panel design is iterative. Share your validated conditions with the community so others can build on your work rather than starting from scratch each time.`,
    published: true,
    publishedAt: new Date("2026-01-15T10:00:00Z"),
    metaTitle: "Designing Your First Spatial Proteomics Panel | PanelMaker",
    metaDescription:
      "A practical guide to designing multiplexed tissue imaging panels, covering marker selection, fluorophore assignment, and antibody validation.",
    keywords: JSON.stringify(["spatial proteomics", "panel design", "CODEX", "CyCIF", "antibody validation"]),
    authorId: "seed_user_lin_jia",
  },
  {
    title: "FFPE vs Fresh-Frozen: How Fixation Shapes Your Panel",
    slug: "ffpe-vs-fresh-frozen-fixation",
    excerpt:
      "Fixation method is one of the most consequential decisions in spatial proteomics. We compare FFPE and fresh-frozen workflows and their impact on antibody performance.",
    content: `The choice between FFPE (formalin-fixed, paraffin-embedded) and fresh-frozen tissue preparation fundamentally affects which antibodies will work in your panel, how much antigen retrieval you need, and ultimately the quality of your data.

## FFPE: the archival workhorse

FFPE tissue is the standard in clinical pathology. Blocks can be stored for decades at room temperature, making retrospective studies possible. However, formalin cross-links proteins extensively, masking epitopes that many antibodies recognize. Antigen retrieval (heat-induced or enzymatic) is almost always required, and not every epitope can be recovered.

### Advantages
- Long-term storage at room temperature
- Excellent morphology preservation
- Compatibility with clinical archives

### Challenges
- Epitope masking requiring antigen retrieval optimization
- Some targets (e.g., certain phospho-proteins) are unreliable
- Autofluorescence from formalin fixation

## Fresh-frozen: maximum antigen preservation

Snap-freezing tissue in OCT preserves native protein conformation. More antibodies work out-of-the-box on frozen sections, and phospho-epitopes are far better preserved. The trade-off is poorer morphology and the need for continuous cold-chain storage.

### Advantages
- Better epitope preservation, especially for phospho-targets
- Lower autofluorescence
- More antibodies validated for frozen tissue

### Challenges
- Requires -80C storage
- Inferior morphological preservation
- Sections are more fragile and prone to freeze-thaw artifacts

## Practical recommendations

If you have access to both tissue types, run a pilot with your critical markers on each fixation. Record results in a structured format (PanelMaker experimental reports work well for this) so your team can reference them later. For clinical cohorts where only FFPE is available, invest extra time in antigen retrieval optimization before concluding that an antibody does not work.`,
    published: true,
    publishedAt: new Date("2026-02-03T14:30:00Z"),
    metaTitle: "FFPE vs Fresh-Frozen Tissue for Spatial Proteomics | PanelMaker",
    metaDescription:
      "Compare FFPE and fresh-frozen fixation methods for multiplexed imaging and learn how fixation choice affects antibody panel performance.",
    keywords: JSON.stringify(["FFPE", "fresh-frozen", "fixation", "antigen retrieval", "tissue preparation"]),
    authorId: "seed_user_hta_user1",
  },
  {
    title: "Cross-Reactivity Pitfalls in Multi-Species Panel Design",
    slug: "cross-reactivity-multi-species-panels",
    excerpt:
      "Using antibodies from multiple host species introduces cross-reactivity risks. Learn how to identify and avoid host-species conflicts in your multiplex panels.",
    content: `One of the most common mistakes in multiplex panel design is ignoring host-species cross-reactivity. When you combine primary antibodies raised in different species with secondary detection systems, unintended binding can produce misleading signals.

## The problem

Suppose your panel includes a rabbit anti-CD3 and a goat anti-CD20, detected with anti-rabbit AF488 and anti-goat AF647 secondaries. If the anti-goat secondary has any cross-reactivity to rabbit IgG, you will see false CD20 signal wherever CD3 is expressed. In a T cell zone, this could look like dual-positive cells that do not actually exist.

## How to avoid it

### Use directly conjugated antibodies when possible

Directly conjugated primaries eliminate the secondary antibody problem entirely. Most major vendors now offer a wide range of conjugated clones for spatial proteomics workflows.

### Check host species before adding to your panel

Before finalizing your panel, list every antibody with its host species and isotype. Flag any pair where a secondary could cross-react. PanelMaker highlights these conflicts automatically in the compatibility checker.

### Use pre-adsorbed secondaries

If you must use secondaries, choose cross-adsorbed versions that have been depleted against IgG from the other host species in your panel. Verify adsorption claims with single-plex controls.

### Sequential staining with stripping

Methods like CyCIF and IBEX use iterative staining and stripping cycles. By separating potentially cross-reactive antibodies into different cycles, you eliminate the possibility of secondary cross-talk.

## Documenting your results

When you validate a multi-species panel, record the host species, isotype, and clone for every antibody alongside your imaging results. This metadata is essential for troubleshooting and for other researchers who want to reproduce your work.`,
    published: true,
    publishedAt: new Date("2026-02-18T09:00:00Z"),
    metaTitle: "Avoiding Cross-Reactivity in Multiplex Antibody Panels | PanelMaker",
    metaDescription:
      "How to identify and prevent host-species cross-reactivity when designing multiplexed spatial proteomics panels.",
    keywords: JSON.stringify([
      "cross-reactivity",
      "host species",
      "secondary antibodies",
      "multiplex",
      "panel compatibility",
    ]),
    authorId: "seed_user_bendall_sean",
  },
  {
    title: "IMC vs CODEX vs CyCIF: Choosing a Multiplexing Platform",
    slug: "imc-vs-codex-vs-cycif-comparison",
    excerpt:
      "An honest comparison of three major spatial proteomics platforms, their strengths, limitations, and the types of studies each is best suited for.",
    content: `Choosing a multiplexing platform is one of the first decisions in any spatial proteomics project. Each technology has genuine strengths, and the best choice depends on your specific biological question, throughput needs, and available infrastructure.

## Imaging Mass Cytometry (IMC)

IMC uses metal-tagged antibodies and laser ablation to achieve up to 40+ markers simultaneously in a single staining round. There is no spectral overlap because each metal isotope occupies a distinct mass channel.

### Best for
- Maximum marker count per section
- Studies where tissue is scarce (one section, one stain)
- Discovery panels where you want broad coverage

### Limitations
- Slow acquisition (a 1 mm2 region can take over an hour)
- Destructive (tissue is ablated)
- Spatial resolution limited to approximately 1 micrometer

## CODEX

CODEX uses DNA-barcoded antibodies with iterative hybridization and imaging cycles. It achieves high-plex (40-60 markers) with standard fluorescence microscopy.

### Best for
- High-throughput tissue microarray studies
- Labs with existing fluorescence microscope infrastructure
- Large cohort studies requiring consistent automation

### Limitations
- Barcode-antibody conjugation can affect antibody performance
- Cycle-to-cycle tissue loss accumulates
- Requires specialized barcoded reagents

## CyCIF (Cyclic Immunofluorescence)

CyCIF uses conventional fluorophore-conjugated antibodies with chemical inactivation between cycles. It is the most accessible method for labs already performing immunofluorescence.

### Best for
- Labs transitioning from standard IF to multiplex
- FFPE tissue from clinical archives
- Flexibility in antibody choice (standard conjugates)

### Limitations
- Fluorophore inactivation is not always complete
- Tissue degradation over many cycles
- Typically 4-6 markers per cycle, 20-30 total

## Making the decision

Consider your marker count requirement, tissue availability, throughput needs, and existing equipment. For most new spatial proteomics labs, starting with CyCIF or CODEX and expanding to IMC for high-plex discovery is a pragmatic path.`,
    published: true,
    publishedAt: new Date("2026-02-27T11:00:00Z"),
    metaTitle: "IMC vs CODEX vs CyCIF: Multiplexing Platform Comparison | PanelMaker",
    metaDescription:
      "Compare Imaging Mass Cytometry, CODEX, and CyCIF for spatial proteomics to choose the best platform for your research.",
    keywords: JSON.stringify(["IMC", "CODEX", "CyCIF", "multiplexing", "spatial proteomics", "platform comparison"]),
    authorId: "seed_user_goltsev_yury",
  },
  {
    title: "Building a Tumor Microenvironment Panel: Marker Selection Strategy",
    slug: "tumor-microenvironment-panel-strategy",
    excerpt:
      "A practical framework for selecting markers that capture immune infiltration, stromal remodeling, and tumor heterogeneity in the tumor microenvironment.",
    content: `The tumor microenvironment (TME) is a complex ecosystem of tumor cells, immune cells, vasculature, and stroma. A well-designed spatial proteomics panel can reveal the spatial relationships between these compartments that bulk methods miss entirely.

## Define your compartments

A comprehensive TME panel should cover four major compartments:

1. **Tumor cells** - PanCK, E-Cadherin, Ki67, and tumor-specific markers (e.g., HER2 for breast, SOX10 for melanoma)
2. **Immune cells** - CD3, CD4, CD8, CD20, CD68, FoxP3, PD-1, PD-L1 for the core immune contexture
3. **Vasculature** - CD31, alpha-SMA for endothelium and pericytes
4. **Stroma** - Vimentin, Collagen I, FAP for fibroblasts and extracellular matrix

## Prioritize functional markers

After lineage markers, add functional readouts that answer your specific question. For immunotherapy response studies, PD-1, PD-L1, LAG-3, and TIM-3 capture checkpoint biology. For proliferation and cell death, Ki67 and cleaved Caspase-3 are essential.

## Think about spatial relationships

The power of spatial proteomics is measuring co-localization and proximity. Design your panel so that interacting cell types carry markers in spectrally distinct channels. For example, if you want to measure PD-1/PD-L1 interactions at the tumor-immune interface, ensure PD-1 (on T cells) and PD-L1 (on tumor/myeloid cells) are in channels with minimal cross-talk.

## Start with a validated core

Rather than building from scratch, start with a validated core panel (like those shared on PanelMaker) and add your study-specific markers. A 15-marker core covering major lineages plus 5-10 custom markers is a proven strategy that balances coverage with feasibility.

## Validate on relevant tissue

Always validate on tissue that matches your study cohort. A panel validated on tonsil (a common positive control) may need re-optimization for the specific tumor type and fixation in your study. Document every validation experiment as a structured report so your future self and collaborators can reference the results.`,
    published: true,
    publishedAt: new Date("2026-03-05T08:00:00Z"),
    metaTitle: "Tumor Microenvironment Panel Design Strategy | PanelMaker",
    metaDescription:
      "A framework for designing spatial proteomics panels that capture immune, stromal, and tumor compartments in the tumor microenvironment.",
    keywords: JSON.stringify([
      "tumor microenvironment",
      "TME",
      "immune profiling",
      "panel design",
      "immunotherapy",
      "spatial biology",
    ]),
    authorId: "seed_user_angelo_mike",
  },
]

async function seedUsers() {
  return Promise.all(
    USERS.map((u) =>
      prisma.user.upsert({
        where: { id: u.id },
        update: { name: u.name, email: u.email, institution: u.institution, institutionId: u.institutionId },
        create: {
          id: u.id,
          name: u.name,
          email: u.email,
          institution: u.institution,
          institutionId: u.institutionId,
        },
      }),
    ),
  )
}

async function seedTaxa() {
  return Promise.all(
    TAXA.map((t) =>
      prisma.taxon.upsert({
        where: { id: t.id },
        update: { label: t.label },
        create: { id: t.id, label: t.label },
      }),
    ),
  )
}

async function seedTissues() {
  return Promise.all(
    TISSUES.map((t) =>
      prisma.tissue.upsert({
        where: { id: t.id },
        update: { label: t.label, partOfIds: JSON.stringify(t.partOfIds) },
        create: { id: t.id, label: t.label, partOfIds: JSON.stringify(t.partOfIds) },
      }),
    ),
  )
}

async function seedCellularComponents() {
  return Promise.all(
    CELLULAR_COMPONENTS.map((c) =>
      prisma.cellularComponent.upsert({
        where: { id: c.id },
        update: { label: c.label, partOfIds: JSON.stringify(c.partOfIds) },
        create: { id: c.id, label: c.label, partOfIds: JSON.stringify(c.partOfIds) },
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
    const hostTaxonId = SOURCE_ORGANISM_TO_TAXON[ab.sourceOrganism] ?? null
    const created = await prisma.antibody.upsert({
      where: { rrid: ab.rrid },
      update: {
        name: ab.name,
        catalogNumber: ab.catalogNumber,
        cloneId: ab.cloneId,
        clonality: ab.clonality,
        hostTaxonId,
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
        hostTaxonId,
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

const FLUOROPHORE_SEED: {
  name: string
  excitation: number
  emission: number
  fpbaseId: string
  aliases: string[]
}[] = [
  { name: "AF405", excitation: 401, emission: 422, fpbaseId: "alexa-fluor-405-default", aliases: ["Alexa Fluor 405"] },
  { name: "AF350", excitation: 343, emission: 441, fpbaseId: "alexa-fluor-350-default", aliases: ["Alexa Fluor 350"] },
  { name: "Hoechst 33342", excitation: 352, emission: 455, fpbaseId: "hoechst-33342-default", aliases: [] },
  { name: "DAPI", excitation: 359, emission: 461, fpbaseId: "dapi-default", aliases: [] },
  { name: "BODIPY FL", excitation: 502, emission: 511, fpbaseId: "bodipy-fl-default", aliases: [] },
  {
    name: "FITC",
    excitation: 498,
    emission: 517,
    fpbaseId: "fluorescein-fitc-default",
    aliases: ["Fluorescein", "Fluorescein isothiocyanate"],
  },
  {
    name: "AF488",
    excitation: 499,
    emission: 520,
    fpbaseId: "alexa-fluor-488-default",
    aliases: ["Alexa Fluor 488", "Alexa 488"],
  },
  { name: "ATTO 488", excitation: 500, emission: 520, fpbaseId: "atto-488-default", aliases: [] },
  { name: "AF532", excitation: 534, emission: 553, fpbaseId: "alexa-fluor-532-default", aliases: ["Alexa Fluor 532"] },
  { name: "Cy3", excitation: 554, emission: 566, fpbaseId: "cy3-default", aliases: [] },
  {
    name: "AF555",
    excitation: 553,
    emission: 568,
    fpbaseId: "alexa-fluor-555-default",
    aliases: ["Alexa Fluor 555", "Alexa 555"],
  },
  { name: "AF546", excitation: 561, emission: 572, fpbaseId: "alexa-fluor-546-default", aliases: ["Alexa Fluor 546"] },
  { name: "ATTO 550", excitation: 554, emission: 576, fpbaseId: "atto-550-default", aliases: [] },
  {
    name: "JF549",
    excitation: 557,
    emission: 576,
    fpbaseId: "janelia-fluor-jf549-halotag-conjugate-default",
    aliases: ["Janelia Fluor 549"],
  },
  {
    name: "TRITC",
    excitation: 552,
    emission: 578,
    fpbaseId: "tetramethylrhodamine-tamra-tritc-default",
    aliases: ["TAMRA", "Tetramethylrhodamine"],
  },
  { name: "Cy3.5", excitation: 576, emission: 589, fpbaseId: "cy35-default", aliases: ["Cyanine 3.5"] },
  { name: "ATTO 565", excitation: 564, emission: 590, fpbaseId: "atto-565-default", aliases: [] },
  { name: "AF568", excitation: 579, emission: 603, fpbaseId: "alexa-fluor-568-default", aliases: ["Alexa Fluor 568"] },
  { name: "Texas Red", excitation: 595, emission: 613, fpbaseId: "texas-red-default", aliases: [] },
  {
    name: "AF594",
    excitation: 590,
    emission: 618,
    fpbaseId: "alexa-fluor-594-default",
    aliases: ["Alexa Fluor 594", "Alexa 594"],
  },
  { name: "ATTO 590", excitation: 593, emission: 622, fpbaseId: "atto-590-default", aliases: [] },
  { name: "AF633", excitation: 631, emission: 650, fpbaseId: "alexa-fluor-633-default", aliases: ["Alexa Fluor 633"] },
  { name: "Cy5", excitation: 644, emission: 662, fpbaseId: "cy5-default", aliases: [] },
  { name: "ATTO 647N", excitation: 646, emission: 664, fpbaseId: "atto-647n-default", aliases: [] },
  {
    name: "JF646",
    excitation: 654,
    emission: 667,
    fpbaseId: "janelia-fluor-jf646-halotag-conjugate-default",
    aliases: ["Janelia Fluor 646"],
  },
  {
    name: "AF647",
    excitation: 650,
    emission: 671,
    fpbaseId: "alexa-fluor-647-default",
    aliases: ["Alexa Fluor 647", "Alexa 647"],
  },
  { name: "AF660", excitation: 663, emission: 691, fpbaseId: "alexa-fluor-660-default", aliases: ["Alexa Fluor 660"] },
  { name: "ATTO 680", excitation: 681, emission: 698, fpbaseId: "atto-680-default", aliases: [] },
  { name: "AF680", excitation: 681, emission: 704, fpbaseId: "alexa-fluor-680-default", aliases: ["Alexa Fluor 680"] },
  { name: "AF700", excitation: 696, emission: 719, fpbaseId: "alexa-fluor-700-default", aliases: ["Alexa Fluor 700"] },
  { name: "Cy7", excitation: 749, emission: 775, fpbaseId: "cy7-default", aliases: [] },
  { name: "AF750", excitation: 752, emission: 776, fpbaseId: "alexa-fluor-750-default", aliases: ["Alexa Fluor 750"] },
  { name: "AF790", excitation: 782, emission: 805, fpbaseId: "alexa-fluor-790-default", aliases: ["Alexa Fluor 790"] },
]

let fluorophoreIdMap: Record<string, string> = {}

function fluId(name?: string | null): string | undefined {
  if (!name) return undefined
  const id = fluorophoreIdMap[name]
  if (!id) throw new Error(`Seed references unknown fluorophore: ${name}`)
  return id
}

function markerSeed<T extends { fluorophore?: string }>(rows: T[]) {
  return rows.map(({ fluorophore, ...rest }) => ({ ...rest, fluorophoreId: fluId(fluorophore) }))
}

async function seedFluorophores() {
  const created = await prisma.fluorophore.createManyAndReturn({ data: FLUOROPHORE_SEED })
  fluorophoreIdMap = Object.fromEntries(created.map((f) => [f.name, f.id]))
  return created.length
}

// Maps tissueType string to a seeded UBERON Tissue id.
// Reports that had a structureId already had the canonical UBERON id; those without
// need to be looked up from the free-text tissueType string.
const TISSUE_TYPE_TO_UBERON: Record<string, string> = {
  "Spleen": "UBERON:0002106",
  "Thymus": "UBERON:0002370",
  "Colon": "UBERON:0000160",
  "Colon tumor": "UBERON:0000160",
  "Intestine": "UBERON:0000160",
  "Lung": "UBERON:0002048",
  "Lung tumor": "UBERON:0002048",
  "Liver": "UBERON:0002107",
  "Kidney": "UBERON:0002113",
  "Lymph node": "UBERON:0000082",
  "Breast tumor": "UBERON:0000310",
  "Breast": "UBERON:0000310",
  "Tonsil": "UBERON:0001723",
  "Pancreas": "UBERON:0001264",
}

type ReportInput = {
  antibodyRrid: string
  // Primary cell type; omit entirely for general QC / ubiquitous / extracellular markers
  // that are not tied to a single cell identity. Additional cell types go in extraCellTypeIds.
  cellTypeId?: string
  extraCellTypeIds?: string[]
  // Old structureId was UBERON; now use tissueType string resolved via TISSUE_TYPE_TO_UBERON
  tissueType: string
  // Old species enum value -> Taxon id mapping done in the loop
  species: "HUMAN" | "MOUSE"
  // targetProteinId drives subcellularId assignment
  targetProteinId?: string
  fixation: "FFPE" | "FRESH_FROZEN" | "PFA" | "METHANOL"
  method: "PATHOPLEX" | "CODEX" | "CYCIF" | "IMC" | "MIBI" | "IBEX" | "OTHER"
  fluorophore?: string
  metalTag?: string
  dilution: string
  antigenRetrieval?: "CITRATE_PH6" | "TRIS_EDTA_PH9" | "ENZYMATIC" | "NONE"
  incubation?: string
  status: "PUBLISHED" | "PENDING" | "REJECTED"
  works: boolean
  signalQuality: "EXCELLENT" | "GOOD" | "MODERATE" | "POOR"
  specificity: "HIGH" | "MODERATE" | "LOW"
  submitterId: string
  notes?: string
}

const SPECIES_TO_TAXON: Record<string, string> = {
  HUMAN: "NCBI:txid9606",
  MOUSE: "NCBI:txid10090",
}

async function seedExperimentalReports(antibodyMap: Record<string, string>) {
  const reports: ReportInput[] = [
    // --- Sean Bendall (heavy contributor, CODEX specialist) ---
    {
      antibodyRrid: "RRID:AB_314056",
      cellTypeId: "CL:0000084",
      tissueType: "Spleen",
      species: "HUMAN",
      targetProteinId: "P07766",
      fixation: "FFPE",
      method: "CODEX",
      fluorophore: "Cy3",
      dilution: "1:200",
      antigenRetrieval: "TRIS_EDTA_PH9",
      incubation: "Overnight 4°C",
      status: "PUBLISHED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_bendall_sean",
      notes: "Excellent staining in periarteriolar lymphoid sheath",
    },
    {
      antibodyRrid: "RRID:AB_395943",
      cellTypeId: "CL:0000624",
      extraCellTypeIds: ["CL:0000084"],
      tissueType: "Spleen",
      species: "HUMAN",
      targetProteinId: "P06139",
      fixation: "FFPE",
      method: "CODEX",
      fluorophore: "AF488",
      dilution: "1:200",
      antigenRetrieval: "TRIS_EDTA_PH9",
      status: "PUBLISHED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_bendall_sean",
    },
    {
      antibodyRrid: "RRID:AB_314126",
      cellTypeId: "CL:0000625",
      extraCellTypeIds: ["CL:0000084"],
      tissueType: "Spleen",
      species: "HUMAN",
      targetProteinId: "P01732",
      fixation: "FFPE",
      method: "CODEX",
      fluorophore: "AF647",
      dilution: "1:200",
      antigenRetrieval: "TRIS_EDTA_PH9",
      status: "PUBLISHED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_bendall_sean",
    },
    {
      antibodyRrid: "RRID:AB_927185",
      cellTypeId: "CL:0000235",
      tissueType: "Spleen",
      species: "HUMAN",
      targetProteinId: "P31996",
      fixation: "FFPE",
      method: "CODEX",
      fluorophore: "AF555",
      dilution: "1:100",
      antigenRetrieval: "CITRATE_PH6",
      status: "PUBLISHED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_bendall_sean",
    },
    {
      antibodyRrid: "RRID:AB_2074650",
      cellTypeId: "CL:0000988",
      tissueType: "Spleen",
      species: "HUMAN",
      targetProteinId: "P06729",
      fixation: "FFPE",
      method: "CODEX",
      fluorophore: "Cy5",
      dilution: "1:100",
      antigenRetrieval: "TRIS_EDTA_PH9",
      status: "PUBLISHED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_bendall_sean",
    },
    {
      antibodyRrid: "RRID:AB_2892867",
      cellTypeId: "CL:0000576",
      extraCellTypeIds: ["CL:0000988"],
      tissueType: "Spleen",
      species: "HUMAN",
      targetProteinId: "P06729",
      fixation: "FFPE",
      method: "CODEX",
      fluorophore: "AF750",
      dilution: "1:100",
      antigenRetrieval: "TRIS_EDTA_PH9",
      status: "PUBLISHED",
      works: true,
      signalQuality: "GOOD",
      specificity: "HIGH",
      submitterId: "seed_user_bendall_sean",
    },
    {
      antibodyRrid: "RRID:AB_2864622",
      cellTypeId: "CL:0000066",
      tissueType: "Colon",
      species: "HUMAN",
      targetProteinId: "P49917",
      fixation: "FFPE",
      method: "CODEX",
      fluorophore: "AF488",
      dilution: "1:200",
      antigenRetrieval: "TRIS_EDTA_PH9",
      status: "PUBLISHED",
      works: true,
      signalQuality: "GOOD",
      specificity: "HIGH",
      submitterId: "seed_user_bendall_sean",
    },
    {
      antibodyRrid: "RRID:AB_2860866",
      cellTypeId: "CL:0000451",
      extraCellTypeIds: ["CL:0000235"],
      tissueType: "Spleen",
      species: "HUMAN",
      targetProteinId: "P04233",
      fixation: "FFPE",
      method: "CODEX",
      fluorophore: "Cy3",
      dilution: "1:100",
      antigenRetrieval: "TRIS_EDTA_PH9",
      status: "PUBLISHED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_bendall_sean",
    },

    // --- Michael Angelo (MIBI specialist) ---
    {
      antibodyRrid: "RRID:AB_927185",
      cellTypeId: "CL:0000235",
      tissueType: "Breast tumor",
      species: "HUMAN",
      targetProteinId: "P31996",
      fixation: "FFPE",
      method: "MIBI",
      metalTag: "89Y",
      dilution: "1:100",
      incubation: "Overnight 4°C",
      status: "PUBLISHED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_angelo_mike",
      notes: "Validated for MIBI-TOF on FFPE breast cancer sections",
    },
    {
      antibodyRrid: "RRID:AB_314056",
      cellTypeId: "CL:0000084",
      tissueType: "Breast tumor",
      species: "HUMAN",
      targetProteinId: "P07766",
      fixation: "FFPE",
      method: "MIBI",
      metalTag: "141Pr",
      dilution: "1:200",
      status: "PUBLISHED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_angelo_mike",
    },
    {
      antibodyRrid: "RRID:AB_2756012",
      cellTypeId: "CL:0000066",
      tissueType: "Breast tumor",
      species: "HUMAN",
      targetProteinId: "PANCK",
      fixation: "FFPE",
      method: "MIBI",
      metalTag: "115In",
      dilution: "1:500",
      status: "PUBLISHED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_angelo_mike",
    },
    {
      antibodyRrid: "RRID:AB_2891175",
      cellTypeId: "CL:0000057",
      tissueType: "Breast tumor",
      species: "HUMAN",
      targetProteinId: "P08670",
      fixation: "FFPE",
      method: "MIBI",
      metalTag: "174Yb",
      dilution: "1:200",
      status: "PUBLISHED",
      works: true,
      signalQuality: "GOOD",
      specificity: "HIGH",
      submitterId: "seed_user_angelo_mike",
    },
    {
      antibodyRrid: "RRID:AB_2223500",
      cellTypeId: "CL:0000057",
      extraCellTypeIds: ["CL:0000115"],
      tissueType: "Breast tumor",
      species: "HUMAN",
      targetProteinId: "P62736",
      fixation: "FFPE",
      method: "MIBI",
      metalTag: "145Nd",
      dilution: "1:500",
      status: "PUBLISHED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_angelo_mike",
    },
    {
      antibodyRrid: "RRID:AB_395943",
      cellTypeId: "CL:0000624",
      extraCellTypeIds: ["CL:0000084"],
      tissueType: "Lung tumor",
      species: "HUMAN",
      targetProteinId: "P06139",
      fixation: "FFPE",
      method: "MIBI",
      metalTag: "143Nd",
      dilution: "1:200",
      status: "PUBLISHED",
      works: true,
      signalQuality: "GOOD",
      specificity: "HIGH",
      submitterId: "seed_user_angelo_mike",
    },

    // --- Jia-Ren Lin / Harvard (CyCIF specialist, very prolific) ---
    {
      antibodyRrid: "RRID:AB_10643421",
      cellTypeId: "CL:0000624",
      tissueType: "Thymus",
      species: "HUMAN",
      targetProteinId: "P06139",
      fixation: "FFPE",
      method: "CYCIF",
      fluorophore: "AF488",
      dilution: "1:200",
      antigenRetrieval: "TRIS_EDTA_PH9",
      incubation: "Overnight 4°C",
      status: "PUBLISHED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_lin_jia",
    },
    {
      antibodyRrid: "RRID:AB_443426",
      cellTypeId: "CL:0000625",
      tissueType: "Thymus",
      species: "HUMAN",
      targetProteinId: "P01732",
      fixation: "FFPE",
      method: "CYCIF",
      fluorophore: "AF555",
      dilution: "1:200",
      antigenRetrieval: "TRIS_EDTA_PH9",
      status: "PUBLISHED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_lin_jia",
    },
    {
      antibodyRrid: "RRID:AB_2074649",
      cellTypeId: "CL:0000236",
      tissueType: "Thymus",
      species: "HUMAN",
      targetProteinId: "P11836",
      fixation: "FFPE",
      method: "CYCIF",
      fluorophore: "AF647",
      dilution: "1:100",
      antigenRetrieval: "TRIS_EDTA_PH9",
      status: "PUBLISHED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_lin_jia",
    },
    {
      antibodyRrid: "RRID:AB_2810957",
      cellTypeId: "CL:0000066",
      tissueType: "Colon",
      species: "HUMAN",
      targetProteinId: "P05067",
      fixation: "FFPE",
      method: "CYCIF",
      fluorophore: "AF488",
      dilution: "1:400",
      antigenRetrieval: "CITRATE_PH6",
      status: "PUBLISHED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_lin_jia",
    },
    {
      antibodyRrid: "RRID:AB_2891175",
      cellTypeId: "CL:0000057",
      tissueType: "Colon",
      species: "HUMAN",
      targetProteinId: "P08670",
      fixation: "FFPE",
      method: "CYCIF",
      fluorophore: "AF555",
      dilution: "1:200",
      antigenRetrieval: "CITRATE_PH6",
      status: "PUBLISHED",
      works: true,
      signalQuality: "GOOD",
      specificity: "HIGH",
      submitterId: "seed_user_lin_jia",
    },
    {
      antibodyRrid: "RRID:AB_2810960",
      cellTypeId: "CL:0000066",
      extraCellTypeIds: ["CL:0000235"],
      tissueType: "Colon",
      species: "HUMAN",
      targetProteinId: "Q9NZQ7",
      fixation: "FFPE",
      method: "CYCIF",
      fluorophore: "AF647",
      dilution: "1:200",
      antigenRetrieval: "TRIS_EDTA_PH9",
      status: "PUBLISHED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_lin_jia",
      notes: "PD-L1 on tumor cells, clear membrane staining",
    },
    {
      antibodyRrid: "RRID:AB_2716564",
      cellTypeId: "CL:0000625",
      tissueType: "Lung tumor",
      species: "HUMAN",
      targetProteinId: "P46531",
      fixation: "FFPE",
      method: "CYCIF",
      fluorophore: "AF488",
      dilution: "1:200",
      antigenRetrieval: "TRIS_EDTA_PH9",
      status: "PUBLISHED",
      works: true,
      signalQuality: "GOOD",
      specificity: "MODERATE",
      submitterId: "seed_user_lin_jia",
      notes: "Some background in germinal centers",
    },
    {
      antibodyRrid: "RRID:AB_302459",
      cellTypeId: "CL:0000066",
      tissueType: "Colon tumor",
      species: "HUMAN",
      targetProteinId: "P49917",
      fixation: "FFPE",
      method: "CYCIF",
      fluorophore: "AF555",
      dilution: "1:400",
      antigenRetrieval: "TRIS_EDTA_PH9",
      status: "PUBLISHED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_lin_jia",
    },
    {
      antibodyRrid: "RRID:AB_2924631",
      cellTypeId: "CL:0000115",
      tissueType: "Colon",
      species: "HUMAN",
      targetProteinId: "P16284",
      fixation: "FFPE",
      method: "CYCIF",
      fluorophore: "AF647",
      dilution: "1:100",
      antigenRetrieval: "CITRATE_PH6",
      status: "PUBLISHED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_lin_jia",
    },

    // --- Yury Goltsev (CODEX, mouse tissues) ---
    {
      antibodyRrid: "RRID:AB_314056",
      cellTypeId: "CL:0000084",
      tissueType: "Thymus",
      species: "MOUSE",
      targetProteinId: "P07766",
      fixation: "PFA",
      method: "CODEX",
      fluorophore: "Cy3",
      dilution: "1:200",
      status: "PUBLISHED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_goltsev_yury",
      notes: "Cross-reacts with mouse CD3e",
    },
    {
      antibodyRrid: "RRID:AB_395943",
      cellTypeId: "CL:0000624",
      tissueType: "Thymus",
      species: "MOUSE",
      targetProteinId: "P06139",
      fixation: "PFA",
      method: "CODEX",
      fluorophore: "AF488",
      dilution: "1:200",
      status: "PUBLISHED",
      works: true,
      signalQuality: "GOOD",
      specificity: "HIGH",
      submitterId: "seed_user_goltsev_yury",
    },
    {
      antibodyRrid: "RRID:AB_2650493",
      cellTypeId: "CL:0000815",
      tissueType: "Thymus",
      species: "MOUSE",
      targetProteinId: "Q9BZS1",
      fixation: "PFA",
      method: "CODEX",
      fluorophore: "AF647",
      dilution: "1:100",
      antigenRetrieval: "CITRATE_PH6",
      status: "PUBLISHED",
      works: true,
      signalQuality: "GOOD",
      specificity: "HIGH",
      submitterId: "seed_user_goltsev_yury",
    },
    {
      antibodyRrid: "RRID:AB_2864622",
      cellTypeId: "CL:0000988",
      tissueType: "Spleen",
      species: "MOUSE",
      targetProteinId: "P49917",
      fixation: "PFA",
      method: "CODEX",
      fluorophore: "AF555",
      dilution: "1:200",
      status: "PUBLISHED",
      works: true,
      signalQuality: "GOOD",
      specificity: "HIGH",
      submitterId: "seed_user_goltsev_yury",
    },

    // --- Sandro Santagata (IMC, tumor microenvironment) ---
    {
      antibodyRrid: "RRID:AB_2223500",
      cellTypeId: "CL:0000057",
      tissueType: "Lung",
      species: "HUMAN",
      targetProteinId: "P62736",
      fixation: "FFPE",
      method: "IMC",
      metalTag: "145Nd",
      dilution: "1:500",
      incubation: "Overnight 4°C",
      status: "PUBLISHED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_hta_user1",
    },
    {
      antibodyRrid: "RRID:AB_927185",
      cellTypeId: "CL:0000235",
      tissueType: "Lung tumor",
      species: "HUMAN",
      targetProteinId: "P31996",
      fixation: "FFPE",
      method: "IMC",
      metalTag: "89Y",
      dilution: "1:100",
      status: "PUBLISHED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_hta_user1",
    },
    {
      antibodyRrid: "RRID:AB_2756012",
      cellTypeId: "CL:0000066",
      tissueType: "Lung tumor",
      species: "HUMAN",
      targetProteinId: "PANCK",
      fixation: "FFPE",
      method: "IMC",
      metalTag: "115In",
      dilution: "1:500",
      status: "PUBLISHED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_hta_user1",
    },
    {
      antibodyRrid: "RRID:AB_2860866",
      cellTypeId: "CL:0000451",
      extraCellTypeIds: ["CL:0000235"],
      tissueType: "Lung tumor",
      species: "HUMAN",
      targetProteinId: "P04233",
      fixation: "FFPE",
      method: "IMC",
      metalTag: "159Tb",
      dilution: "1:100",
      status: "PUBLISHED",
      works: true,
      signalQuality: "GOOD",
      specificity: "HIGH",
      submitterId: "seed_user_hta_user1",
    },
    {
      antibodyRrid: "RRID:AB_2716564",
      cellTypeId: "CL:0000625",
      extraCellTypeIds: ["CL:0000084"],
      tissueType: "Lung tumor",
      species: "HUMAN",
      targetProteinId: "P46531",
      fixation: "FFPE",
      method: "IMC",
      metalTag: "168Er",
      dilution: "1:200",
      status: "PUBLISHED",
      works: true,
      signalQuality: "GOOD",
      specificity: "MODERATE",
      submitterId: "seed_user_hta_user1",
    },

    // --- Matthew Krummel (UCSF, IF and fresh frozen) ---
    {
      antibodyRrid: "RRID:AB_314056",
      cellTypeId: "CL:0000084",
      tissueType: "Lymph node",
      species: "HUMAN",
      targetProteinId: "P07766",
      fixation: "FRESH_FROZEN",
      method: "OTHER",
      fluorophore: "AF647",
      dilution: "1:100",
      status: "PUBLISHED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_krummel_matt",
    },
    {
      antibodyRrid: "RRID:AB_2650493",
      cellTypeId: "CL:0000815",
      extraCellTypeIds: ["CL:0000624"],
      tissueType: "Lymph node",
      species: "HUMAN",
      targetProteinId: "Q9BZS1",
      fixation: "FRESH_FROZEN",
      method: "OTHER",
      fluorophore: "AF488",
      dilution: "1:50",
      status: "PUBLISHED",
      works: true,
      signalQuality: "GOOD",
      specificity: "HIGH",
      submitterId: "seed_user_krummel_matt",
    },
    {
      antibodyRrid: "RRID:AB_1236477",
      cellTypeId: "CL:0000815",
      tissueType: "Tonsil",
      species: "HUMAN",
      targetProteinId: "Q9BZS1",
      fixation: "FFPE",
      method: "OTHER",
      fluorophore: "AF555",
      dilution: "1:100",
      antigenRetrieval: "CITRATE_PH6",
      status: "PUBLISHED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_krummel_matt",
    },
    {
      antibodyRrid: "RRID:AB_2716564",
      cellTypeId: "CL:0000625",
      tissueType: "Tonsil",
      species: "HUMAN",
      targetProteinId: "P46531",
      fixation: "FFPE",
      method: "OTHER",
      fluorophore: "AF647",
      dilution: "1:200",
      antigenRetrieval: "TRIS_EDTA_PH9",
      status: "PUBLISHED",
      works: true,
      signalQuality: "GOOD",
      specificity: "MODERATE",
      submitterId: "seed_user_krummel_matt",
      notes: "Some cross-reactivity with germinal center B cells at this dilution",
    },
    {
      antibodyRrid: "RRID:AB_2810960",
      cellTypeId: "CL:0000066",
      tissueType: "Tonsil",
      species: "HUMAN",
      targetProteinId: "Q9NZQ7",
      fixation: "FFPE",
      method: "OTHER",
      fluorophore: "AF488",
      dilution: "1:400",
      antigenRetrieval: "TRIS_EDTA_PH9",
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
      tissueType: "Liver",
      species: "HUMAN",
      targetProteinId: "P31996",
      fixation: "FFPE",
      method: "CODEX",
      fluorophore: "Cy3",
      dilution: "1:100",
      antigenRetrieval: "CITRATE_PH6",
      status: "PUBLISHED",
      works: true,
      signalQuality: "GOOD",
      specificity: "HIGH",
      submitterId: "seed_user_broad_user1",
    },
    {
      antibodyRrid: "RRID:AB_2924631",
      cellTypeId: "CL:0000115",
      tissueType: "Liver",
      species: "HUMAN",
      targetProteinId: "P16284",
      fixation: "FFPE",
      method: "CODEX",
      fluorophore: "AF488",
      dilution: "1:100",
      antigenRetrieval: "CITRATE_PH6",
      status: "PUBLISHED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_broad_user1",
    },
    {
      antibodyRrid: "RRID:AB_443427",
      cellTypeId: "CL:0000235",
      tissueType: "Liver",
      species: "HUMAN",
      targetProteinId: "P31996",
      fixation: "FFPE",
      method: "CODEX",
      fluorophore: "AF647",
      dilution: "1:200",
      antigenRetrieval: "CITRATE_PH6",
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
      tissueType: "Lymph node",
      species: "HUMAN",
      targetProteinId: "P07766",
      fixation: "FFPE",
      method: "OTHER",
      dilution: "1:100",
      antigenRetrieval: "CITRATE_PH6",
      status: "PUBLISHED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_yale_user1",
    },
    {
      antibodyRrid: "RRID:AB_2832070",
      cellTypeId: "CL:0000235",
      tissueType: "Lymph node",
      species: "HUMAN",
      targetProteinId: "Q86VB7",
      fixation: "FFPE",
      method: "OTHER",
      dilution: "1:200",
      antigenRetrieval: "TRIS_EDTA_PH9",
      status: "PUBLISHED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_yale_user1",
    },

    // --- MSK user (single submission with negative result) ---
    {
      antibodyRrid: "RRID:AB_302459",
      cellTypeId: "CL:0000057",
      tissueType: "Pancreas",
      species: "HUMAN",
      targetProteinId: "P49917",
      fixation: "METHANOL",
      method: "OTHER",
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
      tissueType: "Spleen",
      species: "MOUSE",
      targetProteinId: "P07766",
      fixation: "PFA",
      method: "OTHER",
      fluorophore: "AF647",
      dilution: "1:200",
      status: "PUBLISHED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_weill_user1",
    },
    {
      antibodyRrid: "RRID:AB_1236477",
      cellTypeId: "CL:0000815",
      tissueType: "Spleen",
      species: "MOUSE",
      targetProteinId: "Q9BZS1",
      fixation: "PFA",
      method: "OTHER",
      fluorophore: "AF488",
      dilution: "1:100",
      status: "PUBLISHED",
      works: true,
      signalQuality: "GOOD",
      specificity: "HIGH",
      submitterId: "seed_user_weill_user1",
    },
    {
      antibodyRrid: "RRID:AB_395943",
      cellTypeId: "CL:0000624",
      tissueType: "Spleen",
      species: "MOUSE",
      targetProteinId: "P06139",
      fixation: "PFA",
      method: "OTHER",
      fluorophore: "AF555",
      dilution: "1:200",
      status: "PUBLISHED",
      works: true,
      signalQuality: "GOOD",
      specificity: "HIGH",
      submitterId: "seed_user_weill_user1",
    },

    // --- Victor Puelles (Complex Tissue Lab, kidney specialist, CODEX) ---
    {
      antibodyRrid: "RRID:AB_314056",
      cellTypeId: "CL:0000084",
      tissueType: "Kidney",
      species: "HUMAN",
      targetProteinId: "P07766",
      fixation: "FFPE",
      method: "CODEX",
      fluorophore: "FITC",
      dilution: "1:200",
      antigenRetrieval: "TRIS_EDTA_PH9",
      status: "PUBLISHED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_puelles_victor",
    },
    {
      antibodyRrid: "RRID:AB_443425",
      cellTypeId: "CL:0000624",
      extraCellTypeIds: ["CL:0000084"],
      tissueType: "Kidney",
      species: "HUMAN",
      targetProteinId: "P07766",
      fixation: "FFPE",
      method: "CODEX",
      fluorophore: "AF555",
      dilution: "1:100",
      antigenRetrieval: "TRIS_EDTA_PH9",
      status: "PUBLISHED",
      works: true,
      signalQuality: "GOOD",
      specificity: "HIGH",
      submitterId: "seed_user_puelles_victor",
    },
    {
      antibodyRrid: "RRID:AB_395943",
      cellTypeId: "CL:0000625",
      extraCellTypeIds: ["CL:0000084"],
      tissueType: "Kidney",
      species: "HUMAN",
      targetProteinId: "P06139",
      fixation: "FFPE",
      method: "CODEX",
      fluorophore: "AF647",
      dilution: "1:100",
      antigenRetrieval: "TRIS_EDTA_PH9",
      status: "PUBLISHED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_puelles_victor",
    },
    {
      antibodyRrid: "RRID:AB_927185",
      cellTypeId: "CL:0000066",
      tissueType: "Kidney",
      species: "HUMAN",
      targetProteinId: "P31996",
      fixation: "FFPE",
      method: "CODEX",
      fluorophore: "AF405",
      dilution: "1:200",
      antigenRetrieval: "CITRATE_PH6",
      status: "PUBLISHED",
      works: true,
      signalQuality: "GOOD",
      specificity: "HIGH",
      submitterId: "seed_user_puelles_victor",
    },
    {
      antibodyRrid: "RRID:AB_314126",
      cellTypeId: "CL:0000576",
      tissueType: "Kidney",
      species: "HUMAN",
      targetProteinId: "P01732",
      fixation: "FFPE",
      method: "CODEX",
      fluorophore: "AF647",
      dilution: "1:150",
      antigenRetrieval: "TRIS_EDTA_PH9",
      status: "PUBLISHED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_puelles_victor",
    },
    {
      antibodyRrid: "RRID:AB_563543",
      cellTypeId: "CL:0000235",
      tissueType: "Kidney",
      species: "HUMAN",
      targetProteinId: "P15391",
      fixation: "FFPE",
      method: "CODEX",
      fluorophore: "AF750",
      dilution: "1:100",
      antigenRetrieval: "TRIS_EDTA_PH9",
      status: "PUBLISHED",
      works: true,
      signalQuality: "GOOD",
      specificity: "MODERATE",
      submitterId: "seed_user_puelles_victor",
    },
    {
      antibodyRrid: "RRID:AB_2074649",
      cellTypeId: "CL:0000115",
      tissueType: "Kidney",
      species: "HUMAN",
      targetProteinId: "P11836",
      fixation: "FFPE",
      method: "CODEX",
      fluorophore: "AF488",
      dilution: "1:200",
      antigenRetrieval: "CITRATE_PH6",
      status: "PUBLISHED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_puelles_victor",
    },
    // --- Puelles lab mouse tissue validations (power the lab-scoped AI killer query) ---
    {
      antibodyRrid: "RRID:AB_314056",
      cellTypeId: "CL:0000084",
      tissueType: "Spleen",
      species: "MOUSE",
      targetProteinId: "P07766",
      fixation: "FFPE",
      method: "CODEX",
      fluorophore: "FITC",
      dilution: "1:200",
      antigenRetrieval: "TRIS_EDTA_PH9",
      status: "PUBLISHED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_puelles_victor",
      notes: "Clean membranous T cell staining on mouse spleen, validated for CODEX panels.",
    },
    {
      antibodyRrid: "RRID:AB_314126",
      cellTypeId: "CL:0000625",
      extraCellTypeIds: ["CL:0000084"],
      tissueType: "Spleen",
      species: "MOUSE",
      targetProteinId: "P01732",
      fixation: "FFPE",
      method: "CODEX",
      fluorophore: "AF647",
      dilution: "1:150",
      antigenRetrieval: "TRIS_EDTA_PH9",
      status: "PUBLISHED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_puelles_member",
      notes: "CD8 cytotoxic T cells clearly resolved in mouse spleen white pulp.",
    },
    {
      antibodyRrid: "RRID:AB_395943",
      cellTypeId: "CL:0000624",
      extraCellTypeIds: ["CL:0000084"],
      tissueType: "Kidney",
      species: "MOUSE",
      targetProteinId: "P06139",
      fixation: "FFPE",
      method: "CODEX",
      fluorophore: "AF555",
      dilution: "1:100",
      antigenRetrieval: "TRIS_EDTA_PH9",
      status: "PUBLISHED",
      works: true,
      signalQuality: "GOOD",
      specificity: "HIGH",
      submitterId: "seed_user_puelles_member",
      notes: "CD4 helper T cells in mouse kidney interstitium, used in nephritis models.",
    },
    // --- General QC / ubiquitous / structural markers with NO cell type assignment ---
    {
      antibodyRrid: "RRID:AB_2864622",
      tissueType: "Tonsil",
      species: "HUMAN",
      targetProteinId: "P49917",
      fixation: "FFPE",
      method: "CYCIF",
      fluorophore: "AF555",
      dilution: "1:500",
      antigenRetrieval: "TRIS_EDTA_PH9",
      status: "PUBLISHED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_lin_jia",
      notes:
        "Proliferation marker. Nuclear signal across many proliferating cell types, not tied to a single identity.",
    },
    {
      antibodyRrid: "RRID:AB_2891175",
      tissueType: "Kidney",
      species: "HUMAN",
      targetProteinId: "P08670",
      fixation: "FFPE",
      method: "CODEX",
      fluorophore: "Cy5",
      dilution: "1:300",
      antigenRetrieval: "CITRATE_PH6",
      status: "PUBLISHED",
      works: true,
      signalQuality: "GOOD",
      specificity: "MODERATE",
      submitterId: "seed_user_puelles_victor",
      notes: "Broad mesenchymal and stromal marker used for tissue architecture QC rather than a specific cell type.",
    },
    {
      antibodyRrid: "RRID:AB_2223500",
      tissueType: "Lung",
      species: "HUMAN",
      targetProteinId: "P62736",
      fixation: "FFPE",
      method: "IMC",
      metalTag: "141Pr",
      dilution: "1:100",
      antigenRetrieval: "TRIS_EDTA_PH9",
      status: "PUBLISHED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_angelo_mike",
      notes: "Smooth muscle and perivascular/stromal structural stain; not assigned to a single cell identity.",
    },
    {
      antibodyRrid: "RRID:AB_2756012",
      tissueType: "Intestine",
      species: "HUMAN",
      targetProteinId: "PANCK",
      fixation: "FFPE",
      method: "CODEX",
      fluorophore: "AF488",
      dilution: "1:200",
      antigenRetrieval: "CITRATE_PH6",
      status: "PUBLISHED",
      works: true,
      signalQuality: "EXCELLENT",
      specificity: "HIGH",
      submitterId: "seed_user_goltsev_yury",
      notes: "Pan-epithelial structural marker used to delineate epithelium; spans many epithelial cell types.",
    },
    {
      antibodyRrid: "RRID:AB_2810957",
      tissueType: "Breast",
      species: "HUMAN",
      targetProteinId: "P05067",
      fixation: "FFPE",
      method: "CYCIF",
      fluorophore: "AF647",
      dilution: "1:250",
      antigenRetrieval: "TRIS_EDTA_PH9",
      status: "PENDING",
      works: true,
      signalQuality: "GOOD",
      specificity: "MODERATE",
      submitterId: "seed_user_krummel_matt",
      notes: "Epithelial adherens-junction marker; broad epithelial coverage, no single cell type assigned.",
    },
  ]

  // Group reports that share an experiment context (same submitter + species + tissue +
  // fixation + method + antigen retrieval) into a single Experiment, then create each
  // report as a child staining record.
  type Grouped = { context: ReportInput; members: { r: ReportInput; index: number }[] }
  const groups = new Map<string, Grouped>()
  for (let i = 0; i < reports.length; i++) {
    const r = reports[i]
    const key = [r.submitterId, r.species, r.tissueType, r.fixation, r.method, r.antigenRetrieval ?? "NONE"].join("|")
    if (!groups.has(key)) groups.set(key, { context: r, members: [] })
    groups.get(key)!.members.push({ r, index: i })
  }

  for (const { context, members } of groups.values()) {
    const speciesId = SPECIES_TO_TAXON[context.species] ?? null
    const tissueId = TISSUE_TYPE_TO_UBERON[context.tissueType] ?? null

    const experiment = await prisma.experiment.create({
      data: {
        name: `${context.tissueType} ${context.method} run`,
        speciesId,
        tissueId,
        fixation: context.fixation,
        method: context.method,
        antigenRetrieval: context.antigenRetrieval ?? null,
        submitterId: context.submitterId,
        visibility: "PUBLIC",
      },
    })

    for (const { r, index } of members) {
      const antibodyId = antibodyMap[r.antibodyRrid]
      if (antibodyId === undefined) {
        throw new Error(`Antibody not found for RRID: ${r.antibodyRrid}`)
      }

      const subcellularId = r.targetProteinId ? (PROTEIN_SUBCELLULAR[r.targetProteinId] ?? null) : null

      const report = await prisma.experimentalReport.create({
        data: {
          experimentId: experiment.id,
          antibodyId,
          subcellularId,
          fluorophoreId: fluId(r.fluorophore),
          metalTag: r.metalTag,
          dilution: r.dilution,
          incubation: r.incubation ?? null,
          status: r.status,
          works: r.works,
          signalQuality: r.signalQuality,
          specificity: r.specificity,
          notes: r.notes,
        },
      })

      // Create ReportCellType join rows; reports may have no cell type at all, and
      // guard against non-existent cell types
      const allCellTypeIds = [r.cellTypeId, ...(r.extraCellTypeIds ?? [])].filter(
        (id): id is string => typeof id === "string",
      )
      const linkedCellTypeIds: string[] = []
      for (const ctId of allCellTypeIds) {
        const exists = await prisma.cellType.findUnique({ where: { id: ctId } })
        if (exists) {
          await prisma.reportCellType.create({
            data: { reportId: report.id, cellTypeId: ctId },
          })
          linkedCellTypeIds.push(ctId)
        }
      }

      // Create ReportImage rows, each tagged with the report's cell types so cell-type
      // pages surface relevant images.
      const imageUrls = getReportImages(index)
      for (let imgIndex = 0; imgIndex < imageUrls.length; imgIndex++) {
        await prisma.reportImage.create({
          data: {
            reportId: report.id,
            url: imageUrls[imgIndex],
            sortOrder: imgIndex,
            cellTypes: { create: linkedCellTypeIds.map((cellTypeId) => ({ cellTypeId })) },
          },
        })
      }
    }
  }

  return reports.length
}

async function seedPanels(antibodyMap: Record<string, string>) {
  const bendallId = "seed_user_bendall_sean"
  const linId = "seed_user_lin_jia"

  const panel1 = await prisma.panel.upsert({
    where: { id: "1" },
    update: {},
    create: {
      id: "1",
      name: "Immune Cell Profiling - Spleen (CODEX)",
      description:
        "Multi-cycle CODEX panel for comprehensive immune cell typing in human spleen. Covers T cells, B cells, myeloid and structural markers across 3 imaging cycles.",
      speciesId: "NCBI:txid9606",
      fixation: "FFPE",
      ownerId: bendallId,
      visibility: "PUBLIC",
    },
  })

  const p1c1 = await prisma.panelCycle.upsert({
    where: { id: "1" },
    update: {},
    create: {
      id: "1",
      panelId: panel1.id,
      name: "Cycle 1",
      notes: "T cell lineage markers — CD3, CD4, CD8 for T cell subset identification",
      sortOrder: 0,
    },
  })

  const p1c2 = await prisma.panelCycle.upsert({
    where: { id: "2" },
    update: {},
    create: {
      id: "2",
      panelId: panel1.id,
      name: "Cycle 2",
      notes: "B cell and myeloid markers — CD20, CD68, HLA-DR for antigen-presenting cells",
      sortOrder: 1,
    },
  })

  const p1c3 = await prisma.panelCycle.upsert({
    where: { id: "3" },
    update: {},
    create: {
      id: "3",
      panelId: panel1.id,
      name: "Cycle 3",
      notes: "Activation and adhesion markers — CD2 for co-stimulation readout",
      sortOrder: 2,
    },
  })

  const p1c1Count = await prisma.panelMarker.count({ where: { cycleId: p1c1.id } })
  if (p1c1Count === 0) {
    await prisma.panelMarker.createMany({
      data: markerSeed([
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
      ]),
    })
  }

  const p1c2Count = await prisma.panelMarker.count({ where: { cycleId: p1c2.id } })
  if (p1c2Count === 0) {
    await prisma.panelMarker.createMany({
      data: markerSeed([
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
      ]),
    })
  }

  const p1c3Count = await prisma.panelMarker.count({ where: { cycleId: p1c3.id } })
  if (p1c3Count === 0) {
    await prisma.panelMarker.createMany({
      data: markerSeed([
        {
          cycleId: p1c3.id,
          proteinId: "P06729",
          antibodyId: antibodyMap["RRID:AB_2074650"],
          fluorophore: "AF555",
          sortOrder: 0,
        },
      ]),
    })
  }

  const panel2 = await prisma.panel.upsert({
    where: { id: "2" },
    update: {},
    create: {
      id: "2",
      name: "Tumor Microenvironment - CyCIF Core Panel",
      description:
        "4-cycle CyCIF panel for comprehensive TME characterization in FFPE. Covers epithelial, immune, stromal, and checkpoint markers across iterative staining rounds.",
      speciesId: "NCBI:txid9606",
      fixation: "FFPE",
      ownerId: linId,
      visibility: "PUBLIC",
    },
  })

  const p2c1 = await prisma.panelCycle.upsert({
    where: { id: "4" },
    update: {},
    create: {
      id: "4",
      panelId: panel2.id,
      name: "Cycle 1",
      notes: "Epithelial and structural markers — pan-CK for tumor cells, SMA for stroma",
      sortOrder: 0,
    },
  })

  const p2c2 = await prisma.panelCycle.upsert({
    where: { id: "5" },
    update: {},
    create: {
      id: "5",
      panelId: panel2.id,
      name: "Cycle 2",
      notes: "Immune cell identification — CD31 for vasculature, PCAM for endothelial cells",
      sortOrder: 1,
    },
  })

  const p2c3 = await prisma.panelCycle.upsert({
    where: { id: "6" },
    update: {},
    create: {
      id: "6",
      panelId: panel2.id,
      name: "Cycle 3",
      notes: "Immune checkpoint markers — PD-L1 and Notch1 for immune evasion assessment",
      sortOrder: 2,
    },
  })

  const p2c4 = await prisma.panelCycle.upsert({
    where: { id: "7" },
    update: {},
    create: {
      id: "7",
      panelId: panel2.id,
      name: "Cycle 4",
      notes: "DNA damage and repair — LIG4 for double-strand break repair capacity",
      sortOrder: 3,
    },
  })

  const p2c1Count = await prisma.panelMarker.count({ where: { cycleId: p2c1.id } })
  if (p2c1Count === 0) {
    await prisma.panelMarker.createMany({
      data: markerSeed([
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
      ]),
    })
  }

  const p2c2Count = await prisma.panelMarker.count({ where: { cycleId: p2c2.id } })
  if (p2c2Count === 0) {
    await prisma.panelMarker.createMany({
      data: markerSeed([
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
      ]),
    })
  }

  const p2c3Count = await prisma.panelMarker.count({ where: { cycleId: p2c3.id } })
  if (p2c3Count === 0) {
    await prisma.panelMarker.createMany({
      data: markerSeed([
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
      ]),
    })
  }

  const p2c4Count = await prisma.panelMarker.count({ where: { cycleId: p2c4.id } })
  if (p2c4Count === 0) {
    await prisma.panelMarker.createMany({
      data: markerSeed([
        {
          cycleId: p2c4.id,
          proteinId: "P49917",
          antibodyId: antibodyMap["RRID:AB_2864622"],
          fluorophore: "AF555",
          sortOrder: 0,
        },
      ]),
    })
  }

  return 2
}

async function seedBlogPosts() {
  const posts = await Promise.all(
    BLOG_POSTS.map((post) =>
      prisma.blogPost.upsert({
        where: { slug: post.slug },
        update: {
          title: post.title,
          excerpt: post.excerpt,
          content: post.content,
          published: post.published,
          publishedAt: post.publishedAt,
          metaTitle: post.metaTitle,
          metaDescription: post.metaDescription,
          keywords: post.keywords,
          authorId: post.authorId,
        },
        create: {
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          content: post.content,
          published: post.published,
          publishedAt: post.publishedAt,
          metaTitle: post.metaTitle,
          metaDescription: post.metaDescription,
          keywords: post.keywords,
          authorId: post.authorId,
        },
      }),
    ),
  )
  return posts
}

async function seedDiseaseConditions() {
  console.log("Seeding disease conditions...")
  const conditions = [
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

  await Promise.all(conditions.map((c) => prisma.diseaseCondition.create({ data: c })))
  console.log(`  Created ${conditions.length} disease conditions`)
  return conditions
}

async function seedLabs() {
  const MOUSE_TAXON = "NCBI:txid10090"
  // T-cell and macrophage markers (CD3 epsilon, CD8 alpha, CD68).
  const STOCKED_PROTEIN_IDS = ["P07766", "P01732", "P31996"]

  for (const lab of LABS) {
    await prisma.lab.upsert({
      where: { id: lab.id },
      update: {
        name: lab.name,
        slug: lab.slug,
        institution: lab.institution,
        institutionId: lab.institutionId,
        description: lab.description,
        website: lab.website,
        isPublicProfile: lab.isPublicProfile,
        createdById: lab.ownerId,
      },
      create: {
        id: lab.id,
        name: lab.name,
        slug: lab.slug,
        institution: lab.institution,
        institutionId: lab.institutionId,
        description: lab.description,
        website: lab.website,
        isPublicProfile: lab.isPublicProfile,
        createdById: lab.ownerId,
      },
    })

    const memberships = [
      { userId: lab.ownerId, role: "OWNER" as const, invitedById: null as string | null },
      ...lab.memberIds.map((userId) => ({
        userId,
        role: "MEMBER" as const,
        invitedById: lab.ownerId as string | null,
      })),
    ]
    for (const m of memberships) {
      await prisma.labMembership.upsert({
        where: { userId_labId: { userId: m.userId, labId: lab.id } },
        update: { role: m.role },
        create: { userId: m.userId, labId: lab.id, role: m.role, invitedById: m.invitedById },
      })
    }
  }

  // Attribute a few of the home lab's mouse experiments to the lab as LAB-visible,
  // make one unpublished but successful (to demonstrate that members see in-progress work),
  // and stock the antibodies those experiments used so the lab-scoped AI query has data.
  const homeLab = LABS[0]
  const homeLabMemberIds = [homeLab.ownerId, ...homeLab.memberIds]
  const labExperiments = await prisma.experiment.findMany({
    where: { submitterId: { in: homeLabMemberIds }, speciesId: MOUSE_TAXON },
    select: { id: true },
    take: 3,
  })

  const antibodyIdsToStock = new Set<string>()
  for (const [i, exp] of labExperiments.entries()) {
    await prisma.experiment.update({
      where: { id: exp.id },
      data: { visibility: "LAB", owningLabId: homeLab.id },
    })
    await prisma.experimentLabShare.upsert({
      where: { experimentId_labId: { experimentId: exp.id, labId: homeLab.id } },
      update: {},
      create: { experimentId: exp.id, labId: homeLab.id },
    })
    if (i === 0) {
      await prisma.experimentalReport.updateMany({
        where: { experimentId: exp.id },
        data: { status: "PENDING", works: true },
      })
    }
    const reports = await prisma.experimentalReport.findMany({
      where: { experimentId: exp.id, works: true, antibodyId: { not: null } },
      select: { antibodyId: true },
    })
    for (const r of reports) if (r.antibodyId) antibodyIdsToStock.add(r.antibodyId)
  }

  // Attribute one PUBLIC experiment to the lab too, so the public /browse "Lab" facet has data
  // (public content attributed to a lab) without exposing any private content.
  const publicExp = await prisma.experiment.findFirst({
    where: { submitterId: { in: homeLabMemberIds }, visibility: "PUBLIC", owningLabId: null },
    select: { id: true },
  })
  if (publicExp) {
    await prisma.experiment.update({ where: { id: publicExp.id }, data: { owningLabId: homeLab.id } })
  }

  // Always stock the canonical T-cell/macrophage markers so the inventory is populated
  // even if the attributed experiments did not use them.
  const markerAntibodies = await prisma.antibody.findMany({
    where: { targetProteinId: { in: STOCKED_PROTEIN_IDS } },
    select: { id: true },
    take: 6,
  })
  for (const a of markerAntibodies) antibodyIdsToStock.add(a.id)

  let i = 0
  for (const antibodyId of antibodyIdsToStock) {
    await prisma.labAntibody.upsert({
      where: { labId_antibodyId: { labId: homeLab.id, antibodyId } },
      update: {},
      create: {
        labId: homeLab.id,
        antibodyId,
        storageLocation: i % 2 === 0 ? "-20C freezer A" : "4C fridge B",
        freezerLocation: `Box ${1 + (i % 4)}, slot ${1 + i}`,
        lotNumber: `LOT-${1000 + i}`,
        status: i % 5 === 0 ? "LOW" : "IN_STOCK",
        addedById: homeLab.ownerId,
      },
    })
    i++
  }

  return { labs: LABS.length, labExperiments: labExperiments.length, inventory: antibodyIdsToStock.size }
}

async function resetDatabase() {
  console.log("Resetting database...")
  await prisma.experimentLabShare.deleteMany()
  await prisma.panelLabShare.deleteMany()
  await prisma.labAntibody.deleteMany()
  await prisma.labInvitation.deleteMany()
  await prisma.labMembership.deleteMany()
  await prisma.lab.deleteMany()
  await prisma.panelMarker.deleteMany()
  await prisma.panelCycle.deleteMany()
  await prisma.panel.deleteMany()
  await prisma.reportCellType.deleteMany()
  await prisma.experimentalReport.deleteMany()
  await prisma.fluorophore.deleteMany()
  await prisma.cellTypeMarker.deleteMany()
  await prisma.antibody.deleteMany()
  await prisma.protein.deleteMany()
  await prisma.cellType.deleteMany()
  await prisma.tissue.deleteMany()
  await prisma.cellularComponent.deleteMany()
  await prisma.taxon.deleteMany()
  await prisma.diseaseCondition.deleteMany()
  await prisma.review.deleteMany()
  await prisma.chatMessage.deleteMany()
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
  await seedTaxa()
  await seedTissues()
  await seedCellularComponents()
  const cellTypes = await seedCellTypes()
  await seedDiseaseConditions()
  const proteins = await seedProteins()
  await seedCellTypeMarkers()
  const antibodies = await seedAntibodies()

  const antibodyMap: Record<string, string> = {}
  for (const ab of antibodies) {
    if (ab.rrid) {
      antibodyMap[ab.rrid] = ab.id
    }
  }

  const fluorophoreCount = await seedFluorophores()
  SEED_IMAGE_POOL = await generateSeedBlobImages()
  const reportCount = await seedExperimentalReports(antibodyMap)
  const panelCount = await seedPanels(antibodyMap)
  const blogPosts = await seedBlogPosts()
  const labStats = await seedLabs()

  console.log("Seed data created successfully")
  console.log(`  ${users.length} users`)
  console.log(`  ${TAXA.length} taxa`)
  console.log(`  ${TISSUES.length} tissues`)
  console.log(`  ${CELLULAR_COMPONENTS.length} cellular components`)
  console.log(`  ${fluorophoreCount} fluorophores`)
  console.log(`  ${SEED_IMAGE_POOL.length} generated blob images`)
  console.log(`  ${cellTypes.length} cell types`)
  console.log(`  ${proteins.length} proteins`)
  console.log(`  25 cell type markers`)
  console.log(`  ${antibodies.length} antibodies`)
  console.log(`  ${reportCount} experimental reports`)
  console.log(`  ${panelCount} panels with cycles and markers`)
  console.log(`  ${blogPosts.length} blog posts`)
  console.log(
    `  ${labStats.labs} labs (${labStats.labExperiments} lab-visible experiments, ${labStats.inventory} inventory items)`,
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
