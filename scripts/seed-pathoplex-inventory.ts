// Seeds the Puelles lab with the real PathoPlex antibody panels (Kuehl et al., Nature 2025):
//   - upserts every resolved antibody (RRID, host, clonality, target) from the registry lookup,
//   - creates the kidney/immune/vascular marker proteins and assigns the cell types they label
//     (podocyte, parietal epithelial cell, proximal tubule, etc.) via CellTypeMarker,
//   - links each antibody to its target marker protein,
//   - records the human and mouse kidney panels as two separate PUBLISHED experiments owned by the
//     lab, each with one validated report per antibody it used (dilution included),
//   - stocks the union of all antibodies in the lab inventory,
//   - adds the real Aarhus lab members so the roster matches the paper.
//
// Idempotent and non-destructive to the rest of the DB. Run AFTER `npm run seed:demo` (which
// creates the Puelles lab) and AFTER `npm run pathoplex:lookup`:  `npm run pathoplex:seed`.
import "dotenv/config"
import { readFileSync } from "node:fs"
import path from "node:path"
import { runScript } from "../prisma/client"
import { PATHOPLEX } from "../prisma/data/reports"
import { TAXA, taxonIdForHost } from "../prisma/data/taxa"
import { storeLocalImagingMethod } from "../prisma/imaging-methods"
import { type Clonality, type Prisma } from "../src/lib/generated/prisma/client"
import type { ResolvedReagent } from "./lookup-pathoplex-antibodies"
import type { ResolvedTarget } from "./resolve-pathoplex-proteins"

const LAB_ID = "seed_lab_puelles"
const HUMAN_TAXON = "NCBITaxon:9606"
const MOUSE_TAXON = "NCBITaxon:10090"
const KIDNEY_TISSUE = "UBERON:0002113"

// Real Aarhus University members of the Puelles lab from the paper byline. Victor is already the
// seeded OWNER. Emails follow the existing seed convention (…@clin.au.dk).
const MEMBERS = [
  { id: "seed_user_pp_malte", name: "Malte Kuehl", email: "malte.kuehl@clin.au.dk" },
  { id: "seed_user_pp_milagros", name: "Milagros N. Wong", email: "milagros.wong@clin.au.dk" },
  { id: "seed_user_pp_jens", name: "Jens R. Nyengaard", email: "jens.nyengaard@clin.au.dk" },
]
const OWNER_ID = "seed_user_puelles_victor"
// Fictional placeholder member from the base seed, removed so the roster is the real team.
const PLACEHOLDER_MEMBER_ID = "seed_user_puelles_member"

const FORMALDEHYDE_CHEBI_ID = "CHEBI:16842"

const EXPERIMENTS = [
  {
    id: "pp_exp_human",
    name: "PathoPlex human kidney panel (142 markers)",
    description:
      "Human kidney FFPE multiplexed imaging at 80 nm per pixel across 95 iterative cycles (Kuehl et al., Nature 2025, Fig. 4). Antigen retrieval at pH 9, 1 h primary incubations.",
    speciesId: HUMAN_TAXON,
    sample: "human" as const,
    submitterId: "seed_user_pp_malte",
    specimen: {
      preservationText: "10% neutral buffered formalin, paraffin embedded",
      antigenRetrievalText: "pH 9 Tris-EDTA, 20 min at 97C",
      sampleType: "TISSUE" as const,
      sectionThicknessUm: 2,
      donorSex: "MALE" as const,
      donorAge: "61Y",
      developmentalStageId: "HsapDv:0000227",
      protocolDoi: "10.17504/protocols.io.kqdg3xd1zg25/v1",
    },
  },
  {
    id: "pp_exp_mouse",
    name: "PathoPlex mouse kidney panel (34 markers)",
    description:
      "Mouse immune-mediated kidney disease model, 34 markers at 80 nm per pixel (Kuehl et al., Nature 2025, Fig. 2). The panel that surfaced epithelial JUN activity.",
    speciesId: MOUSE_TAXON,
    sample: "mouse" as const,
    submitterId: OWNER_ID,
    specimen: {
      preservationText: "4% PFA perfusion fixed, paraffin embedded",
      antigenRetrievalText: "pH 9 Tris-EDTA, 20 min at 97C",
      sampleType: "TISSUE" as const,
      sectionThicknessUm: 2,
      donorSex: "FEMALE" as const,
      donorAge: "70D",
      developmentalStageId: "MmusDv:0000136",
      protocolDoi: "10.17504/protocols.io.kqdg3xd1zg25/v1",
    },
  },
]

