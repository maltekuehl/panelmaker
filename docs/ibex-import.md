# IBEX knowledge base import

Maps the [IBEX Imaging Community knowledge base](https://github.com/IBEXImagingCommunity/ibex_imaging_knowledge_base)
into PanelMaker. The upstream repository is licensed **CC BY 4.0**; the committed source tables are redistributed
unmodified under that licence and every imported experiment carries the attribution in its `citation` field.

> IBEX Imaging Community. Iterative Bleaching Extends Multiplexity (IBEX) Knowledge-Base, `reagent_resources.csv`.
> Licensed CC BY 4.0.

## Commands

```bash
nvm use
npm run ibex:fetch    # refresh the committed source tables and the UniProt lookup
npm run ibex:import   # load the committed tables into the database
```

`ibex:import` does no network calls. It is idempotent, non-destructive, and never resets the database.

## Files

| Path                                          | What it is                                                                      |
| --------------------------------------------- | ------------------------------------------------------------------------------- |
| `prisma/data/ibex/reagent_resources.csv`      | Upstream reagent table, 1321 rows, 26 columns. Committed so the seed runs offline |
| `prisma/data/ibex/fluorescent_probes.csv`     | Upstream probe table, 76 dyes with excitation and emission maxima                 |
| `prisma/data/ibex/vendor_urls.csv`            | Upstream vendor table, used to fill `Antibody.vendorUrl`                          |
| `prisma/data/ibex/ontology.resolved.json`     | Hand-checked UBERON, DOID and NCBI taxonomy resolutions                           |
| `prisma/data/ibex/proteins.resolved.json`     | Generated: UniProt accession to gene symbol and recommended name                  |
| `prisma/data/ibex/resolution-candidates.json` | Generated: vocabulary values the curated maps do not cover yet                    |
| `prisma/data/ibex/vocabulary.ts`              | Typed mapping tables from IBEX vocabulary onto PanelMaker enums                   |
| `prisma/data/ibex/csv.ts`                     | Small RFC 4180 reader, the repo has no CSV dependency                             |
| `scripts/fetch-ibex-source.ts`                | Refresh step                                                                      |
| `scripts/import-ibex.ts`                      | Import step                                                                       |

## Field mapping

| IBEX column                    | PanelMaker target                                                              |
| ------------------------------ | ------------------------------------------------------------------------------ |
| UniProt Accession Number       | `Protein.id`, and `Antibody.targetProteinId`                                     |
| Reagent Type                   | filter (see decision 2), then `ExperimentalReport.notes`                         |
| Target Name / Protein Biomarker| `Antibody.targetName`, `Protein.label`                                           |
| Target Species                 | `Experiment.speciesId` (Taxon), `Antibody.targetSpecies[]`                       |
| Host Organism                  | `Antibody.hostTaxonId` (Taxon)                                                   |
| Isotype                        | `ExperimentalReport.notes` only, no schema field                                 |
| Clonality                      | `Antibody.clonality` + `Antibody.cloneId` (see decision 9)                        |
| Vendor                         | `Antibody.vendorName`, plus `vendorUrl` from `vendor_urls.csv`                   |
| Catalog Number                 | `Antibody.catalogNumber`                                                         |
| Conjugate                      | `ExperimentalReport.fluorophoreId` (Fluorophore), `Antibody.conjugate`           |
| RRID                           | `Antibody.rrid`, stored as `RRID:AB_xxxxxxx` to match the existing rows          |
| Availability                   | `ExperimentalReport.notes` only                                                  |
| Method                         | `Experiment.method` + exact string in `Experiment.name` and `description`        |
| Tissue Preservation            | `Experiment.fixation` + exact string in `Experiment.name` and `description`      |
| Target Tissue                  | `Experiment.tissueId` (UBERON), sometimes `conditionId` too                      |
| Tissue State                   | `Experiment.conditionId` (DOID) + exact string in `description`                  |
| Detergent                      | `ExperimentalReport.notes` only                                                  |
| Antigen Retrieval Conditions   | `Experiment.antigenRetrieval` + exact string in `description`                    |
| Dye Inactivation Conditions    | `ExperimentalReport.notes` only                                                  |
| Recommend                      | `ExperimentalReport.works`                                                       |
| Agree / Disagree / Contributor | `ExperimentalReport.notes` only (see decision 6)                                 |
| Image Files                    | `ReportImage.url`, pointing at the upstream repository                           |
| Captions                       | `ReportImage.caption`, positionally matched to `Image Files`                     |
| MD5                            | dropped, no checksum field anywhere                                              |

## Mapping decisions

**1. Report status is `PUBLISHED`, not `PENDING`.** These are curated community records in a versioned, publicly
released knowledge base, each with a named ORCID contributor, reviewed upstream before merge. `PENDING` means
"waiting for a PanelMaker reviewer", which would misrepresent them. `Recommend = No` becomes `works = false` on a
`PUBLISHED` report: a published negative result, which is exactly what the source says.

**2. Only the two antibody reagent types are imported.** `Primary Antibody` (1155 rows) and `Secondary Antibody`
(122 rows) become `Antibody` rows with a report each. The remaining 44 rows are skipped and listed by the importer:
nuclear dyes (14), streptavidin conjugates (8), Zenon labeling kits (7), lectins (5), FlexAble labeling kits (5),
blocking reagents (2), avidin/biotin blocking kits (2), one phalloidin stain. None of them is an antibody, and
PanelMaker has no reagent model that is not an antibody, so importing them would put "Hoechst 33342" and
"Avidin/Biotin Blocking Kit" into the antibody and marker browse surfaces. Attaching them to the primary they serve
is not possible: the table has no column linking a secondary or a kit to a primary.

Secondaries are kept rather than dropped because they carry RRIDs, host species and validated conditions, and the
panel host cross-reactivity check in `models/panel/intelligence.ts` works off host species. They get
`targetProteinId = null` and keep their target ("Rabbit IgG (H+L)") in `targetName`.

The two `Fc Block` rows are the one casualty worth naming: they are antibody-based blocking reagents with a real
RRID, skipped only because there is no field to mark a reagent as non-marker.

**3. Method.** `IBEX2D Manual`, `IBEX2D Automated`, `Cell DIVE-IBEX`, `Ce3D-IBEX` and `Opal-plex` all run the IBEX
iterative LiBH4 dye-inactivation protocol per the upstream glossary, so all five map to the `ibex` imaging method
(`EFO:0022996`, IBEX assay). `Multiplexed 2D Imaging` (single cycle) and `Ce3D` (clearing only) are not IBEX, so their
rows are not imported at all. The exact string is preserved in `Experiment.name` and `Experiment.description`, so no
variant is lost.

**4. Tissue preservation.** Cytofix/Cytoperm and AntigenFix are formaldehyde fixatives, so fixed-frozen sections made
with them map to `PFA`, not `FRESH_FROZEN` (which means frozen without fixative). `FFPE` maps to `FFPE`. All PFA
percentages and the agarose variant map to `PFA`. `10% Formalin for 7 Days` maps to `OTHER`: the tissue is heavily
formalin fixed but the source never says it was paraffin embedded, and `FFPE` would assert that. The exact string is
preserved on every experiment.

**5. Antigen retrieval.** AR6 Akoya, ER1 (AR9961) and the sodium citrate protocols are all citrate-type pH 6, so they
map to `CITRATE_PH6`. The Borg Decloaker at pH 9.5 maps to `TRIS_EDTA_PH9`. `NA` maps to `NONE`. The Leica Bond entry
that names **both** ER1 (pH 6) and ER2 (pH 9) in one string covers two different retrievals, so the enum is left
`null` on those 119 imported rows rather than silently picking one. The string is preserved either way.

**6. ORCIDs are recorded as text, not as users.** No accounts are invented for real people. `Contributor`, `Agree` and
`Disagree` ORCIDs go into `ExperimentalReport.notes`; `Experiment.submitterId` stays null. Note that `Agree` equals
`Contributor` on 1304 of 1321 rows, so it is mostly self-attestation rather than independent corroboration, and
`Disagree` is populated on exactly one row.

**7. One experiment per experimental context.** The grouping key is Target Species, Target Tissue, Tissue State,
Method, Tissue Preservation and Antigen Retrieval Conditions, which yields **104 experiments** over **1277 reports**.
Those six columns are exactly the ones that have a home on `Experiment`. Detergent would split the set into 109
groups, but `Experiment` has no detergent field, so detergent stays per report in `notes`. No two rows inside a group
share a reagent identity, so the report key (group + RRID + vendor + catalog + conjugate + target + host) is unique.

**8. Images are referenced, never downloaded.** `ReportImage.url` points at
`https://raw.githubusercontent.com/.../docs/supporting_material/<path>`, which was checked to return 200 for a sample
of the paths. Image references on imported rows become `ReportImage` rows. The `Captions` column is semicolon
separated and lines up one to one with `Image Files`, so each caption lands on the image it describes. The counts are
compared per row: a row whose two lists disagree is logged and imported without captions rather than guessed.

**9. Clonality.** The upstream `Clonality` column holds a clone ID for monoclonals, the literal `Polyclonal` for
polyclonals, the literal `Monoclonal` for 7 rows with no clone, and `NA` otherwise. A clone ID gives
`clonality = MONOCLONAL` plus `cloneId`; `Polyclonal` gives `POLYCLONAL` with no clone; `Monoclonal` gives
`MONOCLONAL` with no clone; `NA` leaves both null.

**10. Fluorophores resolve through the normalised table, and existing spectra are never overwritten.** A conjugate
string resolves first against an existing `Fluorophore` name or alias, then against `fluorescent_probes.csv`. Alexa
Fluor Plus dyes share the base dye spectra upstream, so `AF488 (Plus)`, `AF555 (Plus)` and `AF647 (Plus)` are added as
**aliases** of the existing rows instead of creating near-duplicates. Abbreviations such as `RB613` and `RY703` map to
their longer probe-table names, which become aliases. 70 of the 76 conjugates in imported rows resolve; 52 new
fluorophores were created from the probe table, 18 matched existing rows.

## Ontology resolution

Tissue and disease terms were resolved against OLS4 and **hand-checked**, because the automatic top hit is wrong often
enough to poison the anatomy. Three examples caught by hand: `Skin` returns *pedal digit skin*, `Prostate` returns
*prostate gland smooth muscle*, `Whole Foot` returns *sciatic nerve*. The curated values are `UBERON:0002097` skin of
body, `UBERON:0002367` prostate gland and `UBERON:0002387` pes. Every id in `ontology.resolved.json` was fetched back
by IRI and its label and obsolete flag checked.

Two source values are not anatomy at all: `Pancreatic Ductal Adenocarcinoma` becomes pancreas plus the condition
`DOID:3498`, and `Tumor` becomes no tissue plus the condition `DOID:162`.

Taxonomy ids come from NCBI E-utilities. One note: NCBI has reclassified the Armenian hamster under
*Nothocricetulus migratorius*, txid 3122392. Every taxon id is built by `taxonId()` in `prisma/data/ibex/vocabulary.ts`
from the single constant `TAXON_ID_PREFIX`, so the queued move from `NCBI:txid9606` to `NCBITaxon:9606` is a one-line
change.

## Idempotency

Every row is keyed on a natural key or a deterministic SHA-1 of one:

- `Experiment` `ibex_exp_<hash of the grouping key>`
- `ExperimentalReport` `ibex_rpt_<hash of grouping key + reagent identity>`
- `Antibody` upserted on `rrid` when present, otherwise `ibex_ab_<hash of vendor, catalog, conjugate, target, host>`
- `ReportImage` `ibex_img_<hash of report id + url>`
- `Protein`, `Taxon`, `Tissue`, `DiseaseCondition` keyed on their ontology id

Shared entities (`Protein`, `Antibody`, `Fluorophore`, and the ontology tables) are **filled in, never overwritten**:
the importer only writes a field that is currently null and only ever unions the array fields, so a re-run cannot stomp
curated PathoPlex data or FPbase-anchored spectra. Experiments, reports and images are IBEX-owned and written
authoritatively. Nothing is ever deleted.

## What had nowhere to go

| Data                                            | Why it was dropped or parked in notes                                     |
| ----------------------------------------------- | ------------------------------------------------------------------------- |
| Isotype (12 values, e.g. IgG2a, IgY, Fab2)       | no `Antibody.isotype` field                                                |
| Availability (Stock / Custom, 68 custom rows)    | no field for commercial availability                                       |
| Detergent (8 values)                             | no field on `Experiment` or `ExperimentalReport`                            |
| Dye inactivation conditions                      | no field; this is the core IBEX parameter                                   |
| Contributor / Agree / Disagree ORCIDs            | no ORCID-keyed contributor or consensus model                               |
| Image MD5 checksums                              | no checksum field                                                           |
| Exact Method / Preservation / Retrieval strings  | parked in `Experiment.description`; no raw-value column exists              |
| UniProt recommended protein name                 | `Protein` has only `label`, which holds the short marker name instead       |
| Second accession on 2 pan-reactive antibodies    | `Antibody.targetProteinId` is single valued                                 |
| 6 conjugates (APC, DL488, UT014, UT015, UT016, UT019) | no cited spectrum in either the probe table or the existing fluorophore table |

Two upstream quirks are carried through verbatim rather than corrected: `DL755` is listed with excitation 776 and
emission 754 in `fluorescent_probes.csv` (the maxima look swapped), and the probe table calls `RY703`
"RealYellow 704 (RY703)".

## Refreshing from upstream

1. `npm run ibex:fetch`. It overwrites the three CSVs, regenerates `proteins.resolved.json`, and writes
   `resolution-candidates.json`.
2. Read the `uncovered` block in `resolution-candidates.json`. It lists every new tissue, tissue state, species, host,
   method, preservation and retrieval value that the curated maps do not cover, with OLS4 and NCBI candidates next to
   it. It is currently empty for all of them.
3. Check the candidates by hand, then add the accepted terms to `ontology.resolved.json` or the enum maps in
   `prisma/data/ibex/vocabulary.ts`. The fetch step never edits the curated map itself.
4. `npm run ibex:import`. Rows whose grouping key or reagent identity changed upstream produce a new row; the old row
   is not removed, so a large upstream restructuring needs a manual sweep of `ibex_` prefixed ids.

## Known gaps

- Fluorophores created from the probe table have no `fpbaseId`. The memory note says the fluorophore table is
  FPbase-anchored; these 52 rows are anchored on the IBEX probe table instead, and an FPbase backfill is still owed.
- `Tissue.partOfIds` is left empty on newly created tissues rather than guessed.
- `ExperimentalReport.signalQuality` and `specificity` stay null. The source has no such grading, only the binary
  recommendation, and inventing a grade would be fabrication.
- `prisma/data/ontology.ts` in the base seed has two wrong UBERON ids that this import does **not** touch:
  `UBERON:0000082` is labelled "Lymph Node" but is *adult mammalian kidney*, and `UBERON:0001723` is labelled "Tonsil"
  but is *tongue*. The IBEX import uses the correct `UBERON:0000029` and `UBERON:0002372`, so the dev database now
  holds both the wrong seeded rows and the correct imported ones.
