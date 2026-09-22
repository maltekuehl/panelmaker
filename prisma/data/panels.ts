export type PanelMarkerDef = {
  proteinId: string
  antibodyRrid: string
  fluorophore: string
}

export type PanelCycleDef = {
  name: string
  notes: string
  markers: PanelMarkerDef[]
}

export type PanelDef = {
  id: string
  name: string
  description: string
  speciesId: string
  fixation: "FFPE" | "FRESH_FROZEN" | "PFA" | "METHANOL"
  imagingMethodId: string
  ownerId: string
  cycles: PanelCycleDef[]
}

export const PANELS: PanelDef[] = [
  {
    id: "1",
    name: "Immune Cell Profiling - Spleen (CODEX)",
    description:
      "Multi-cycle CODEX panel for comprehensive immune cell typing in human spleen. Covers T cells, B cells, myeloid and structural markers across 3 imaging cycles.",
    speciesId: "NCBITaxon:9606",
    fixation: "FFPE",
    imagingMethodId: "codex",
    ownerId: "seed_user_demo_rhodes",
    cycles: [
      {
        name: "Cycle 1",
        notes: "T cell lineage markers: CD3, CD4, CD8 for T cell subset identification",
        markers: [
          { proteinId: "P07766", antibodyRrid: "RRID:AB_314056", fluorophore: "Cy3" },
          { proteinId: "P01730", antibodyRrid: "RRID:AB_395943", fluorophore: "AF488" },
          { proteinId: "P01732", antibodyRrid: "RRID:AB_314126", fluorophore: "AF647" },
        ],
      },
      {
        name: "Cycle 2",
        notes: "B cell and myeloid markers: CD19, CD68, HLA-DR for antigen-presenting cells",
        markers: [
          { proteinId: "P15391", antibodyRrid: "RRID:AB_563543", fluorophore: "AF488" },
          { proteinId: "P34810", antibodyRrid: "RRID:AB_927185", fluorophore: "AF647" },
          { proteinId: "P01903", antibodyRrid: "RRID:AB_2860866", fluorophore: "AF750" },
        ],
      },
      {
        name: "Cycle 3",
        notes: "Pan-leukocyte marker: CD45 to separate immune cells from stroma",
        markers: [{ proteinId: "P08575", antibodyRrid: "RRID:AB_2074650", fluorophore: "AF555" }],
      },
    ],
  },
  {
    id: "2",
    name: "Tumor Microenvironment - CyCIF Core Panel",
    description:
      "4-cycle CyCIF panel for comprehensive TME characterization in FFPE. Covers epithelial, immune, stromal, and checkpoint markers across iterative staining rounds.",
    speciesId: "NCBITaxon:9606",
    fixation: "FFPE",
    imagingMethodId: "t-cycif",
    ownerId: "seed_user_demo_navarro",
    cycles: [
      {
        name: "Cycle 1",
        notes: "Epithelial and structural markers: pan-CK for tumor cells, alpha-SMA for stroma",
        markers: [
          { proteinId: "PANCK", antibodyRrid: "RRID:AB_2756012", fluorophore: "AF488" },
          { proteinId: "P62736", antibodyRrid: "RRID:AB_2223500", fluorophore: "AF647" },
        ],
      },
      {
        name: "Cycle 2",
        notes: "Vascular and epithelial markers: CD31 for endothelium, E-Cadherin for epithelial junctions",
        markers: [
          { proteinId: "P16284", antibodyRrid: "RRID:AB_2924631", fluorophore: "AF555" },
          { proteinId: "P12830", antibodyRrid: "RRID:AB_2810957", fluorophore: "AF750" },
        ],
      },
      {
        name: "Cycle 3",
        notes: "Immune checkpoint markers: PD-L1 and PD-1 for immune evasion assessment",
        markers: [
          { proteinId: "Q9NZQ7", antibodyRrid: "RRID:AB_2810960", fluorophore: "AF488" },
          { proteinId: "Q15116", antibodyRrid: "RRID:AB_2716564", fluorophore: "AF647" },
        ],
      },
      {
        name: "Cycle 4",
        notes: "Proliferation: Ki67 for the tumor cell proliferation index",
        markers: [{ proteinId: "P46013", antibodyRrid: "RRID:AB_2864622", fluorophore: "AF555" }],
      },
    ],
  },
]
