// Resolves RRIDs and metadata for every reagent in prisma/data/pathoplex-antibodies.ts against the
// SciCrunch Antibody Registry, then writes a reviewable cache to
// prisma/data/pathoplex-antibodies.resolved.json. Run with: `npm run pathoplex:lookup`.
//
// The SciCrunch RIN client itself lives in lib/integrations/scicrunch.ts and is shared with the app's
// runtime registry integration. This script owns only the paper-reagent reconciliation: it queries the
// catalog number (and its suffix-stripped core) via the shared client, then verifies each hit's
// structured (vendor name, catalog) pairs. CST size suffixes (5546T, 45596S) and "-SP"/"-NA"/"-2" pack
// suffixes are tolerated, and a core-only catalog match with a mismatched vendor is rejected as the
// classic false positive. Unresolved reagents are reported, not dropped: the seed still stocks them,
// just without an RRID.
//
// Requires SCICRUNCH_API_KEY in the environment (.env).
import "dotenv/config"
import { writeFileSync } from "node:fs"
import path from "node:path"
import {
  citationCountOf,
  type ScicrunchSource,
  type ScicrunchVendor,
  searchAntibodyHitsByCatalog,
  vendorCatalogs,
} from "../lib/integrations/scicrunch"
import { PATHOPLEX_ANTIBODIES, type PathoplexReagent } from "../prisma/data/pathoplex-antibodies"

type Confidence = "high" | "medium" | "low" | "unresolved"

export type ResolvedReagent = PathoplexReagent & {
  rrid: string | null
  confidence: Confidence
  source: "registry" | "curated" | "none"
  host: string | null
  clonality: string | null
  cloneId: string | null
  uniprotId: string | null
  registryName: string | null
  registryTarget: string | null
  registryVendor: string | null
  registryCatalog: string | null
  registryApplications: string[]
  citationCount: number
}

// Reagents whose paper catalog cannot be bridged to the registry by string alone: Agilent/Dako
// ready-to-use (IR/IS) and pack codes are indexed under the antibody-concentrate code (e.g. IR607 ->
// M0762, M710301-2 -> M7103). RRIDs verified live against the registry by clone + vendor + target.
// Anything not confidently verifiable is left unresolved rather than guessed.
const CURATED: Record<string, { rrid: string; host: string; clonality: string; cloneId: string }> = {
  "cd8-m710301-2": { rrid: "RRID:AB_2075537", host: "mouse", clonality: "monoclonal", cloneId: "C8/144B" },
  "neurofilament-ir607": { rrid: "RRID:AB_2314899", host: "mouse", clonality: "monoclonal", cloneId: "2F11" },
}

const canon = (s: string): string => s.toUpperCase().replace(/[^A-Z0-9]/g, "")

// Order matters: longest first so "SP" is tried before "P".
const CATALOG_SUFFIXES = ["100UG", "SP", "NA", "BF", "100", "50", "S", "T", "P", "F", "Z", "2"]

function stripCatalogSuffix(c: string): string {
  for (const suffix of CATALOG_SUFFIXES) {
    if (c.length - suffix.length >= 3 && c.endsWith(suffix)) {
      const core = c.slice(0, -suffix.length)
      if (/\d/.test(core)) return core
    }
  }
  return c
}

type CatalogMatch = "exact" | "core" | "none"

// Best match of the paper catalog against a vendor entry's catalog candidates (primary catalog plus
// any structured alternativeCatalogNumbers).
function bestCatalogMatch(paperCatalog: string, candidates: string[]): CatalogMatch {
  const paper = canon(paperCatalog)
  const paperCore = stripCatalogSuffix(paper)
  let result: CatalogMatch = "none"
  for (const candidate of candidates) {
    const reg = canon(candidate)
    if (!reg) continue
    if (paper === reg) return "exact"
    const regCore = stripCatalogSuffix(reg)
    if (regCore.length >= 3 && paperCore === regCore) result = "core"
  }
  return result
}

