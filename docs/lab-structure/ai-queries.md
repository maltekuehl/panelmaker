# Phase 7 - AI lab-scoped queries (design)

The assistant should answer open-ended spatial-proteomics questions by **composing a small set of
primitives**, not by having one function per question. This doc lists 20 complex queries we want
answerable, the primitive toolkit that covers them, and which primitives each query plugs together.

## Design principle

- **Few primitives, many compositions.** ~14 tools (resolve, evidence, inventory, lab, panel,
  recommend, detail). The model chains them; set math (intersect / diff / rank) happens in the
  workflow, occasionally helped by a thin convenience tool.
- **One evidence workhorse.** `findReports(filter, scope)` + `aggregateReports(...)` answer most
  evidence questions by varying the filter. Avoid a new query per question.
- **Viewer-scoped, fail-closed.** Every tool closes over the server-resolved `ViewerContext`. A
  model-supplied `labId` is intersected with `viewer.labIds`; anonymous/public callers only ever see
  `PUBLISHED + PUBLIC`. Reuses `buildReportVisibilityWhere(viewer)` (the two-lane model).
- **Cell-type hierarchy is mandatory.** "T cell" must match CD4/CD8 reports, so resolution expands
  descendants via a reverse `parentIds` index (`getCellTypeDescendantIds`).

## The 20 target queries

### A. Panel design & marker/antibody selection

1. Which markers distinguish CD4 vs CD8 T cells in mouse kidney, with evidence?
2. Build a starter TIME (tumor immune microenvironment) panel for human FFPE CODEX, preferring what
   my lab already stocks.
3. What's the best-validated antibody (signal quality + specificity + works rate) for CD68 on human
   FFPE tonsil for MIBI?
4. Does my panel have fluorophore spectral overlaps or host cross-reactivity conflicts?
5. Lay out these markers into cycles + fluorophore/channel assignments following panel-design best
   practices (see "Panel-layout best practices" below): labile/phospho-targets in early cycles,
   robust strong-signal markers in later cycles, bright fluorophores to weak/low-abundance targets,
   one compatible host species per cycle, minimal spectral overlap.

### B. Lab inventory, reuse & gaps

6. Is there a T-cell marker our lab stocks that a labmate used successfully on mouse tissue? (the
   original killer query)
7. Which antibodies do we stock that nobody in the lab has validated yet?
8. Which stocked antibodies are LOW / OUT_OF_STOCK but used in one of my active panels?
9. For this panel, which markers do we already own and which must we order?
10. Has anyone in my lab validated this RRID, on what tissue/species, with what result?

### C. Evidence, protocols & troubleshooting

11. CD3 failed for me on mouse spleen FFPE - what clones/dilutions/retrieval did others use that
    worked?
12. What dilution and antigen retrieval do people use for Ki-67 on human FFPE?
13. Which CD20 clones have the best works rate across all public reports?
14. For my intended marker set on human FFPE CODEX, which antigen-retrieval + fixation gives the most
    working markers? (protocol recommendation across a whole set, not one marker)
15. What markers are most often co-stained with FOXP3 in existing panels?

### D. Coverage, reuse & gaps

16. What cell types can our lab currently detect given our validated antibodies?
17. Across our lab's panels, which markers are reused most often (a candidate core panel)?
18. Suggest a validated, in-stock alternative (different clone/vendor) for a panel antibody that is
    LOW or OUT_OF_STOCK.
19. Show every lab report for the "T cell" family on any mouse tissue.
20. Which of our panels are public, and which of their markers still lack any validation evidence?

## Primitive toolkit

Resolution (NL text -> ids):

- `resolveMarkers(text)` -> proteins (UniProt id, gene symbol). Reuses `models/protein`.
- `resolveCellTypes(text, { expandDescendants })` -> cell types, optionally with all descendants.
  Needs **`getCellTypeDescendantIds(rootId)`** (new; reverse index over `CellType.parentIds`).
- `resolveTissues(text)`, `resolveSpecies(text)`, `resolveConditions(text)` -> UBERON / NCBI / DOID
  ids. Reuse `lib/ontology` + the model search fns.
- `resolveAntibodies(text|rrid)` -> antibodies. Reuses `models/antibody`.

Evidence (the workhorse, viewer-scoped):

- `findReports(filter, scope)` - filter = { markerIds?, cellTypeIds?, tissueIds?, speciesIds?,
  methods?, antibodyIds?, rrids?, hostTaxonIds?, clonalities?, conjugates?, fluorophoreIds?,
  works?, signalQualityMin?, specificity?, submitterIds?, conditionIds? }; scope = `public` | `mine`
  | `labIds[]`. Returns normalized rows (antibody, clone, dilution, antigen retrieval, fixation,
  method, works, quality, specificity, submitter, lab, image count, report link).