// Cell Ontology cell types the panel resolves, beyond the immune/stromal types the base seed already
// creates (T cell, B cell, macrophage, endothelial cell, fibroblast). CL ids verified against OLS4.
const KIDNEY_CELL_TYPES = [
  { id: "CL:0000653", label: "Podocyte", parentIds: ["CL:0000066"] },
  { id: "CL:1000452", label: "Parietal epithelial cell", parentIds: ["CL:0000066"] },
  { id: "CL:1000838", label: "Proximal tubule epithelial cell", parentIds: ["CL:0000066"] },
  { id: "CL:1000849", label: "Distal convoluted tubule epithelial cell", parentIds: ["CL:0000066"] },
  { id: "CL:1001431", label: "Collecting duct principal cell", parentIds: ["CL:0000066"] },
  { id: "CL:1001106", label: "Thick ascending limb epithelial cell", parentIds: ["CL:0000066"] },
  { id: "CL:0000650", label: "Mesangial cell", parentIds: ["CL:0000499"] },
  { id: "CL:0000359", label: "Vascular smooth muscle cell", parentIds: ["CL:0000499"] },
  { id: "CL:1000692", label: "Kidney interstitial fibroblast", parentIds: ["CL:0000057"] },
  { id: "CL:1000892", label: "Kidney capillary endothelial cell", parentIds: ["CL:0000115"] },
  { id: "CL:0000738", label: "Leukocyte", parentIds: ["CL:0000988"] },
  { id: "CL:0000775", label: "Neutrophil", parentIds: ["CL:0000988"] },
  { id: "CL:0000233", label: "Platelet", parentIds: ["CL:0000988"] },
  { id: "CL:0000232", label: "Erythrocyte", parentIds: ["CL:0000988"] },
]

// Curated identity markers in the panel: the target protein (real UniProt id + gene), the antibody
// keys that detect it, and the cell types it labels (canonical = a defining marker for that type).
// Proteins already created by the base seed (CD3/CD4/CD8/CD45/CD68/alpha-SMA/vimentin) are reused by
// id, not overwritten. Structural-state markers (phospho-targets, autophagy, ER stress) are panel
// reagents but not cell-identity markers, so they are intentionally left unassigned.
type MarkerDef = {
  protein: { id: string; label: string; gene: string }
  antibodyKeys: string[]
  cellTypes: { id: string; canonical?: boolean }[]
}

