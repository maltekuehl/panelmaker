export type AssessmentTermSeed = { id: string; label: string; description: string }

export const VALIDATION_METHODS: AssessmentTermSeed[] = [
  {
    id: "knockout-control",
    label: "Knockout or knockdown control",
    description: "Staining disappears in knockout or knockdown tissue or cells.",
  },
  {
    id: "independent-antibody",
    label: "Independent antibody",
    description: "A second antibody against a different epitope gives the same pattern.",
  },
  {
    id: "rna-concordance",
    label: "Matches RNA",
    description: "Pattern agrees with RNA in situ hybridization or single cell RNA data.",
  },
  {
    id: "singleplex-concordance",
    label: "Matches single-marker staining",
    description: "Pattern agrees with single-marker IHC or IF on the same tissue.",
  },
  {
    id: "expected-pattern",
    label: "Expected cell types and compartment",
    description: "Signal is in the cell types and subcellular compartment expected for the target.",
  },
  {
    id: "control-tissue",
    label: "Positive and negative control tissue",
    description: "Stains a tissue known to express the target and spares one known not to.",
  },
  {
    id: "secondary-only-control",
    label: "Secondary-only or no-primary control",
    description: "No signal when the primary antibody is left out.",
  },
  {
    id: "isotype-control",
    label: "Isotype control",
    description: "A matched isotype control antibody gives no comparable signal.",
  },
]

export const STAINING_ISSUES: AssessmentTermSeed[] = [
  { id: "no-signal", label: "No detectable signal", description: "No staining above background." },
  { id: "weak-signal", label: "Weak signal", description: "Detectable, but dim relative to the expected expression." },
  {
    id: "high-background",
    label: "High background",
    description: "Diffuse staining makes positive cells hard to call.",
  },
  {
    id: "off-target-staining",
    label: "Off-target staining",
    description: "Signal in cell types or compartments where the target is not expected.",
  },
  {
    id: "lost-during-cycling",
    label: "Lost during cycling or retrieval",
    description: "Signal drops after bleaching, stripping or repeated antigen retrieval in later cycles.",
  },
  {
    id: "needs-amplification",
    label: "Needs signal amplification",
    description: "Only usable with tyramide or another amplification step.",
  },
  {
    id: "autofluorescence",
    label: "Autofluorescence in this channel",
    description: "Tissue autofluorescence in the channel masks the signal.",
  },
  {
    id: "bleed-through",
    label: "Bleed-through or crosstalk",
    description: "Signal leaks into, or picks up signal from, a neighbouring channel.",
  },
  {
    id: "steric-hindrance",
    label: "Blocked by another antibody",
    description: "Signal weakens when stained together with an antibody against a nearby epitope.",
  },
  {
    id: "lot-variability",
    label: "Lot-to-lot variability",
    description: "Performance changed between antibody lots.",
  },
]
