// Controlled-vocabulary mappings from the IBEX Imaging Community knowledge base onto PanelMaker
// enums and identifier formats. Ontology resolutions that had to be looked up and hand-checked
// against OLS4 / NCBI live in ontology.resolved.json; this file holds only the policy decisions.
//
// Source: https://github.com/IBEXImagingCommunity/ibex_imaging_knowledge_base (CC BY 4.0).
import type { AntigenRetrieval, Preservation } from "../../../lib/generated/prisma/client"

export const IBEX_SOURCE = {
  id: "ibex-knowledge-base",
  name: "IBEX Knowledge-Base",
  repo: "https://github.com/IBEXImagingCommunity/ibex_imaging_knowledge_base",
  rawBase: "https://raw.githubusercontent.com/IBEXImagingCommunity/ibex_imaging_knowledge_base/main",
  dataFiles: ["reagent_resources.csv", "fluorescent_probes.csv", "vendor_urls.csv"],
  imageBase:
    "https://raw.githubusercontent.com/IBEXImagingCommunity/ibex_imaging_knowledge_base/main/docs/supporting_material",
  licence: "CC BY 4.0",
  title: "Iterative Bleaching Extends Multiplexity (IBEX) Knowledge-Base",
  attribution:
    "IBEX Imaging Community. Iterative Bleaching Extends Multiplexity (IBEX) Knowledge-Base, reagent_resources.csv. Licensed CC BY 4.0.",
} as const

export { taxonId } from "@/models/taxon/id"

export const RRID_PREFIX = "RRID:"

// Only the two reagent types that are genuinely antibodies become Antibody rows and reports. The
// rest are stains, kits and blocking reagents that PanelMaker has no model for; importing them as
// antibodies would put reagents such as "Hoechst 33342" or "Avidin/Biotin Blocking Kit" into the
// marker and antibody browse surfaces.
export const IMPORTED_REAGENT_TYPES: ReadonlySet<string> = new Set(["Primary Antibody", "Secondary Antibody"])

export const SKIPPED_REAGENT_TYPE_REASONS: Record<string, string> = {
  "Nuclear Dye": "nucleic acid stain, not an antibody; PanelMaker has no stain reagent model",
  "Lectin": "carbohydrate-binding protein, not an antibody",
  "Streptavidin Conjugate": "detection reagent with no target, not an antibody",
  "Zenon Labeling Kit": "labeling kit, not an antibody",
  "Blocking Reagent": "blocking reagent; PanelMaker has no reagent-role field to mark it as non-marker",
  "Avidin/Biotin Blocking Kit": "blocking kit, not an antibody",
  "Cell Structure Reagent": "phalloidin stain, not an antibody",
}

export const SKIPPED_REAGENT_TYPE_PREFIXES: Record<string, string> = {
  FlexAble: "antibody labeling kit, not an antibody",
}

// IBEX2D Manual, IBEX2D Automated, Cell DIVE-IBEX, Ce3D-IBEX and Opal-plex all run the IBEX
// iterative LiBH4 dye-inactivation protocol (see the upstream reagent_glossary.csv), so they all map
// to the IBEX assay catalog row (EFO:0022996). Multiplexed 2D Imaging is single cycle and Ce3D is
// clearing only, so neither is IBEX. The exact string is preserved on every experiment regardless.
// Only records produced with an actual IBEX protocol are imported. The knowledge base also collects
// reagents validated on "Multiplexed 2D Imaging" and plain "Ce3D", which are neither IBEX nor any other
// method PanelMaker models, so they would land as "Other or unspecified" and tell a reader nothing.
export const IBEX_ASSAY = "EFO:0022996"

export const IMAGING_METHOD_MAP: Record<string, string> = {
  "IBEX2D Manual": IBEX_ASSAY,
  "IBEX2D Automated": IBEX_ASSAY,
  "Cell DIVE-IBEX": IBEX_ASSAY,
  "Ce3D-IBEX": IBEX_ASSAY,
  "Opal-plex": IBEX_ASSAY,
}

// The upstream "Tissue Preservation" column mixes the preservation state with the fixative and its
// concentration, which is exactly the split PanelMaker now stores separately. The raw string is kept
// verbatim in `preservationText` on every experiment, so nothing here is lossy.
//
// Cytofix/Cytoperm and AntigenFix are both formaldehyde-based, so sections made with them are fixed
// frozen rather than fresh frozen (which means frozen with no fixative). "4% PFA Fixed Agarose" is
// agarose embedded, not frozen or paraffin, and "10% Formalin for 7 Days" never says the block was
// paraffin embedded, so FFPE would assert something the record does not state: both are OTHER.
export type PreservationMapping = {
  preservation: Preservation
  fixativeId: string | null
  concentration: string | null
}

