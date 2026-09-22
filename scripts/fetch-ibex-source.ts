// Refreshes the committed IBEX Imaging Community source tables and the generated UniProt lookup,
// then reports any controlled-vocabulary value the curated maps do not cover yet.
//
// Source: IBEX Imaging Community, "Iterative Bleaching Extends Multiplexity (IBEX) Knowledge-Base"
// https://github.com/IBEXImagingCommunity/ibex_imaging_knowledge_base, licensed CC BY 4.0.
//
// This script never edits ontology.resolved.json. Ontology hits are written to
// resolution-candidates.json for a human to check, because an OLS4 top hit is wrong often enough
// that automatic acceptance would poison the anatomy in the database.
//
//   npm run ibex:fetch
import "dotenv/config"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { parseCsvRecords } from "../prisma/data/ibex/csv"
import {
  ANTIGEN_RETRIEVAL_MAP,
  IBEX_SOURCE,
  IMAGING_METHOD_MAP,
  IMPORTED_REAGENT_TYPES,
  isNa,
  PRESERVATION_MAP,
  type IbexOntologyResolution,
  type IbexProteinResolution,
} from "../prisma/data/ibex/vocabulary"

const DATA_DIR = path.join(process.cwd(), "prisma", "data", "ibex")
const OLS4 = "https://www.ebi.ac.uk/ols4/api/search"
const EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
const UNIPROT = "https://rest.uniprot.org/uniprotkb/search"

type Candidate = { id: string | null; label: string | null }