const MARKERS: MarkerDef[] = [
  // Podocyte
  {
    protein: { id: "O60500", label: "Nephrin", gene: "NPHS1" },
    antibodyKeys: ["nephrin-gp-n2"],
    cellTypes: [{ id: "CL:0000653", canonical: true }],
  },
  {
    protein: { id: "Q9NP85", label: "Podocin", gene: "NPHS2" },
    antibodyKeys: ["podocin-p0372"],
    cellTypes: [{ id: "CL:0000653", canonical: true }],
  },
  {
    protein: { id: "P19544", label: "WT1", gene: "WT1" },
    antibodyKeys: ["wt1-is05530-2"],
    cellTypes: [{ id: "CL:0000653", canonical: true }],
  },
  {
    protein: { id: "Q8N3V7", label: "Synaptopodin", gene: "SYNPO" },
    antibodyKeys: ["synaptopodin-163-004"],
    cellTypes: [{ id: "CL:0000653", canonical: true }],
  },
  {
    protein: { id: "Q9UI36", label: "DACH1", gene: "DACH1" },
    antibodyKeys: ["dach1-hpa012672"],
    cellTypes: [{ id: "CL:0000653", canonical: true }],
  },
  // Parietal epithelial cell
  {
    protein: { id: "P16070", label: "CD44", gene: "CD44" },
    antibodyKeys: ["cd44-cst-5640s", "cd44-af647-103018"],
    cellTypes: [{ id: "CL:1000452", canonical: true }],
  },
  {
    protein: { id: "O95832", label: "Claudin-1", gene: "CLDN1" },
    antibodyKeys: ["claudin1-ab15098"],
    cellTypes: [{ id: "CL:1000452" }],
  },
  // Proximal tubule
  {
    protein: { id: "O60494", label: "Cubilin", gene: "CUBN" },
    antibodyKeys: ["cubilin-af3700"],
    cellTypes: [{ id: "CL:1000838", canonical: true }],
  },
  {
    protein: { id: "P09327", label: "Villin-1", gene: "VIL1" },
    antibodyKeys: ["villin1-ab52102"],
    cellTypes: [{ id: "CL:1000838", canonical: true }],
  },
  {
    protein: { id: "Q96D42", label: "KIM-1", gene: "HAVCR1" },
    antibodyKeys: ["kim1-af1750"],
    cellTypes: [{ id: "CL:1000838" }],
  },
  {
    protein: { id: "Q9BYF1", label: "ACE2", gene: "ACE2" },
    antibodyKeys: ["ace2-af933"],
    cellTypes: [{ id: "CL:1000838" }],
  },
  {
    protein: { id: "P53985", label: "MCT1", gene: "SLC16A1" },
    antibodyKeys: ["mct1-ma5-18288"],
    cellTypes: [{ id: "CL:1000838" }],
  },
  {
    protein: { id: "P15121", label: "Aldose reductase", gene: "AKR1B1" },
    antibodyKeys: ["akr1b1-pa5-82915"],
    cellTypes: [{ id: "CL:1000838" }],
  },
  // Distal convoluted tubule
  {
    protein: { id: "P55017", label: "NCC", gene: "SLC12A3" },
    antibodyKeys: ["slc12a3-ma5-41643"],
    cellTypes: [{ id: "CL:1000849", canonical: true }],
  },
  {
    protein: { id: "P05937", label: "Calbindin", gene: "CALB1" },
    antibodyKeys: ["calbindin-d-c9848"],
    cellTypes: [{ id: "CL:1000849", canonical: true }],
  },
  // Thick ascending limb
  {
    protein: { id: "P07911", label: "Uromodulin", gene: "UMOD" },
    antibodyKeys: ["uromodulin-af5144"],
    cellTypes: [{ id: "CL:1001106", canonical: true }],
  },
  {
    protein: { id: "P78369", label: "Claudin-10", gene: "CLDN10" },
    antibodyKeys: ["claudin10-38-8400"],
    cellTypes: [{ id: "CL:1001106" }],
  },
  // Collecting duct
  {
    protein: { id: "P41181", label: "Aquaporin-2", gene: "AQP2" },
    antibodyKeys: ["aqp2-aqp-002"],
    cellTypes: [{ id: "CL:1001431", canonical: true }],
  },
  {
    protein: { id: "P59646", label: "FXYD4", gene: "FXYD4" },
    antibodyKeys: ["fxyd4-pa5-63570"],
    cellTypes: [{ id: "CL:1001431" }],
  },
  // Endothelium
  {
    protein: { id: "P28906", label: "CD34", gene: "CD34" },
    antibodyKeys: ["cd34-ga63261-2"],
    cellTypes: [{ id: "CL:1000892", canonical: true }, { id: "CL:0000115" }],
  },
  {
    protein: { id: "Q9ULC0", label: "Endomucin", gene: "EMCN" },
    antibodyKeys: ["endomucin-hpa005928", "endomucin-sc-65495"],
    cellTypes: [{ id: "CL:1000892", canonical: true }, { id: "CL:0000115" }],
  },
  {
    protein: { id: "P29474", label: "eNOS", gene: "NOS3" },
    antibodyKeys: ["enos-ab76198"],
    cellTypes: [{ id: "CL:0000115" }],
  },
  {
    protein: { id: "P04275", label: "von Willebrand factor", gene: "VWF" },
    antibodyKeys: ["vwf-a008229-2"],
    cellTypes: [{ id: "CL:0000115", canonical: true }],
  },
  // Mesangial / vascular smooth muscle / fibroblast
  {
    protein: { id: "P09619", label: "PDGFR-beta", gene: "PDGFRB" },
    antibodyKeys: ["pdgfrb-cst-3169"],
    cellTypes: [{ id: "CL:0000650", canonical: true }, { id: "CL:1000692" }],
  },
  {
    protein: { id: "P62736", label: "Alpha-SMA", gene: "ACTA2" },
    antibodyKeys: ["asma-fitc-f3777"],
    cellTypes: [{ id: "CL:0000359", canonical: true }, { id: "CL:0000650" }],
  },
  {
    protein: { id: "P08670", label: "Vimentin", gene: "VIM" },
    antibodyKeys: ["vimentin-gp53"],
    cellTypes: [{ id: "CL:1000692" }, { id: "CL:0000650" }, { id: "CL:0000115" }],
  },
  // Immune
  {
    protein: { id: "P07766", label: "CD3 epsilon", gene: "CD3E" },
    antibodyKeys: ["cd3-ab11089", "cd3-ab1108"],
    cellTypes: [{ id: "CL:0000084", canonical: true }],
  },
  {
    protein: { id: "P01730", label: "CD4", gene: "CD4" },
    antibodyKeys: ["cd4-af-379-na", "cd4-ab183685"],
    cellTypes: [{ id: "CL:0000624", canonical: true }, { id: "CL:0000235" }],
  },
  {
    protein: { id: "P01732", label: "CD8 alpha", gene: "CD8A" },
    antibodyKeys: ["cd8-m710301-2"],
    cellTypes: [{ id: "CL:0000625", canonical: true }],
  },
  {
    protein: { id: "P34810", label: "CD68", gene: "CD68" },
    antibodyKeys: ["cd68-916104"],
    cellTypes: [{ id: "CL:0000235", canonical: true }],
  },
  {
    protein: { id: "P22897", label: "CD206", gene: "MRC1" },
    antibodyKeys: ["cd206-60143-1-ig"],
    cellTypes: [{ id: "CL:0000235", canonical: true }],
  },
  {
    protein: { id: "P55008", label: "IBA1", gene: "AIF1" },
    antibodyKeys: ["iba1-ma5-27726"],
    cellTypes: [{ id: "CL:0000235", canonical: true }],
  },
  {
    protein: { id: "P11912", label: "CD79a", gene: "CD79A" },
    antibodyKeys: ["cd79a-m705001-2"],
    cellTypes: [{ id: "CL:0000236", canonical: true }],
  },
  {
    protein: { id: "P05164", label: "Myeloperoxidase", gene: "MPO" },
    antibodyKeys: ["mpo-mab3174"],
    cellTypes: [{ id: "CL:0000775", canonical: true }],
  },
  {
    protein: { id: "P08575", label: "CD45", gene: "PTPRC" },
    antibodyKeys: ["cd45-cst-70257"],
    cellTypes: [{ id: "CL:0000738", canonical: true }],
  },
  {
    protein: { id: "P02745", label: "Complement C1q A", gene: "C1QA" },
    antibodyKeys: ["c1qa-67063-1-ig"],
    cellTypes: [{ id: "CL:0000235" }],
  },
  // Platelet / erythrocyte
  {
    protein: { id: "P08514", label: "CD41", gene: "ITGA2B" },
    antibodyKeys: ["cd41-pa5-79526"],
    cellTypes: [{ id: "CL:0000233", canonical: true }],
  },
  {
    protein: { id: "P07359", label: "CD42b", gene: "GP1BA" },
    antibodyKeys: ["cd42b-ab227669"],
    cellTypes: [{ id: "CL:0000233", canonical: true }],
  },
  {
    protein: { id: "P02724", label: "Glycophorin A", gene: "GYPA" },
    antibodyKeys: ["glycophorin-a-mab1228-sp"],
    cellTypes: [{ id: "CL:0000232", canonical: true }],
  },
]