- `aggregateReports(filter, scope, groupBy)` - groupBy ∈ { antibody, clone, marker, tissue,
  dilution, antigenRetrieval, method, submitter }; returns per-group count, works-rate, avg signal
  quality. Powers protocol aggregation, clone comparison, expertise ranking.

Inventory & lab context:

- `listMyLabs()` -> viewer's labs (id, name, role, counts).
- `getLabInventory(labIds, { markerIds?, cellTypeIds?, hostTaxonIds?, clonalities?, status? })` ->
  stocked antibodies (joined to the global `Antibody`). Reuses Phase 6 `getLabInventory` + filters.
- `getLabContent(labIds, { type: experiments|reports|panels, visibility?, status? })` -> lab
  listings. Reuses `getLabExperimentEntries` / `getLabReportEntries` / `getLabPanelEntries`.

Panels:

- `getPanels({ scope: mine|labIds|public|panelId }, filter?)` -> panels + their markers
  (protein, antibody, fluorophore, metal). Reuses `models/panel`.
- `analyzePanel(panelId | markerSet)` -> conflict report: fluorophore spectral overlap + host
  cross-reactivity + channel/metal collisions. Reuses `models/panel/intelligence`
  (`checkFluorophoreOverlap` / `checkCrossReactivity`).
- `suggestPanelLayout(markers, { method, cycleCount? })` -> orders markers into cycles and assigns
  fluorophores/channels using the best-practice heuristics below, returns the layout + a per-decision
  rationale + residual conflicts (via `analyzePanel`). This is the engine behind query #5.

### Panel-layout best practices (heuristics for #5 / `suggestPanelLayout`)

Cyclic methods (CODEX / CyCIF / PhenoCycler) degrade tissue and signal across cycles, and indirect
detection constrains host species per cycle. The layout encodes:

1. **Labile / phospho-targets first.** Phospho-epitopes and other labile targets go in the earliest
   cycles, while the tissue is freshest. Detection heuristic: target name / gene matches a phospho or
   labile pattern (e.g. `phospho`, `p-`, `pSTAT`, `pERK`), or a curated labile set.
2. **Strong-signal / robust markers later.** Weak or low-abundance targets go early (best
   sensitivity); robust, high-signal markers tolerate later cycles. Signal strength is derived from
   historical `aggregateReports` signal-quality + works-rate for that antibody/marker.
3. **Match fluorophore to target by empirical contrast.** Each report carries a `signalQuality`
   (contrast) paired with the `fluorophore` it was imaged with, so `aggregateReports(groupBy
   fluorophore)` tells us which fluorophores actually produced strong contrast for a given
   marker/antibody. Use that empirical signal, plus the model's general fluorophore knowledge (e.g.
   lower autofluorescence at 647 than 488, brighter signal on some channels), to put hard-to-see /
   weak targets on the better channels. No curated brightness table is needed.
4. **One compatible host species per cycle.** For indirect detection, group antibodies so each cycle
   has a single / non-cross-reacting host species ("match different species across cycles"); flag
   conflicts the user must resolve with directly-conjugated antibodies.
5. **Minimal spectral overlap** among channels imaged together (reuses the overlap check).

`suggestPanelLayout` is a **signal-gathering** primitive, not a deterministic solver: it returns the
per-marker signals (phospho/labile flag, host species, historical signal strength + per-fluorophore
contrast via `aggregateReports`, and fluorophore spectra) and the model performs the cycle +
fluorophore assignment using the best-practice rules above (encoded in the system prompt) plus its
own fluorophore knowledge. `analyzePanel` then validates the model's proposed layout.

Data available today: report `signalQuality` + `fluorophore` (empirical contrast), fluorophore
`excitation`/`emission` (spectra), antibody `hostTaxon` (host species). The one new helper is a
phospho/labile detector: regex over target name/gene (`phospho`, `p-`, `pSTAT`, ...) plus a small
curated labile set. Output is advisory: the user still reviews and can pin assignments.

Recommendation (thin rankers over the evidence workhorse):

- `recommendAntibodiesForMarker(markerId, { species?, tissue?, method?, scope? })` -> antibodies
  ranked by works-rate, signal quality, specificity, citation count. Surfaces negative evidence
  inline (low works-rate / low specificity / failed reports) so weak antibodies are flagged in
  context, rather than needing a separate broad "what to avoid" query.
- `recommendMarkersForCellTypes(cellTypeIds, { species?, tissue?, method?, scope? })` -> validated
  markers ranked by evidence (cell types expanded first).