async function getJson(url: string): Promise<any> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(url, { headers: { Accept: "application/json" } })
    if (response.ok) return response.json()
    if (response.status !== 429 && response.status < 500) {
      throw new Error(`${response.status} ${response.statusText} for ${url}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)))
  }
  throw new Error(`gave up on ${url}`)
}

async function download(fileName: string): Promise<string> {
  const response = await fetch(`${IBEX_SOURCE.rawBase}/data/${fileName}`)
  if (!response.ok) throw new Error(`download of ${fileName} failed: ${response.status}`)
  const text = await response.text()
  writeFileSync(path.join(DATA_DIR, fileName), text)
  return text
}

async function olsCandidates(query: string, ontology: string): Promise<Candidate[]> {
  const url = `${OLS4}?q=${encodeURIComponent(query)}&ontology=${ontology}&rows=5`
  const data = await getJson(url)
  return (data?.response?.docs ?? []).map((doc: any) => ({ id: doc.obo_id ?? null, label: doc.label ?? null }))
}

async function taxonCandidates(name: string): Promise<Candidate[]> {
  const search = await getJson(`${EUTILS}/esearch.fcgi?db=taxonomy&term=${encodeURIComponent(name)}&retmode=json`)
  const ids: string[] = search?.esearchresult?.idlist ?? []
  if (ids.length === 0) return []
  await new Promise((resolve) => setTimeout(resolve, 400))
  const summary = await getJson(`${EUTILS}/esummary.fcgi?db=taxonomy&id=${ids.slice(0, 3).join(",")}&retmode=json`)
  return ids.slice(0, 3).map((id) => ({ id, label: summary?.result?.[id]?.scientificname ?? null }))
}

async function resolveProteins(accessions: string[]): Promise<IbexProteinResolution> {
  const resolved: IbexProteinResolution["accessions"] = {}
  for (let start = 0; start < accessions.length; start += 100) {
    const chunk = accessions.slice(start, start + 100)
    const query = chunk.map((accession) => `accession:${accession}`).join(" OR ")
    const url = `${UNIPROT}?query=${encodeURIComponent(query)}&fields=accession,protein_name,gene_primary&format=json&size=500`
    const data = await getJson(url)
    for (const entry of data.results ?? []) {
      const description = entry.proteinDescription ?? {}
      const label =
        description.recommendedName?.fullName?.value ?? description.submissionNames?.[0]?.fullName?.value ?? null
      resolved[entry.primaryAccession] = {
        label,
        geneSymbol: entry.genes?.[0]?.geneName?.value ?? null,
        organismId: entry.organism?.taxonId ?? null,
      }
    }
    console.log(`  UniProt ${start + chunk.length}/${accessions.length}`)
  }
  return {
    resolvedAt: new Date().toISOString().slice(0, 10),
    source: "UniProtKB REST, fields accession,protein_name,gene_primary",
    accessions: resolved,
  }
}

export function splitAccessions(raw: string): string[] {
  if (isNa(raw)) return []
  return raw
    .split(/[;,/]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
}

async function main(): Promise<void> {
  mkdirSync(DATA_DIR, { recursive: true })

  console.log("Downloading IBEX source tables ...")
  for (const fileName of IBEX_SOURCE.dataFiles) {
    await download(fileName)
    console.log(`  ${fileName}`)
  }

  const reagents = parseCsvRecords(readFileSync(path.join(DATA_DIR, "reagent_resources.csv"), "utf8"))
  const antibodyRows = reagents.filter((row) => IMPORTED_REAGENT_TYPES.has(row["Reagent Type"]))
  console.log(`  ${reagents.length} reagent rows, ${antibodyRows.length} of them antibodies`)

  const accessions = [
    ...new Set(antibodyRows.flatMap((row) => splitAccessions(row["UniProt Accession Number"]))),
  ].sort()
  console.log(`Resolving ${accessions.length} UniProt accessions ...`)
  const proteins = await resolveProteins(accessions)
  const missing = accessions.filter((accession) => !proteins.accessions[accession])
  writeFileSync(path.join(DATA_DIR, "proteins.resolved.json"), `${JSON.stringify(proteins, null, 2)}\n`)
  console.log(`  wrote proteins.resolved.json (${Object.keys(proteins.accessions).length} resolved)`)
  if (missing.length > 0) console.log(`  unresolved accessions: ${missing.join(", ")}`)

  const ontology = JSON.parse(
    readFileSync(path.join(DATA_DIR, "ontology.resolved.json"), "utf8"),
  ) as IbexOntologyResolution

  const distinct = (column: string): string[] => [...new Set(reagents.map((row) => row[column]))].sort()
  const uncovered = {
    targetTissues: distinct("Target Tissue").filter((value) => !(value in ontology.targetTissues)),
    tissueStates: distinct("Tissue State").filter((value) => !(value in ontology.tissueStates)),
    targetSpecies: distinct("Target Species").filter((value) => !(value in ontology.targetSpecies)),
    hostOrganisms: distinct("Host Organism").filter((value) => !(value in ontology.hostOrganisms)),
    methods: distinct("Method").filter((value) => !(value in IMAGING_METHOD_MAP)),
    preservations: distinct("Tissue Preservation").filter((value) => !(value in PRESERVATION_MAP)),
    antigenRetrievals: distinct("Antigen Retrieval Conditions").filter((value) => !(value in ANTIGEN_RETRIEVAL_MAP)),
    reagentTypes: distinct("Reagent Type"),
  }

  const candidates: Record<string, Record<string, Candidate[]>> = { targetTissues: {}, tissueStates: {}, taxa: {} }
  for (const value of uncovered.targetTissues) candidates.targetTissues[value] = await olsCandidates(value, "uberon")
  for (const value of uncovered.tissueStates) candidates.tissueStates[value] = await olsCandidates(value, "doid")
  for (const value of [...uncovered.targetSpecies, ...uncovered.hostOrganisms]) {
    candidates.taxa[value] = await taxonCandidates(value)
    await new Promise((resolve) => setTimeout(resolve, 400))
  }

  writeFileSync(
    path.join(DATA_DIR, "resolution-candidates.json"),
    `${JSON.stringify({ checkedAt: new Date().toISOString().slice(0, 10), uncovered, candidates }, null, 2)}\n`,
  )

  const newTerms =
    uncovered.targetTissues.length +
    uncovered.tissueStates.length +
    uncovered.targetSpecies.length +
    uncovered.hostOrganisms.length +
    uncovered.methods.length +
    uncovered.preservations.length +
    uncovered.antigenRetrievals.length
  console.log(`\nVocabulary values not covered by the curated maps: ${newTerms}`)
  if (newTerms > 0) {
    console.log("  check resolution-candidates.json, then add the checked terms to ontology.resolved.json")
    console.log("  or to prisma/data/ibex/vocabulary.ts before running ibex:import")
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
