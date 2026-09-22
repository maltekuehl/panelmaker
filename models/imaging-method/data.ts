import type { DetectionModality } from "@/lib/generated/prisma/enums"

export type ImagingMethodSeed = {
  id: string
  label: string
  shortLabel: string
  efoId: string | null
  detection: DetectionModality
  cyclic: boolean
  aliases: string[]
  sortOrder: number
}

// Seeded from the EFO `spatial proteomics` branch (EFO:0700000, 19 descendants verified live against
// OLS4 on 2026-09-22) plus two local rows. `efoId` is null where the community has not termed the
// method yet, which is why the column is optional: PathoPlex is a first-class fluorescence method,
// not an "other" fallback.
//
// `label` is the ontology term and stays verbose on purpose: it is what detail pages, tooltips and the
// API show. `shortLabel` is the compact form a table cell, facet or badge can afford ("CODEX", "IMC").
export const IMAGING_METHODS: ImagingMethodSeed[] = [
  {
    id: "pathoplex",
    label: "PathoPlex",
    shortLabel: "PathoPlex",
    efoId: null,
    detection: "FLUORESCENCE",
    cyclic: true,
    aliases: ["PathoPlex"],
    sortOrder: 10,
  },
  {
    id: "codex",
    label: "co-detection by indexing assay",
    shortLabel: "CODEX",
    efoId: "OBI:0003093",
    detection: "FLUORESCENCE",
    cyclic: true,
    aliases: ["CODEX", "co-detection by indexing"],
    sortOrder: 20,
  },
  {
    id: "phenocycler",
    label: "PhenoCycler",
    shortLabel: "PhenoCycler",
    efoId: "EFO:0700002",
    detection: "FLUORESCENCE",
    cyclic: true,
    aliases: ["PhenoCycler", "Akoya PhenoCycler"],
    sortOrder: 30,
  },
  {
    id: "phenocycler-fusion",
    label: "PhenoCycler-Fusion",
    shortLabel: "PhenoCycler-Fusion",
    efoId: "EFO:0700001",
    detection: "FLUORESCENCE",
    cyclic: true,
    aliases: ["PhenoCycler-Fusion", "PhenoCycler Fusion"],
    sortOrder: 40,
  },
  {
    id: "t-cycif",
    label: "t-CyCIF",
    shortLabel: "t-CyCIF",
    efoId: "EFO:0023019",
    detection: "FLUORESCENCE",
    cyclic: true,
    aliases: ["t-CyCIF", "CyCIF", "cyclic immunofluorescence"],
    sortOrder: 50,
  },
  {
    id: "ibex",
    label: "IBEX assay",
    shortLabel: "IBEX",
    efoId: "EFO:0022996",
    detection: "FLUORESCENCE",
    cyclic: true,
    aliases: ["IBEX", "IBEX2D", "Iterative Bleaching Extends Multiplexity"],
    sortOrder: 60,
  },
  {
    id: "cell-dive",
    label: "Cell DIVE",
    shortLabel: "Cell DIVE",
    efoId: "EFO:0022991",
    detection: "FLUORESCENCE",
    cyclic: true,
    aliases: ["Cell DIVE", "CellDIVE"],
    sortOrder: 70,
  },
  {
    id: "comet-seqif",
    label: "COMET (seqIF)",
    shortLabel: "COMET",
    efoId: "EFO:0022993",
    detection: "FLUORESCENCE",
    cyclic: true,
    aliases: ["COMET", "seqIF", "sequential immunofluorescence"],
    sortOrder: 80,
  },
  {
    id: "macsima",
    label: "MACSima imaging cyclic staining assay",
    shortLabel: "MACSima",
    efoId: "EFO:0023001",
    detection: "FLUORESCENCE",
    cyclic: true,
    aliases: ["MACSima", "MICS", "MACSima imaging cyclic staining"],
    sortOrder: 90,
  },
  {
    id: "4i",
    label: "iterative indirect immunofluorescence imaging",
    shortLabel: "4i",
    efoId: "EFO:0022990",
    detection: "FLUORESCENCE",
    cyclic: true,
    aliases: ["4i", "iterative indirect immunofluorescence imaging"],
    sortOrder: 100,
  },
  {
    id: "milan",
    label: "MILAN",
    shortLabel: "MILAN",
    efoId: "EFO:0023002",
    detection: "FLUORESCENCE",
    cyclic: true,
    aliases: ["MILAN", "multiple iterative labeling by antibody neodeposition"],
    sortOrder: 110,
  },
  {
    id: "cellscape",
    label: "CellScape",
    shortLabel: "CellScape",
    efoId: "EFO:0022992",
    detection: "FLUORESCENCE",
    cyclic: true,
    aliases: ["CellScape", "ChipCytometry"],
    sortOrder: 120,
  },
  {
    id: "immuno-saber",
    label: "Immuno-SABER assay",
    shortLabel: "Immuno-SABER",
    efoId: "EFO:0022998",
    detection: "FLUORESCENCE",
    cyclic: true,
    aliases: ["Immuno-SABER", "SABER"],
    sortOrder: 130,
  },
  {
    id: "dna-exchange-imaging",
    label: "DNA Exchange Imaging assay",
    shortLabel: "DNA Exchange Imaging",
    efoId: "EFO:0022995",
    detection: "FLUORESCENCE",
    cyclic: true,
    aliases: ["DNA Exchange Imaging", "DEI", "Exchange-PAINT"],
    sortOrder: 140,
  },
  {
    id: "orion",
    label: "Orion RareCyte",
    shortLabel: "Orion",
    efoId: "EFO:0023003",
    detection: "FLUORESCENCE",
    cyclic: false,
    aliases: ["Orion", "Orion RareCyte", "RareCyte Orion"],
    sortOrder: 150,
  },
  {
    id: "phenoimager-ht",
    label: "PhenoImager HT",
    shortLabel: "PhenoImager HT",
    efoId: "EFO:0023004",
    detection: "FLUORESCENCE",
    cyclic: false,
    aliases: ["PhenoImager HT", "PhenoImager", "Vectra Polaris"],
    sortOrder: 160,
  },
  {
    id: "spectraplex",
    label: "SpectraPlex",
    shortLabel: "SpectraPlex",
    efoId: "EFO:0023018",
    detection: "FLUORESCENCE",
    cyclic: false,
    aliases: ["SpectraPlex"],
    sortOrder: 170,
  },
  {
    id: "multiplex-immunofluorescence",
    label: "multiplex immunofluorescence imaging assay",
    shortLabel: "mIF",
    efoId: "EFO:0022989",
    detection: "FLUORESCENCE",
    cyclic: false,
    aliases: ["mIF", "multiplex immunofluorescence", "multiplexed immunofluorescence"],
    sortOrder: 180,
  },
  {
    id: "imaging-mass-cytometry",
    label: "imaging mass cytometry assay",
    shortLabel: "IMC",
    efoId: "EFO:0022997",
    detection: "MASS",
    cyclic: false,
    aliases: ["IMC", "imaging mass cytometry", "Hyperion"],
    sortOrder: 190,
  },
  {
    id: "mibi-tof",
    label: "MIBI-TOF",
    shortLabel: "MIBI-TOF",
    efoId: "EFO:0023000",
    detection: "MASS",
    cyclic: false,
    aliases: ["MIBI", "MIBI-TOF", "multiplexed ion beam imaging"],
    sortOrder: 200,
  },
  {
    id: "other",
    label: "Other or unspecified",
    shortLabel: "Other",
    efoId: null,
    detection: "OTHER",
    cyclic: false,
    aliases: ["Other"],
    sortOrder: 900,
  },
]

const normalizeMethodTerm = (value: string): string => value.toLowerCase().replace(/[\s_-]/g, "")

export function resolveImagingMethodId(term: string | null | undefined): string | null {
  const needle = normalizeMethodTerm(term ?? "")
  if (!needle) return null

  for (const method of IMAGING_METHODS) {
    if (method.id === term) return method.id
    if (method.efoId === term) return method.id
    if (normalizeMethodTerm(method.label) === needle) return method.id
    if (normalizeMethodTerm(method.shortLabel) === needle) return method.id
    if (method.aliases.some((alias) => normalizeMethodTerm(alias) === needle)) return method.id
  }

  return null
}