const VENDOR_SYNONYMS: { match: (paper: string) => boolean; tokens: string[] }[] = [
  { match: (v) => /cell signal/i.test(v), tokens: ["cellsignal"] },
  { match: (v) => /^abcam/i.test(v), tokens: ["abcam"] },
  { match: (v) => /proteintech/i.test(v), tokens: ["proteintech"] },
  { match: (v) => /r&d|r and d/i.test(v), tokens: ["randd", "biotechne"] },
  {
    match: (v) => /thermo|invitrogen/i.test(v),
    tokens: ["thermofisher", "invitrogen", "thermoscientific", "ebioscience"],
  },
  { match: (v) => /santa cruz/i.test(v), tokens: ["santacruz"] },
  { match: (v) => /sigma|aldrich/i.test(v), tokens: ["sigma", "millipore", "merck"] },
  { match: (v) => /biolegend/i.test(v), tokens: ["biolegend"] },
  { match: (v) => /agilent|dako/i.test(v), tokens: ["agilent", "dako"] },
  { match: (v) => /vector/i.test(v), tokens: ["vector"] },
  { match: (v) => /alomone/i.test(v), tokens: ["alomone"] },
  { match: (v) => /southern/i.test(v), tokens: ["southernbio"] },
  { match: (v) => /progen/i.test(v), tokens: ["progen"] },
  { match: (v) => /lsbio/i.test(v), tokens: ["lsbio", "lifespan"] },
  { match: (v) => /synaptic/i.test(v), tokens: ["synapticsystem"] },
  { match: (v) => /bio sb/i.test(v), tokens: ["biosb"] },
  { match: (v) => /dianova/i.test(v), tokens: ["dianova"] },
]

function vendorMatch(paperVendor: string, registryVendor: string): boolean {
  const reg = registryVendor
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "")
  const entry = VENDOR_SYNONYMS.find((e) => e.match(paperVendor))
  const tokens = entry?.tokens ?? [paperVendor.toLowerCase().replace(/[^a-z0-9]/g, "")]
  return tokens.some((t) => reg.includes(t))
}

type Scored = {
  hit: ScicrunchSource
  vendor: ScicrunchVendor
  confidence: Confidence
  rank: number
}

// Score the best (vendor, catalog) pairing inside one hit. A core-only catalog match with a different
// vendor is the classic false positive (a catalog colliding with another vendor's hyphenated number),
// so it is rejected outright.
function scoreHit(reagent: PathoplexReagent, hit: ScicrunchSource): Scored | null {
  if (!hit.rrid?.curie) return null
  const citations = Math.min(citationCountOf(hit), 200)
  let best: Scored | null = null
  for (const vendor of hit.vendors ?? []) {
    const cat = bestCatalogMatch(reagent.catalog, vendorCatalogs(vendor))
    if (cat === "none") continue
    const vendorOk = vendorMatch(reagent.vendor, vendor.name ?? "")
    if (cat === "core" && !vendorOk) continue
    const rank = (vendorOk ? 1000 : 0) + (cat === "exact" ? 500 : 250) + citations
    const confidence: Confidence = vendorOk ? "high" : "medium"
    if (!best || rank > best.rank) best = { hit, vendor, confidence, rank }
  }
  return best
}

const clean = (s: string | undefined | null): string | null => {
  const t = s?.trim()
  return t && t.toLowerCase() !== "unknown" ? t : null
}