const CLONALITY: Record<string, Clonality> = {
  "monoclonal": "MONOCLONAL",
  "polyclonal": "POLYCLONAL",
  "recombinant": "RECOMBINANT",
  "recombinant monoclonal": "RECOMBINANT",
  "oligoclonal": "OLIGOCLONAL",
}

function clonalityOf(raw: string | null): Clonality | null {
  return raw ? (CLONALITY[raw.toLowerCase()] ?? null) : null
}

function antibodyName(r: ResolvedReagent): string {
  return r.cloneId ? `Anti-${r.target} [${r.cloneId}]` : `Anti-${r.target}`
}

function targetSpeciesOf(r: ResolvedReagent): string[] {
  const labels: string[] = []
  if (r.samples.includes("human")) labels.push("Homo sapiens")
  if (r.samples.includes("mouse")) labels.push("Mus musculus")
  return labels
}

function loadResolved(): ResolvedReagent[] {
  const file = path.resolve(process.cwd(), "prisma/data/pathoplex-antibodies.resolved.json")
  try {
    return JSON.parse(readFileSync(file, "utf8")) as ResolvedReagent[]
  } catch {
    throw new Error(`Could not read ${file}. Run \`npm run pathoplex:lookup\` first.`)
  }
}

function loadResolvedTargets(): Record<string, ResolvedTarget> {
  const file = path.resolve(process.cwd(), "prisma/data/pathoplex-proteins.resolved.json")
  try {
    return (JSON.parse(readFileSync(file, "utf8")) as { targets: Record<string, ResolvedTarget> }).targets
  } catch {
    throw new Error(`Could not read ${file}. Run \`npm run pathoplex:proteins\` first.`)
  }
}