export const PRESERVATION_MAP: Record<string, PreservationMapping> = {
  "FFPE": { preservation: "FFPE", fixativeId: "CHEBI:16842", concentration: null },
  "1:4 Cytofix/Cytoperm Fixed Frozen": {
    preservation: "FIXED_FROZEN",
    fixativeId: "CHEBI:16842",
    concentration: "1:4 Cytofix/Cytoperm",
  },
  "4% PFA Fixed Frozen": { preservation: "FIXED_FROZEN", fixativeId: "CHEBI:752978", concentration: "4%" },
  "2% PFA Fixed Frozen": { preservation: "FIXED_FROZEN", fixativeId: "CHEBI:752978", concentration: "2%" },
  "1% PFA Fixed Frozen": { preservation: "FIXED_FROZEN", fixativeId: "CHEBI:752978", concentration: "1%" },
  "4% PFA Fixed Agarose": { preservation: "OTHER", fixativeId: "CHEBI:752978", concentration: "4%" },
  "AntigenFix (2h, 4 degrees) Fixed Frozen": {
    preservation: "FIXED_FROZEN",
    fixativeId: "CHEBI:16842",
    concentration: "AntigenFix",
  },
  "10% Formalin for 7 Days": { preservation: "OTHER", fixativeId: "CHEBI:16842", concentration: "10% formalin" },
}

// ChEBI terms referenced by PRESERVATION_MAP, upserted before any experiment points at one.
export const IBEX_FIXATIVES: { id: string; label: string }[] = [
  { id: "CHEBI:16842", label: "formaldehyde" },
  { id: "CHEBI:752978", label: "paraformaldehyde" },
]

// ER1 (AR9961) and Akoya AR6 are citrate-type pH 6 buffers; the Borg Decloaker runs at pH 9.5,
// which is the high-pH retrieval the TRIS_EDTA_PH9 value stands for. The Leica Bond entry that
// lists ER1 *and* ER2 covers two different retrievals in one string, so no single enum value is
// honest: it stays unmapped and the whole string goes into `antigenRetrievalText`, which every row
// gets regardless of whether the enum could be filled.
//
// "NA" is the knowledge base's blank marker in every column (RRID, UniProt, Isotype, ...), so it means
// the retrieval was not recorded, never that none was performed. It stays null, never NONE.
export const ANTIGEN_RETRIEVAL_MAP: Record<string, AntigenRetrieval | null> = {
  "pH 6 for 40 minutes at 95C (AR6 Akoya Biosciences AR600250ML)": "CITRATE_PH6",
  "Akoya AR6": "CITRATE_PH6",
  "pH 6 (10 mM Sodium Citrate) for 20 minutes in a pressure cooker": "CITRATE_PH6",
  "10 mM citrate buffer (pH 6.0) for 30 minutes at 95C": "CITRATE_PH6",
  "pH 6 (Sodium Citrate buffer) for 45 minutes": "CITRATE_PH6",
  "pH 6 for 20 minutes ER1 (AR9961) using the Leica Bond": "CITRATE_PH6",
  "pH 6 for 30 minutes ER1 (AR9961) using the Leica Bond": "CITRATE_PH6",
  "pH 9.5 for 15 minutes in a pressure cooker (Borg Decloaker BD1000)": "TRIS_EDTA_PH9",
  "pH 6 for 30 minutes ER1 (AR9961) and pH 9 for 30 minutes ER2 (AR9640) using the Leica Bond": null,
}

// Conjugate strings that carry no fluorophore.
export const NON_FLUOROPHORE_CONJUGATES: ReadonlySet<string> = new Set(["Unconjugated", "NA", "Biotin"])

// Alexa Fluor Plus dyes share the spectra of the base dye in the upstream fluorescent_probes.csv,
// so they resolve to the existing fluorophore rather than creating a near-duplicate row.
export const CONJUGATE_ALIAS_OF: Record<string, string> = {
  "AF488 (Plus)": "AF488",
  "AF555 (Plus)": "AF555",
  "AF647 (Plus)": "AF647",
}

// Conjugate abbreviations whose spectra live in fluorescent_probes.csv under a longer name.
export const CONJUGATE_PROBE_NAMES: Record<string, string> = {
  "RB613": "RealBlue 613 (RB613)",
  "RB670": "RealBlue 670 (RB670)",
  "RB705": "RealBlue 705 (RB705)",
  "RB780": "RealBlue 780 (RB780)",
  "RY610": "RealYellow 610 (RY610)",
  "RY703": "RealYellow 704 (RY703)",
  "RY743": "RealYellow 743 (RY743)",
  "RY775": "RealYellow 775 (RY775)",
  "CoraLite Plus AF488": "CoraLite Plus 488",
  "AF800 (Plus)": "AF800 (Plus)",
}

export const POLYCLONAL_CLONALITY_VALUE = "Polyclonal"
export const MONOCLONAL_CLONALITY_VALUE = "Monoclonal"

export const NA_VALUES: ReadonlySet<string> = new Set(["", "NA", "N/A", "na"])

export function isNa(value: string | null | undefined): boolean {
  return value === null || value === undefined || NA_VALUES.has(value.trim())
}

export type OntologyRef = { id: string; label: string }

export type ResolvedTissue = {
  uberonId: string | null
  uberonLabel: string | null
  diseaseId: string | null
  diseaseLabel: string | null
  note?: string
}

export type ResolvedTaxon = { ncbiTaxId: number; label: string; note?: string }

export type IbexOntologyResolution = {
  source: { resolvedAt: string; uberon: string; doid: string; taxonomy: string }
  targetTissues: Record<string, ResolvedTissue>
  tissueStates: Record<string, (OntologyRef & { note?: string }) | null>
  targetSpecies: Record<string, ResolvedTaxon | null>
  hostOrganisms: Record<string, ResolvedTaxon | null>
}

export type IbexProteinResolution = {
  resolvedAt: string
  source: string
  accessions: Record<string, { label: string | null; geneSymbol: string | null; organismId: number | null }>
}
