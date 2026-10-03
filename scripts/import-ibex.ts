// Imports the IBEX Imaging Community knowledge base into PanelMaker.
//
// Source: IBEX Imaging Community, "Iterative Bleaching Extends Multiplexity (IBEX) Knowledge-Base",
// https://github.com/IBEXImagingCommunity/ibex_imaging_knowledge_base, licensed CC BY 4.0.
// The committed copies of reagent_resources.csv, fluorescent_probes.csv and vendor_urls.csv under
// prisma/data/ibex/ are redistributed unmodified under that licence; every experiment created here
// links to the IBEX DataSource row, which holds the attribution. Refresh them with `npm run ibex:fetch`.
//
// One Experiment per distinct experimental context (species, tissue, tissue state, method, tissue
// preservation, antigen retrieval), one ExperimentalReport per reagent row inside that context.
//
// Idempotent: everything is keyed on a natural key or a deterministic hash of one, shared entities
// (proteins, antibodies, fluorophores, ontology terms) are only ever filled in and never
// overwritten, and nothing is deleted. Safe to run twice.
//
//   npm run ibex:import
import "dotenv/config"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import path from "node:path"
import type { AntigenRetrieval, Clonality, Prisma } from "../lib/generated/prisma/client"
import { runScript } from "../prisma/client"
import { parseCsvRecords } from "../prisma/data/ibex/csv"
import {
  ANTIGEN_RETRIEVAL_MAP,
  CONJUGATE_ALIAS_OF,
  IBEX_ASSAY,
  IBEX_FIXATIVES,
  IBEX_SOURCE,
  IMAGING_METHOD_MAP,
  IMPORTED_REAGENT_TYPES,
  MONOCLONAL_CLONALITY_VALUE,
  NON_FLUOROPHORE_CONJUGATES,
  POLYCLONAL_CLONALITY_VALUE,
  PRESERVATION_MAP,
  RRID_PREFIX,
  SKIPPED_REAGENT_TYPE_PREFIXES,
  SKIPPED_REAGENT_TYPE_REASONS,
  isNa,
  taxonId,
  type IbexOntologyResolution,
  type IbexProteinResolution,
} from "../prisma/data/ibex/vocabulary"
import { storeEfoImagingMethod } from "../prisma/imaging-methods"

const DATA_DIR = path.join(process.cwd(), "prisma", "data", "ibex")

type Tally = { created: number; updated: number; unchanged: number }
const newTally = (): Tally => ({ created: 0, updated: 0, unchanged: 0 })
const showTally = (t: Tally): string => `${t.created} created, ${t.updated} updated, ${t.unchanged} unchanged`

function recordedOrNot(value: string): string {
  return isNa(value) ? "not recorded in the source" : value
}

function hashId(prefix: string, key: string, length: number): string {
  return `${prefix}${createHash("sha1").update(key).digest("hex").slice(0, length)}`
}

function mostCommon(values: string[]): string | null {
  const counts = new Map<string, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  return ranked.length > 0 ? ranked[0][0] : null
}

function unionSorted(...lists: string[][]): string[] {
  return [...new Set(lists.flat())].sort()
}