runScript(async (prisma) => {
  const lab = await prisma.lab.findUnique({ where: { id: LAB_ID }, select: { id: true, name: true, slug: true } })
  if (!lab) throw new Error(`Lab ${LAB_ID} not found. Run \`npm run seed:demo\` first to create the Puelles lab.`)

  // Example data has to be good data: an antibody without an RRID cannot be resolved against the
  // Antibody Registry, so it would show up as unlinkable free text. Same rule as the IBEX import.
  const allReagents = loadResolved()
  const reagents = allReagents.filter((r) => r.rrid)
  const rejected = allReagents.filter((r) => !r.rrid)

  // Taxa that hosts may reference (the base seed creates these, but the script must stand alone).
  for (const taxon of TAXA) {
    await prisma.taxon.upsert({ where: { id: taxon.id }, update: { label: taxon.label }, create: taxon })
  }

  // Real lab members.
  for (const m of MEMBERS) {
    await prisma.user.upsert({
      where: { id: m.id },
      update: { name: m.name, institution: "Aarhus University", institutionId: "ror:01aj84f44" },
      create: {
        id: m.id,
        name: m.name,
        email: m.email,
        institution: "Aarhus University",
        institutionId: "ror:01aj84f44",
      },
    })
    await prisma.labMembership.upsert({
      where: { userId_labId: { userId: m.id, labId: LAB_ID } },
      update: { role: "MEMBER" },
      create: { userId: m.id, labId: LAB_ID, role: "MEMBER", invitedById: OWNER_ID },
    })
  }
  await prisma.labMembership.deleteMany({ where: { userId: PLACEHOLDER_MEMBER_ID, labId: LAB_ID } })

  // Kidney/immune/vascular cell types the panel resolves.
  for (const ct of KIDNEY_CELL_TYPES) {
    await prisma.cellType.upsert({
      where: { id: ct.id },
      update: { label: ct.label, parentIds: ct.parentIds },
      create: { id: ct.id, label: ct.label, parentIds: ct.parentIds },
    })
  }

  // Curated marker proteins. Create the ones the base seed lacks (reusing existing ids untouched),
  // and build an antibody-key -> protein-id map so each antibody links to the marker it detects.
  const existingProteins = new Set((await prisma.protein.findMany({ select: { id: true } })).map((p) => p.id))
  const proteinByKey = new Map<string, string>()
  for (const marker of MARKERS) {
    if (!existingProteins.has(marker.protein.id)) {
      await prisma.protein.upsert({
        where: { id: marker.protein.id },
        update: { label: marker.protein.label, geneSymbol: marker.protein.gene },
        create: { id: marker.protein.id, label: marker.protein.label, geneSymbol: marker.protein.gene },
      })
      existingProteins.add(marker.protein.id)
    }
    for (const key of marker.antibodyKeys) proteinByKey.set(key, marker.protein.id)
  }

  // Every other target, resolved against UniProt by `npm run pathoplex:proteins`.
  for (const [key, target] of Object.entries(loadResolvedTargets())) {
    if (proteinByKey.has(key)) continue
    if (!existingProteins.has(target.accession)) {
      await prisma.protein.create({
        data: { id: target.accession, label: target.label, geneSymbol: target.geneSymbol },
      })
      existingProteins.add(target.accession)
    }
    proteinByKey.set(key, target.accession)
  }

  const linkProtein = (key: string): string | null => proteinByKey.get(key) ?? null

  // Antibodies. Deterministic ids (pp_<key>) keep re-runs idempotent; when an RRID exists we key the
  // upsert on it so we adopt any antibody the base seed already created with that RRID.
  const antibodyIdByKey = new Map<string, string>()
  for (const r of reagents) {
    const ppId = `pp_${r.key}`
    const data = {
      name: antibodyName(r),
      catalogNumber: r.catalog,
      cloneId: r.cloneId,
      clonality: clonalityOf(r.clonality),
      hostTaxonId: taxonIdForHost(r.host),
      targetSpecies: targetSpeciesOf(r),
      targetProteinId: linkProtein(r.key),
      targetName: r.target,
      applications: ["IF", "PathoPlex"],
      conjugate: r.conjugate ?? null,
      vendorName: r.vendor,
      citationCount: r.citationCount,
    }
    const created = await prisma.antibody.upsert({
      where: { rrid: r.rrid as string },
      update: data,
      create: { id: ppId, rrid: r.rrid as string, ...data },
      select: { id: true },
    })
    antibodyIdByKey.set(r.key, created.id)
  }

  // Assign the cell types each marker labels (podocyte, parietal epithelial cell, proximal tubule, ...).
  let assignmentCount = 0
  for (const marker of MARKERS) {
    for (const ct of marker.cellTypes) {
      await prisma.cellTypeMarker.upsert({
        where: { cellTypeId_proteinId: { cellTypeId: ct.id, proteinId: marker.protein.id } },
        update: { isCanonical: ct.canonical ?? false },
        create: {
          cellTypeId: ct.id,
          proteinId: marker.protein.id,
          isCanonical: ct.canonical ?? false,
          source: "PathoPlex",
        },
      })
      assignmentCount++
    }
  }

  // Two experiments + one validated report per antibody used.
  await prisma.fixative.createMany({
    data: [
      { id: FORMALDEHYDE_CHEBI_ID, label: "formaldehyde" },
      { id: "CHEBI:752978", label: "paraformaldehyde" },
    ],
    skipDuplicates: true,
  })
  await prisma.developmentalStage.createMany({
    data: [
      { id: "HsapDv:0000227", label: "late adult stage" },
      { id: "MmusDv:0000136", label: "prime adult stage" },
    ],
    skipDuplicates: true,
  })

  const pathoplex = await storeLocalImagingMethod(prisma, PATHOPLEX.label, PATHOPLEX.parentId)

  let reportCount = 0
  for (const exp of EXPERIMENTS) {
    const experimentData = {
      name: exp.name,
      description: exp.description,
      speciesId: exp.speciesId,
      tissueId: KIDNEY_TISSUE,
      preservation: "FFPE",
      preservationText: exp.specimen.preservationText,
      fixativeId: FORMALDEHYDE_CHEBI_ID,
      fixativeConcentration: exp.specimen.preservationText.startsWith("4% PFA") ? "4%" : "10% formalin",
      antigenRetrievalText: exp.specimen.antigenRetrievalText,
      sampleType: exp.specimen.sampleType,
      sectionThicknessUm: exp.specimen.sectionThicknessUm,
      donorSex: exp.specimen.donorSex,
      donorAge: exp.specimen.donorAge,
      developmentalStageId: exp.specimen.developmentalStageId,
      protocolDoi: exp.specimen.protocolDoi,
      imagingMethodId: pathoplex.id,
      antigenRetrieval: "TRIS_EDTA_PH9",
      submitterId: exp.submitterId,
      visibility: "PUBLIC",
      owningLabId: LAB_ID,
    } satisfies Omit<Prisma.ExperimentUncheckedCreateInput, "id">
    await prisma.experiment.upsert({
      where: { id: exp.id },
      update: experimentData,
      create: { id: exp.id, ...experimentData },
    })
    await prisma.experimentLabShare.upsert({
      where: { experimentId_labId: { experimentId: exp.id, labId: LAB_ID } },
      update: {},
      create: { experimentId: exp.id, labId: LAB_ID },
    })

    for (const r of reagents) {
      if (!r.samples.includes(exp.sample)) continue
      const reportId = `pp_rpt_${exp.id}_${r.key}`
      await prisma.experimentalReport.upsert({
        where: { id: reportId },
        update: { dilution: r.dilution, status: "PUBLISHED", recommendation: "RECOMMENDED" },
        create: {
          id: reportId,
          experimentId: exp.id,
          antibodyId: antibodyIdByKey.get(r.key) ?? null,
          dilution: r.dilution,
          status: "PUBLISHED",
          recommendation: "RECOMMENDED",
          notes: r.note ?? null,
        },
      })
      reportCount++
    }
  }

  // Stock the whole panel in the lab inventory.
  let i = 0
  for (const r of reagents) {
    const antibodyId = antibodyIdByKey.get(r.key)
    if (!antibodyId) continue
    await prisma.labAntibody.upsert({
      where: { labId_antibodyId: { labId: LAB_ID, antibodyId } },
      update: { vendorCatalog: r.catalog, notes: `PathoPlex working dilution ${r.dilution}`, status: "IN_STOCK" },
      create: {
        labId: LAB_ID,
        antibodyId,
        vendorCatalog: r.catalog,
        storageLocation: i % 2 === 0 ? "-20C freezer A" : "4C fridge B",
        freezerLocation: `Box ${1 + (i % 12)}, slot ${1 + (i % 81)}`,
        notes: `PathoPlex working dilution ${r.dilution}`,
        status: "IN_STOCK",
        addedById: OWNER_ID,
      },
    })
    i++
  }

  console.log(`PathoPlex seed complete for the ${lab.name} (/labs/${lab.slug}):`)
  console.log(`  antibodies upserted: ${reagents.length} (all with an RRID)`)
  console.log(`  marker proteins:     ${MARKERS.length} linked to antibodies`)
  console.log(`  cell types:          ${KIDNEY_CELL_TYPES.length} added, ${assignmentCount} marker assignments`)
  console.log(`  experiments:         ${EXPERIMENTS.length} (human + mouse kidney panels)`)
  console.log(`  validated reports:   ${reportCount}`)
  console.log(`  inventory items:     ${i}`)
  console.log(`  members:             owner + ${MEMBERS.length} (${MEMBERS.map((m) => m.name).join(", ")})`)

  if (rejected.length > 0) {
    console.log(`\n  ${rejected.length} reagents skipped, no RRID so they cannot resolve to a registry record:`)
    for (const r of rejected) console.log(`    ${r.target} (${r.vendor} ${r.catalog})`)
  }
})