- `suggestPanel({ cellTypes|markers, species, tissue, method, preferLabIds? })` -> a candidate panel
  composed from the two recommenders + inventory preference + `analyzePanel`.

Detail:

- `getMarkerDetails(markerId)`, `getAntibodyDetails(rrid|id)` -> full entity context.

### Shared helpers (code, not tools)

- `getCellTypeDescendantIds(rootId)` - reverse `parentIds` index walk (new, `models/cell-type`).
- `buildReportVisibilityWhere(viewer)` - existing; the scope/fail-closed guard for every evidence tool.
- A single ranking function (works-rate x quality x specificity x citations x recency) shared by the
  recommenders and `aggregateReports`.
- Inventory <-> report join key is `Antibody.id` (the bridge that makes the killer query one join).

## Query -> primitive mapping

| # | Composition |
|---|---|
| 1 | resolveCellTypes(CD4,CD8) + resolveTissue + resolveSpecies -> recommendMarkersForCellTypes / findReports(groupBy marker) |
| 2 | resolveCellTypes(TIME set) -> recommendMarkersForCellTypes(scope public) -> getLabInventory(prefer) -> suggestPanel -> analyzePanel |
| 3 | resolveMarkers(CD68)+resolveTissue+resolveSpecies -> recommendAntibodiesForMarker(method MIBI) |
| 4 | getPanels(panelId) -> analyzePanel |
| 5 | (markerSet) + per-marker signals (phospho/labile flag, host species, signal strength via aggregateReports) + fluorophore brightness/spectra -> suggestPanelLayout -> analyzePanel |
| 6 | listMyLabs -> resolveCellTypes(T cell, expand) -> getLabInventory(labIds) ∩ findReports(scope mine, cellTypes expanded, species mouse, works true) |
| 7 | listMyLabs -> getLabInventory(labIds) \ aggregateReports(scope mine, groupBy antibody) |
| 8 | getPanels(mine).markers -> getLabInventory(status LOW/OUT) intersect |
| 9 | getPanels(panelId).markers -> getLabInventory(labIds) diff (own vs order) |
| 10 | resolveAntibodies(rrid) -> findReports(scope mine, rrids) |
| 11 | resolveMarkers(CD3)+tissue+species -> findReports(works true) + aggregateReports(groupBy clone/dilution/antigenRetrieval) |
| 12 | resolveMarkers(Ki-67)+tissue+species -> aggregateReports(groupBy dilution, antigenRetrieval) |
| 13 | resolveMarkers(CD20) -> aggregateReports(scope public, groupBy clone) |
| 14 | resolveMarkers(set)+resolveTissue+resolveSpecies -> aggregateReports(scope public, filter markerIds+tissue+method CODEX, groupBy antigenRetrieval then fixation) |
| 15 | resolveMarkers(FOXP3) -> getPanels(public/labIds) co-occurrence over panel markers |
| 16 | listMyLabs -> getLabInventory + findReports(scope mine, works true) -> map antibodies/markers -> cell types reachable |
| 17 | listMyLabs -> getPanels(scope labIds).markers -> count marker frequency across panels (candidate core panel) |
| 18 | getPanels(panelId).markers + getLabInventory(labIds, status LOW/OUT) -> for each OOS antibody: findReports(same markerId, works true) ranked, prefer in-stock |
| 19 | listMyLabs -> resolveCellTypes(T cell, expand) -> findReports(scope mine, cellTypes expanded, species mouse) |
| 20 | getPanels(mine, visibility PUBLIC).markers -> findReports(public, markerIds) -> markers with zero evidence |

## Cross-lab safety (defense in depth)

1. Code guard: tools close over the server `ViewerContext`; a model-supplied `labId` is intersected
   with `viewer.labIds` and returns `{ error }` on mismatch. Non-public reports are constrained to
   `viewer.labIds` on both the inventory side and the report side.
2. Prompt guard: a data-isolation clause in the system prompt (advisory only; the hard guard is code).

## Implementation plan

- `models/cell-type`: add `getCellTypeDescendantIds(rootId)`.
- `models/lab` (or `models/evidence`): add `findReports` / `aggregateReports` (viewer-scoped) and the
  recommenders, reusing existing report/inventory/panel queries + `buildReportVisibilityWhere`.
- `lib/chat-tools.ts`: convert `chatTools` -> `createChatTools(viewer)` exposing the primitives above
  (Vercel AI SDK v5 tools, Zod input schemas, each returning compact JSON).
- `app/api/chat/route.ts`: resolve the viewer, pass `createChatTools(viewer)`, extend the system
  prompt with the toolkit + data-isolation clause.
- Verify the 20 queries decompose correctly against the seed (the Puelles lab's mouse T-cell data
  backs #6/#16/#17/#19).