function sameStrings(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

function splitAccessions(raw: string): string[] {
  if (isNa(raw)) return []
  return raw
    .split(/[;,/]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
}

function splitList(raw: string): string[] {
  if (isNa(raw)) return []
  return raw
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
}

function clonalityOf(raw: string): { clonality: Clonality | null; cloneId: string | null } {
  if (isNa(raw)) return { clonality: null, cloneId: null }
  if (raw === POLYCLONAL_CLONALITY_VALUE) return { clonality: "POLYCLONAL", cloneId: null }
  if (raw === MONOCLONAL_CLONALITY_VALUE) return { clonality: "MONOCLONAL", cloneId: null }
  return { clonality: "MONOCLONAL", cloneId: raw }
}

function isBlank(value: string | undefined): boolean {
  const trimmed = (value ?? "").trim()
  return trimmed === "" || trimmed.toUpperCase() === "NA"
}

type Unmappable = { reason: string; detail: string; count?: number }

class UnmappableLog {
  private readonly entries = new Map<string, { count: number; examples: Set<string> }>()

  add({ reason, detail, count = 1 }: Unmappable): void {
    const entry = this.entries.get(reason) ?? { count: 0, examples: new Set<string>() }
    entry.count += count
    if (entry.examples.size < 4) entry.examples.add(detail)
    this.entries.set(reason, entry)
  }

  print(): void {
    if (this.entries.size === 0) {
      console.log("  nothing")
      return
    }
    for (const [reason, entry] of [...this.entries.entries()].sort((a, b) => b[1].count - a[1].count)) {
      console.log(`  ${String(entry.count).padStart(4)} rows  ${reason}`)
      for (const example of entry.examples) console.log(`             e.g. ${example}`)
    }
  }
}

runScript(async (prisma) => {
  await storeEfoImagingMethod(prisma, IBEX_ASSAY)
  const reagentRows = parseCsvRecords(readFileSync(path.join(DATA_DIR, "reagent_resources.csv"), "utf8"))
  const vendorRows = parseCsvRecords(readFileSync(path.join(DATA_DIR, "vendor_urls.csv"), "utf8"))
  const ontology = JSON.parse(
    readFileSync(path.join(DATA_DIR, "ontology.resolved.json"), "utf8"),
  ) as IbexOntologyResolution
  const proteinLookup = JSON.parse(
    readFileSync(path.join(DATA_DIR, "proteins.resolved.json"), "utf8"),
  ) as IbexProteinResolution

  const unmappable = new UnmappableLog()
  const vendorUrls = new Map(vendorRows.map((row) => [row["Vendor"], row["URL"]]))
  const rows = reagentRows.filter((row) => {
    const type = row["Reagent Type"]
    if (!IMPORTED_REAGENT_TYPES.has(type)) {
      const prefix = Object.keys(SKIPPED_REAGENT_TYPE_PREFIXES).find((key) => type.startsWith(key))
      const reason = SKIPPED_REAGENT_TYPE_REASONS[type] ?? (prefix ? SKIPPED_REAGENT_TYPE_PREFIXES[prefix] : "unknown")
      unmappable.add({
        reason: `reagent type "${prefix ?? type}" not imported: ${reason}`,
        detail: `${row["Target Name / Protein Biomarker"]} (${row["Vendor"]} ${row["Catalog Number"]})`,
      })
      return false
    }

    // Identity gate. An antibody row without an RRID cannot be resolved against the Antibody Registry,
    // so it would land as unlinkable free text. A primary antibody without a UniProt accession cannot be
    // attached to a marker. Neither is worth importing: the record is not actionable for panel design.
    if (isBlank(row["RRID"])) {
      unmappable.add({
        reason: "no RRID, an antibody must resolve to an Antibody Registry record",
        detail: `${row["Target Name / Protein Biomarker"]} (${row["Vendor"]} ${row["Catalog Number"]})`,
      })
      return false
    }
    if (!IMAGING_METHOD_MAP[row["Method"]]) {
      unmappable.add({
        reason: `method "${row["Method"]}" is not an IBEX protocol, so the record says nothing about IBEX`,
        detail: `${row["Target Name / Protein Biomarker"]} (${row["Vendor"]} ${row["Catalog Number"]})`,
      })
      return false
    }
    if (type === "Primary Antibody" && isBlank(row["UniProt Accession Number"])) {
      unmappable.add({
        reason: "primary antibody has no UniProt accession, so it cannot be linked to a marker",
        detail: `${row["Target Name / Protein Biomarker"]} (${row["Vendor"]} ${row["Catalog Number"]})`,
      })
      return false
    }

    return true
  })

  // --- Ontology terms ---

  const taxaNeeded = new Map<string, string>()
  const tissuesNeeded = new Map<string, string>()
  const conditionsNeeded = new Map<string, string>()

  for (const row of rows) {
    const species = ontology.targetSpecies[row["Target Species"]]
    if (species) taxaNeeded.set(taxonId(species.ncbiTaxId), species.label)
    else unmappable.add({ reason: `target species has no NCBI taxon`, detail: row["Target Species"] })

    const host = ontology.hostOrganisms[row["Host Organism"]]
    if (host) taxaNeeded.set(taxonId(host.ncbiTaxId), host.label)

    const tissue = ontology.targetTissues[row["Target Tissue"]]
    if (tissue?.uberonId && tissue.uberonLabel) tissuesNeeded.set(tissue.uberonId, tissue.uberonLabel)
    else unmappable.add({ reason: `target tissue has no UBERON term`, detail: row["Target Tissue"] })
    if (tissue?.diseaseId && tissue.diseaseLabel) conditionsNeeded.set(tissue.diseaseId, tissue.diseaseLabel)

    const state = ontology.tissueStates[row["Tissue State"]]
    if (state) conditionsNeeded.set(state.id, state.label)
  }

  const taxonTally = newTally()
  const existingTaxa = new Set(
    (await prisma.taxon.findMany({ where: { id: { in: [...taxaNeeded.keys()] } }, select: { id: true } })).map(
      (taxon) => taxon.id,
    ),
  )
  for (const [id, label] of taxaNeeded) {
    if (existingTaxa.has(id)) {
      taxonTally.unchanged += 1
      continue
    }
    await prisma.taxon.create({ data: { id, label } })
    taxonTally.created += 1
  }

  const tissueTally = newTally()
  const existingTissues = new Set(
    (await prisma.tissue.findMany({ where: { id: { in: [...tissuesNeeded.keys()] } }, select: { id: true } })).map(
      (tissue) => tissue.id,
    ),
  )
  for (const [id, label] of tissuesNeeded) {
    if (existingTissues.has(id)) {
      tissueTally.unchanged += 1
      continue
    }
    await prisma.tissue.create({ data: { id, label, partOfIds: [] } })
    tissueTally.created += 1
  }

  const conditionTally = newTally()
  const existingConditions = new Set(
    (
      await prisma.diseaseCondition.findMany({
        where: { id: { in: [...conditionsNeeded.keys()] } },
        select: { id: true },
      })
    ).map((condition) => condition.id),
  )
  for (const [id, label] of conditionsNeeded) {
    if (existingConditions.has(id)) {
      conditionTally.unchanged += 1
      continue
    }
    await prisma.diseaseCondition.create({ data: { id, label } })
    conditionTally.created += 1
  }

  const source = {
    name: IBEX_SOURCE.name,
    url: IBEX_SOURCE.repo,
    license: IBEX_SOURCE.licence,
    attribution: IBEX_SOURCE.attribution,
  }
  await prisma.dataSource.upsert({
    where: { id: IBEX_SOURCE.id },
    update: source,
    create: { id: IBEX_SOURCE.id, ...source },
  })

  const fixativeTally = newTally()
  for (const fixative of IBEX_FIXATIVES) {
    const existing = await prisma.fixative.findUnique({ where: { id: fixative.id }, select: { id: true } })
    if (existing) {
      fixativeTally.unchanged += 1
      continue
    }
    await prisma.fixative.create({ data: fixative })
    fixativeTally.created += 1
  }

  // --- Fluorophores ---

  const conjugates = [...new Set(rows.map((row) => row["Conjugate"]))].filter(
    (conjugate) => !NON_FLUOROPHORE_CONJUGATES.has(conjugate),
  )
  const fluorophoreTally = newTally()
  const fluorophoreIdByConjugate = new Map<string, string>()
  const allFluorophores = await prisma.fluorophore.findMany({ select: { id: true, name: true, aliases: true } })
  const fluorophoreByKey = new Map<string, { id: string; name: string; aliases: string[] }>()
  for (const fluorophore of allFluorophores) {
    fluorophoreByKey.set(fluorophore.name.toLowerCase(), fluorophore)
    for (const alias of fluorophore.aliases) fluorophoreByKey.set(alias.toLowerCase(), fluorophore)
  }

  for (const conjugate of conjugates.sort()) {
    const canonical = CONJUGATE_ALIAS_OF[conjugate] ?? conjugate
    const existing = fluorophoreByKey.get(canonical.toLowerCase())
    if (existing) {
      fluorophoreIdByConjugate.set(conjugate, existing.id)
      if (canonical.toLowerCase() === existing.name.toLowerCase() && canonical === conjugate) {
        fluorophoreTally.unchanged += 1
        continue
      }
      if (fluorophoreByKey.has(conjugate.toLowerCase())) {
        fluorophoreTally.unchanged += 1
        continue
      }
      const aliases = unionSorted(existing.aliases, [conjugate])
      await prisma.fluorophore.update({ where: { id: existing.id }, data: { aliases } })
      existing.aliases = aliases
      fluorophoreByKey.set(conjugate.toLowerCase(), existing)
      fluorophoreTally.updated += 1
      continue
    }

    // The Fluorophore table is anchored on FPbase: every row is expected to carry an fpbaseId so panel
    // intelligence can score real spectral overlap. The IBEX probe table gives excitation and emission
    // peaks but no FPbase identity, and many of its entries (Bio-Rad StarBright, Miltenyi Vio, BioLegend
    // Spark, Proteintech CoraLite, AAT iFluor) are simply not in FPbase. Creating rows for them would put
    // unanchored fluorophores in the catalog and silently downgrade every panel check that touches them,
    // so the conjugate is recorded on the report and the fluorophore link is left empty instead.
    unmappable.add({
      reason: "conjugate is not in the FPbase-anchored fluorophore catalog, report left without a fluorophore",
      detail: conjugate,
    })
  }

  // --- Proteins ---

  const proteinLabels = new Map<string, string[]>()
  for (const row of rows) {
    const accessions = splitAccessions(row["UniProt Accession Number"])
    if (accessions.length > 1) {
      unmappable.add({
        reason: "row lists several UniProt accessions but an antibody can only point at one protein",
        detail: `${row["Target Name / Protein Biomarker"]}: ${accessions.join(", ")}`,
      })
    }
    for (const accession of accessions) {
      proteinLabels.set(accession, [...(proteinLabels.get(accession) ?? []), row["Target Name / Protein Biomarker"]])
    }
  }

  const proteinTally = newTally()
  const existingProteins = new Map(
    (
      await prisma.protein.findMany({
        where: { id: { in: [...proteinLabels.keys()] } },
        select: { id: true, label: true, geneSymbol: true },
      })
    ).map((protein) => [protein.id, protein]),
  )
  for (const [accession, labels] of [...proteinLabels.entries()].sort()) {
    const resolved = proteinLookup.accessions[accession]
    const label = mostCommon(labels.filter((value) => !isNa(value))) ?? resolved?.label ?? accession
    const geneSymbol = resolved?.geneSymbol ?? null
    const existing = existingProteins.get(accession)
    if (!existing) {
      await prisma.protein.create({ data: { id: accession, label, geneSymbol } })
      proteinTally.created += 1
      continue
    }
    if (!existing.geneSymbol && geneSymbol) {
      await prisma.protein.update({ where: { id: accession }, data: { geneSymbol } })
      proteinTally.updated += 1
      continue
    }
    proteinTally.unchanged += 1
  }

  // --- Antibodies ---

  type AntibodyDraft = {
    key: string
    rrid: string | null
    rows: Record<string, string>[]
  }
  const drafts = new Map<string, AntibodyDraft>()
  const antibodyKeyByRow = new Map<Record<string, string>, string>()
  for (const row of rows) {
    const rrid = isNa(row["RRID"]) ? null : `${RRID_PREFIX}${row["RRID"]}`
    const key = rrid
      ? `rrid:${rrid}`
      : `nk:${row["Vendor"]}|${row["Catalog Number"]}|${row["Conjugate"]}|${row["Target Name / Protein Biomarker"]}|${row["Host Organism"]}`
    const draft = drafts.get(key) ?? { key, rrid, rows: [] }
    draft.rows.push(row)
    drafts.set(key, draft)
    antibodyKeyByRow.set(row, key)
  }

  const antibodyTally = newTally()
  const antibodyIdByKey = new Map<string, string>()
  const draftList = [...drafts.values()].sort((a, b) => a.key.localeCompare(b.key))
  const deterministicIds = new Map(draftList.map((draft) => [draft.key, hashId("ibex_ab_", draft.key, 16)]))
  const existingByRrid = new Map(
    (
      await prisma.antibody.findMany({
        where: { rrid: { in: draftList.filter((d) => d.rrid).map((d) => d.rrid as string) } },
      })
    ).map((antibody) => [antibody.rrid as string, antibody]),
  )
  const existingById = new Map(
    (await prisma.antibody.findMany({ where: { id: { in: [...deterministicIds.values()] } } })).map((antibody) => [
      antibody.id,
      antibody,
    ]),
  )

  for (const draft of draftList) {
    const targetName = mostCommon(
      draft.rows.map((row) => row["Target Name / Protein Biomarker"]).filter((v) => !isNa(v)),
    )
    const vendorName = mostCommon(draft.rows.map((row) => row["Vendor"]).filter((v) => !isNa(v)))
    const catalogNumber = mostCommon(draft.rows.map((row) => row["Catalog Number"]).filter((v) => !isNa(v)))
    const { clonality, cloneId } = clonalityOf(mostCommon(draft.rows.map((row) => row["Clonality"])) ?? "NA")
    const host = ontology.hostOrganisms[mostCommon(draft.rows.map((row) => row["Host Organism"])) ?? "NA"]
    const conjugateValues = [...new Set(draft.rows.map((row) => row["Conjugate"]))]
    const conjugate = conjugateValues.length === 1 && !isNa(conjugateValues[0]) ? conjugateValues[0] : null
    if (conjugateValues.length > 1) {
      unmappable.add({
        reason: "one RRID appears with several conjugates, antibody conjugate left empty (each report keeps its own)",
        detail: `${draft.rrid ?? draft.key}: ${conjugateValues.join(", ")}`,
      })
    }
    const accessions = unionSorted(draft.rows.flatMap((row) => splitAccessions(row["UniProt Accession Number"])))
    const targetSpecies = unionSorted(draft.rows.map((row) => row["Target Species"]).filter((v) => !isNa(v)))
    const usesIbex = draft.rows.some((row) => IMAGING_METHOD_MAP[row["Method"]] === IBEX_ASSAY)
    const applications = usesIbex ? ["IBEX", "IF"] : ["IF"]
    const namePieces = [
      targetName ?? "Unnamed reagent",
      cloneId ? `clone ${cloneId}` : clonality === "POLYCLONAL" ? "polyclonal" : "",
      conjugate ?? "",
    ].filter((piece) => piece.length > 0)
    const vendorSuffix = vendorName ? ` (${[vendorName, catalogNumber].filter(Boolean).join(" ")})` : ""
    const name = `${namePieces.join(" ")}${vendorSuffix}`

    const desired = {
      name,
      catalogNumber,
      cloneId,
      clonality,
      hostTaxonId: host ? taxonId(host.ncbiTaxId) : null,
      targetSpecies,
      targetProteinId: accessions[0] ?? null,
      targetName,
      applications,
      conjugate,
      vendorName,
      vendorUrl: vendorName ? (vendorUrls.get(vendorName) ?? null) : null,
    }

    const id = deterministicIds.get(draft.key) as string
    const existing = draft.rrid ? (existingByRrid.get(draft.rrid) ?? existingById.get(id)) : existingById.get(id)
    if (!existing) {
      await prisma.antibody.create({ data: { id, rrid: draft.rrid, ...desired } })
      antibodyIdByKey.set(draft.key, id)
      antibodyTally.created += 1
      continue
    }

    antibodyIdByKey.set(draft.key, existing.id)
    const patch: Prisma.AntibodyUncheckedUpdateInput = {}
    if (!existing.rrid && draft.rrid) patch.rrid = draft.rrid
    if (!existing.catalogNumber && desired.catalogNumber) patch.catalogNumber = desired.catalogNumber
    if (!existing.cloneId && desired.cloneId) patch.cloneId = desired.cloneId
    if (!existing.clonality && desired.clonality) patch.clonality = desired.clonality
    if (!existing.hostTaxonId && desired.hostTaxonId) patch.hostTaxonId = desired.hostTaxonId
    if (!existing.targetProteinId && desired.targetProteinId) patch.targetProteinId = desired.targetProteinId
    if (!existing.targetName && desired.targetName) patch.targetName = desired.targetName
    if (!existing.conjugate && desired.conjugate) patch.conjugate = desired.conjugate
    if (!existing.vendorName && desired.vendorName) patch.vendorName = desired.vendorName
    if (!existing.vendorUrl && desired.vendorUrl) patch.vendorUrl = desired.vendorUrl
    const mergedSpecies = unionSorted(existing.targetSpecies, desired.targetSpecies)
    if (!sameStrings(mergedSpecies, [...existing.targetSpecies].sort())) patch.targetSpecies = mergedSpecies
    const mergedApplications = unionSorted(existing.applications, desired.applications)
    if (!sameStrings(mergedApplications, [...existing.applications].sort())) patch.applications = mergedApplications

    if (Object.keys(patch).length === 0) {
      antibodyTally.unchanged += 1
      continue
    }
    await prisma.antibody.update({ where: { id: existing.id }, data: patch })
    antibodyTally.updated += 1
  }

  // --- Experiments ---

  const groupColumns = [
    "Target Species",
    "Target Tissue",
    "Tissue State",
    "Method",
    "Tissue Preservation",
    "Antigen Retrieval Conditions",
  ]
  const groups = new Map<string, { row: Record<string, string>; rows: Record<string, string>[] }>()
  for (const row of rows) {
    const key = groupColumns.map((column) => row[column]).join("||")
    const group = groups.get(key) ?? { row, rows: [] }
    group.rows.push(row)
    groups.set(key, group)
  }

  const experimentTally = newTally()
  const experimentIdByGroup = new Map<string, string>()
  const groupList = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  const experimentIds = new Map(groupList.map(([key]) => [key, hashId("ibex_exp_", key, 12)]))
  const existingExperiments = new Map(
    (await prisma.experiment.findMany({ where: { id: { in: [...experimentIds.values()] } } })).map((experiment) => [
      experiment.id,
      experiment,
    ]),
  )

  for (const [key, group] of groupList) {
    const row = group.row
    const id = experimentIds.get(key) as string
    experimentIdByGroup.set(key, id)
    const species = ontology.targetSpecies[row["Target Species"]]
    const tissue = ontology.targetTissues[row["Target Tissue"]]
    const state = ontology.tissueStates[row["Tissue State"]]
    const preservationKey = row["Tissue Preservation"]
    const preservation = PRESERVATION_MAP[preservationKey] ?? null
    const retrievalKey = row["Antigen Retrieval Conditions"]
    const antigenRetrieval: AntigenRetrieval | null =
      retrievalKey in ANTIGEN_RETRIEVAL_MAP ? ANTIGEN_RETRIEVAL_MAP[retrievalKey] : null
    if (retrievalKey in ANTIGEN_RETRIEVAL_MAP && ANTIGEN_RETRIEVAL_MAP[retrievalKey] === null) {
      unmappable.add({
        reason: "antigen retrieval names two different protocols, enum left empty and the protocol text kept",
        detail: retrievalKey,
        count: group.rows.length,
      })
    }

    const stateSuffix = isNa(row["Tissue State"]) ? "" : `, ${row["Tissue State"]}`
    const name = `IBEX: ${row["Target Species"]} ${row["Target Tissue"]}${stateSuffix} (${row["Method"]}, ${row["Tissue Preservation"]})`
    const description = [
      "Reagent validations from the IBEX Imaging Community knowledge base.",
      `Target species: ${row["Target Species"]}.`,
      `Target tissue as recorded: ${row["Target Tissue"]}.`,
      `Tissue state: ${recordedOrNot(row["Tissue State"])}.`,
      `Method: ${row["Method"]}.`,
      `Tissue preservation: ${recordedOrNot(row["Tissue Preservation"])}.`,
      `Antigen retrieval: ${recordedOrNot(retrievalKey)}.`,
      `${group.rows.length} reagent records.`,
    ].join(" ")
    const desired = {
      name,
      description,
      citation: null,
      sourceId: IBEX_SOURCE.id,
      speciesId: species ? taxonId(species.ncbiTaxId) : null,
      tissueId: tissue?.uberonId ?? null,
      conditionId: tissue?.diseaseId ?? state?.id ?? null,
      preservation: preservation?.preservation ?? null,
      // The upstream column is a sentence, not a vocabulary term, so it is always kept verbatim.
      preservationText: isNa(preservationKey) ? null : preservationKey,
      fixativeId: preservation?.fixativeId ?? null,
      fixativeConcentration: preservation?.concentration ?? null,
      // 119 rows name both ER1 (pH 6) and ER2 (pH 9); no enum value is honest for those, and before
      // this field the protocol was dropped entirely.
      antigenRetrievalText: isNa(retrievalKey) ? null : retrievalKey,
      sampleType: "TISSUE" as const,
      imagingMethodId: IMAGING_METHOD_MAP[row["Method"]] ?? null,
      antigenRetrieval,
      visibility: "PUBLIC" as const,
    }

    const existing = existingExperiments.get(id)
    if (!existing) {
      await prisma.experiment.create({ data: { id, ...desired } })
      experimentTally.created += 1
      continue
    }
    const changed = (Object.keys(desired) as (keyof typeof desired)[]).some(
      (field) => existing[field] !== desired[field],
    )
    if (!changed) {
      experimentTally.unchanged += 1
      continue
    }
    await prisma.experiment.update({ where: { id }, data: desired })
    experimentTally.updated += 1
  }

  // --- Reports and images ---

  const reportTally = newTally()
  const imageTally = newTally()
  const reportPlans: {
    id: string
    groupKey: string
    row: Record<string, string>
    data: {
      experimentId: string
      antibodyId: string | null
      fluorophoreId: string | null
      status: "PUBLISHED"
      recommendation: "RECOMMENDED" | "NOT_RECOMMENDED"
      notes: string
    }
  }[] = []

  for (const [groupKey, group] of groupList) {
    for (const row of group.rows) {
      const antibodyKey = antibodyKeyByRow.get(row) as string
      const reagentKey = [
        row["RRID"],
        row["Vendor"],
        row["Catalog Number"],
        row["Conjugate"],
        row["Target Name / Protein Biomarker"],
        row["Host Organism"],
      ].join("|")
      const id = hashId("ibex_rpt_", `${groupKey}||${reagentKey}`, 16)
      // One fact per line: these render in a table cell, and a single long paragraph makes the table
      // unreadable. Values the source records as "NA" are omitted rather than shown as missing text.
      const notes = [
        ["IBEX reagent type", row["Reagent Type"]],
        ["Isotype", row["Isotype"]],
        ["Availability", row["Availability"]],
        ["Detergent", row["Detergent"]],
        ["Dye inactivation", row["Dye Inactivation Conditions"]],
        ["Conjugate as recorded", row["Conjugate"]],
        ["Contributor ORCID", row["Contributor"]],
        ["Disagree ORCID", row["Disagree"]],
      ]
        .filter(([, value]) => value && value.trim() !== "" && value.trim().toUpperCase() !== "NA")
        .map(([label, value]) => `${label}: ${value.trim()}`)
        .join("\n")

      reportPlans.push({
        id,
        groupKey,
        row,
        data: {
          experimentId: experimentIdByGroup.get(groupKey) as string,
          antibodyId: antibodyIdByKey.get(antibodyKey) ?? null,
          fluorophoreId: fluorophoreIdByConjugate.get(row["Conjugate"]) ?? null,
          status: "PUBLISHED",
          recommendation: row["Recommend"] === "Yes" ? "RECOMMENDED" : "NOT_RECOMMENDED",
          notes,
        },
      })
    }
  }

  const existingReports = new Map(
    (await prisma.experimentalReport.findMany({ where: { id: { in: reportPlans.map((plan) => plan.id) } } })).map(
      (report) => [report.id, report],
    ),
  )
  for (const plan of reportPlans) {
    const existing = existingReports.get(plan.id)
    if (!existing) {
      await prisma.experimentalReport.create({ data: { id: plan.id, ...plan.data } })
      reportTally.created += 1
    } else {
      const changed = (Object.keys(plan.data) as (keyof typeof plan.data)[]).some(
        (field) => existing[field] !== plan.data[field],
      )
      if (changed) {
        await prisma.experimentalReport.update({ where: { id: plan.id }, data: plan.data })
        reportTally.updated += 1
      } else {
        reportTally.unchanged += 1
      }
    }
  }

  // Captions are a semicolon separated list that lines up positionally with Image Files. That holds for
  // every row of the committed table, but an upstream refresh could break it, and a caption attached to
  // the wrong image is worse than no caption, so a row whose two lists differ in length is reported and
  // imported without captions.
  //
  // One image per experiment and file: a picture listed by several reagent rows is one field of view with
  // a channel per reagent. No display colour is set, because the source tables do not record one as data.
  type ImagePlan = {
    experimentId: string
    url: string
    caption: string | null
    sortOrder: number
    targets: string[]
    nuclear: string[]
  }
  const imagePlans = new Map<string, ImagePlan>()
  const imageUrl = (file: string) => `${IBEX_SOURCE.imageBase}/${file.split("/").map(encodeURIComponent).join("/")}`
  const imageKey = (experimentId: string, url: string) => `${experimentId}|${url}`

  for (const plan of reportPlans) {
    const files = splitList(plan.row["Image Files"])
    const captions = splitList(plan.row["Captions"])
    const captionsAligned = captions.length === files.length
    if (captions.length > 0 && !captionsAligned) {
      unmappable.add({
        reason: "captions do not line up one to one with image files, imported without captions",
        detail: `${plan.row["RRID"]}: ${files.length} image files, ${captions.length} captions`,
      })
    }
    files.forEach((file, index) => {
      const url = imageUrl(file)
      const key = imageKey(plan.data.experimentId, url)
      const caption = captionsAligned ? (captions[index] ?? null) : null
      const image = imagePlans.get(key) ?? {
        experimentId: plan.data.experimentId,
        url,
        caption,
        sortOrder: index,
        targets: [],
        nuclear: [],
      }
      image.caption ??= caption
      image.sortOrder = Math.min(image.sortOrder, index)
      if (!image.targets.includes(plan.id)) image.targets.push(plan.id)
      imagePlans.set(key, image)
    })
  }

  // Nuclear dye rows are not reports, but a dye row that lists the same image file as an antibody of the
  // same experimental context records which counterstain that picture carries.
  for (const row of reagentRows) {
    if (row["Reagent Type"] !== "Nuclear Dye" || isNa(row["Target Name / Protein Biomarker"])) continue
    const experimentId = experimentIdByGroup.get(groupColumns.map((column) => row[column]).join("||"))
    if (!experimentId) continue
    for (const file of splitList(row["Image Files"])) {
      const image = imagePlans.get(imageKey(experimentId, imageUrl(file)))
      const label = row["Target Name / Protein Biomarker"]
      if (image && !image.nuclear.includes(label)) image.nuclear.push(label)
    }
  }

  const existingImages = await prisma.image.findMany({
    where: { experimentId: { startsWith: "ibex_" } },
    select: {
      id: true,
      experimentId: true,
      url: true,
      caption: true,
      sortOrder: true,
      channels: { select: { role: true, reportId: true, label: true, sortOrder: true } },
    },
  })
  const existingImageByKey = new Map(existingImages.map((image) => [imageKey(image.experimentId, image.url), image]))
  const channelSignature = (
    channels: { role: string; reportId: string | null; label: string | null; sortOrder: number }[],
  ) =>
    channels
      .map((channel) => `${channel.role}|${channel.reportId ?? ""}|${channel.label ?? ""}|${channel.sortOrder}`)
      .sort()
      .join(";")

  for (const [key, plan] of imagePlans) {
    const channels: { role: "TARGET" | "NUCLEAR"; reportId: string | null; label: string | null; sortOrder: number }[] =
      [
        ...plan.targets.map((reportId, index) => ({
          role: "TARGET" as const,
          reportId,
          label: null,
          sortOrder: index,
        })),
        ...plan.nuclear.map((label, index) => ({
          role: "NUCLEAR" as const,
          reportId: null,
          label,
          sortOrder: plan.targets.length + index,
        })),
      ]
    const existing = existingImageByKey.get(key)
    if (!existing) {
      await prisma.image.create({
        data: {
          experimentId: plan.experimentId,
          url: plan.url,
          caption: plan.caption,
          sortOrder: plan.sortOrder,
          channels: { createMany: { data: channels } },
        },
      })
      imageTally.created += 1
      continue
    }
    const sameImage = existing.caption === plan.caption && existing.sortOrder === plan.sortOrder
    const sameChannels = channelSignature(existing.channels) === channelSignature(channels)
    if (sameImage && sameChannels) {
      imageTally.unchanged += 1
      continue
    }
    await prisma.$transaction([
      prisma.image.update({ where: { id: existing.id }, data: { caption: plan.caption, sortOrder: plan.sortOrder } }),
      prisma.imageChannel.deleteMany({ where: { imageId: existing.id } }),
      prisma.imageChannel.createMany({ data: channels.map((channel) => ({ ...channel, imageId: existing.id })) }),
    ])
    imageTally.updated += 1
  }

  // --- Retract rows this import no longer produces ---
  // The gate above can reject a row that an earlier run accepted, and upstream can retract a reagent.
  // Everything this script writes carries an "ibex_" id prefix, so anything with that prefix which is not
  // in the current plan is stale and is removed (images are matched on experiment and file instead). Order
  // follows the foreign keys: images, reports, then antibodies (ExperimentalReport.antibody is onDelete
  // Restrict, so reports have to go first).
  const keptReportIds = new Set(reportPlans.map((plan) => plan.id))
  const keptAntibodyIds = new Set(antibodyIdByKey.values())
  const keptExperimentIds = new Set(experimentIdByGroup.values())

  const staleImages = existingImages.filter((image) => !imagePlans.has(imageKey(image.experimentId, image.url)))
  const staleReports = (
    await prisma.experimentalReport.findMany({ where: { id: { startsWith: "ibex_" } }, select: { id: true } })
  ).filter((row) => !keptReportIds.has(row.id))
  const staleExperiments = (
    await prisma.experiment.findMany({ where: { id: { startsWith: "ibex_" } }, select: { id: true } })
  ).filter((row) => !keptExperimentIds.has(row.id))
  const staleAntibodies = (
    await prisma.antibody.findMany({ where: { id: { startsWith: "ibex_" } }, select: { id: true } })
  ).filter((row) => !keptAntibodyIds.has(row.id))

  if (staleImages.length > 0) {
    await prisma.image.deleteMany({ where: { id: { in: staleImages.map((row) => row.id) } } })
  }
  if (staleReports.length > 0) {
    await prisma.experimentalReport.deleteMany({ where: { id: { in: staleReports.map((row) => row.id) } } })
  }
  if (staleExperiments.length > 0) {
    await prisma.experiment.deleteMany({ where: { id: { in: staleExperiments.map((row) => row.id) } } })
  }
  if (staleAntibodies.length > 0) {
    await prisma.antibody.deleteMany({ where: { id: { in: staleAntibodies.map((row) => row.id) } } })
  }

  // --- Summary ---

  console.log("IBEX knowledge base import complete.")
  console.log(`  source rows:         ${reagentRows.length} (${rows.length} antibody rows imported)`)
  console.log(`  taxa:                ${showTally(taxonTally)}`)
  console.log(`  tissues:             ${showTally(tissueTally)}`)
  console.log(`  disease conditions:  ${showTally(conditionTally)}`)
  console.log(`  fixatives:           ${showTally(fixativeTally)}`)
  console.log(`  fluorophores:        ${showTally(fluorophoreTally)}`)
  console.log(`  proteins:            ${showTally(proteinTally)}`)
  console.log(`  antibodies:          ${showTally(antibodyTally)}`)
  console.log(`  experiments:         ${showTally(experimentTally)}`)
  console.log(`  reports:             ${showTally(reportTally)}`)
  console.log(`  images:              ${showTally(imageTally)}`)
  console.log(
    `  retracted:           ${staleAntibodies.length} antibodies, ${staleExperiments.length} experiments, ` +
      `${staleReports.length} reports, ${staleImages.length} images`,
  )
  console.log("\nCould not map:")
  unmappable.print()
})