async function resolveOne(reagent: PathoplexReagent): Promise<ResolvedReagent> {
  const base: ResolvedReagent = {
    ...reagent,
    rrid: null,
    confidence: "unresolved",
    source: "none",
    host: null,
    clonality: null,
    cloneId: null,
    uniprotId: null,
    registryName: null,
    registryTarget: null,
    registryVendor: null,
    registryCatalog: null,
    registryApplications: [],
    citationCount: 0,
  }

  const curated = CURATED[reagent.key]
  if (curated) {
    return {
      ...base,
      rrid: curated.rrid,
      confidence: "high",
      source: "curated",
      host: curated.host,
      clonality: curated.clonality,
      cloneId: curated.cloneId,
    }
  }

  const raw = reagent.catalog.trim()
  const core = stripCatalogSuffix(canon(raw))
  const catalogTerms = core && core !== canon(raw) ? [raw, core] : [raw]
  const hits = await searchAntibodyHitsByCatalog(catalogTerms, reagent.vendor)

  let best: Scored | null = null
  for (const hit of hits) {
    const scored = scoreHit(reagent, hit)
    if (scored && (!best || scored.rank > best.rank)) best = scored
  }

  if (!best) return base

  const primary = best.hit.antibodies?.primary?.[0]
  return {
    ...base,
    rrid: best.hit.rrid?.curie ?? null,
    confidence: best.confidence,
    source: "registry",
    host: clean(best.hit.organisms?.source?.[0]?.species?.name),
    clonality: clean(primary?.clonality?.name),
    cloneId: clean(primary?.clone?.identifier),
    uniprotId: null,
    registryName: clean(best.hit.item?.name),
    registryTarget: clean(primary?.targets?.[0]?.name),
    registryVendor: clean(best.vendor.name),
    registryCatalog: clean(best.vendor.catalogNumber),
    registryApplications: [],
    citationCount: citationCountOf(best.hit),
  }
}

async function pool<T, R>(items: T[], size: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let cursor = 0
  async function run() {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await worker(items[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, run))
  return results
}

async function main() {
  if (!process.env.SCICRUNCH_API_KEY) {
    throw new Error("SCICRUNCH_API_KEY is not set. Add it to .env (see https://scicrunch.org API Keys).")
  }

  console.log(
    `Resolving ${PATHOPLEX_ANTIBODIES.length} PathoPlex reagents against the SciCrunch Antibody Registry...\n`,
  )

  let done = 0
  const resolved = await pool(PATHOPLEX_ANTIBODIES, 5, async (reagent) => {
    const result = await resolveOne(reagent)
    done++
    const tag = result.rrid ? `${result.rrid} [${result.confidence}]` : "UNRESOLVED"
    console.log(
      `  ${String(done).padStart(3)}/${PATHOPLEX_ANTIBODIES.length}  ${reagent.target.padEnd(28)} ${reagent.vendor} ${reagent.catalog}  ->  ${tag}`,
    )
    return result
  })

  const counts = resolved.reduce(
    (acc, r) => {
      acc[r.confidence]++
      return acc
    },
    { high: 0, medium: 0, low: 0, unresolved: 0 } as Record<Confidence, number>,
  )

  const outPath = path.resolve(process.cwd(), "prisma/data/pathoplex-antibodies.resolved.json")
  writeFileSync(outPath, JSON.stringify(resolved, null, 2) + "\n", "utf8")

  console.log("\nResolved:")
  console.log(`  high   ${counts.high}   (catalog + vendor match)`)
  console.log(`  medium ${counts.medium}   (exact catalog, vendor differs)`)
  console.log(`  low    ${counts.low}   (catalog core only)`)
  console.log(`  none   ${counts.unresolved}`)

  const unresolved = resolved.filter((r) => r.confidence === "unresolved")
  if (unresolved.length) {
    console.log("\nUnresolved (seeded without an RRID):")
    for (const r of unresolved) console.log(`  - ${r.target} (${r.vendor}, ${r.catalog})`)
  }
  const lowOrMedium = resolved.filter((r) => r.confidence === "low" || r.confidence === "medium")
  if (lowOrMedium.length) {
    console.log("\nReview these (lower-confidence matches):")
    for (const r of lowOrMedium) {
      console.log(
        `  - ${r.target} (${r.vendor}, ${r.catalog}) -> ${r.rrid} = ${r.registryVendor} ${r.registryCatalog} "${r.registryName}"`,
      )
    }
  }

  console.log(`\nWrote ${resolved.length} entries to ${outPath}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
