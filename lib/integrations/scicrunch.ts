// Shared client for the SciCrunch Resource Information Network (RIN) Elasticsearch API
// (https://api.scicrunch.io). The RIN_Antibody_pr index is the Antibody Registry corpus (scr_006397)
// served through the documented, key-authenticated SciCrunch gateway, with structured fields:
// vendors[] (name + catalogNumber + alternativeCatalogNumbers), antibodies.primary[] (clonality,
// clone, conjugate, isotype, target), organisms.source/target species, mentions (citation counts),
// and validation.
//
// This module is deliberately NOT `server-only`: it is consumed both by the server-only
// lib/integrations/antibody-registry.ts adapter AND by the offline seed script
// (scripts/lookup-pathoplex-antibodies.ts). The API key is read from the environment and is only
// ever bundled where this module is imported (server routes, model queries, and the script).
//
// Note: antibody records carry NO gene/UniProt/Entrez cross-reference, only a target name. The
// target -> UniProt link is resolved separately and species-constrained (lib/integrations/uniprot.ts),
// never read off the antibody record.
const SCICRUNCH_SEARCH_URL = "https://api.scicrunch.io/elastic/v1/RIN_Antibody_pr/_search"

// ---- Structured shape of a RIN_Antibody_pr hit's _source (only the fields we read) ----

export type ScicrunchVendor = {
  name?: string
  catalogNumber?: string
  link?: string
  alternativeCatalogNumbers?: { catalogNumber?: string }[]
}

export type ScicrunchAntibody = {
  clonality?: { name?: string }
  clone?: { identifier?: string }
  conjugate?: { name?: string }
  isotype?: { name?: string }
  targets?: { name?: string }[]
}

export type ScicrunchSource = {
  rrid?: { curie?: string }
  item?: { identifier?: string; name?: string }
  vendors?: ScicrunchVendor[]
  antibodies?: { primary?: ScicrunchAntibody[] }
  organisms?: { source?: { species?: { name?: string } }[]; target?: { species?: { name?: string } }[] }
  mentions?: { totalMentions?: { count?: number }; totalRRIDMentions?: { count?: number } }[]
  validation?: { isValidated?: boolean }
}

// ---- Canonical, app-facing antibody shape mapped from a hit ----

export type RegistryAntibody = {
  name: string
  citation: string
  vendor: string
  catalogNumber: string
  clonality: string
  cloneId: string
  target: string
  sourceOrganism: string
  conjugate: string
  isotype: string
  targetSpecies: string[]
  applications: string[]
  url: string
  citationCount: number
}

const ANTIBODY_SOURCE_FIELDS = [
  "rrid.curie",
  "item.identifier",
  "item.name",
  "vendors",
  "antibodies.primary.clonality.name",
  "antibodies.primary.clone.identifier",
  "antibodies.primary.conjugate.name",
  "antibodies.primary.isotype.name",
  "antibodies.primary.targets.name",
  "organisms.source.species.name",
  "organisms.target.species.name",
  "mentions.totalMentions.count",
  "mentions.totalRRIDMentions.count",
  "validation.isValidated",
]

function apiKey(): string {
  const key = process.env.SCICRUNCH_API_KEY
  if (!key) throw new Error("SCICRUNCH_API_KEY is not set. Add it to .env (see https://scicrunch.org API Keys).")
  return key
}

// Low-level POST to the RIN_Antibody_pr index. Retries transient failures; returns hit _source rows.
export async function rinSearch(body: unknown, retries = 2): Promise<ScicrunchSource[]> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(SCICRUNCH_SEARCH_URL, {
        method: "POST",
        headers: { "apikey": apiKey(), "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const json = (await res.json()) as { hits?: { hits?: { _source?: ScicrunchSource }[] } }
        return (json.hits?.hits ?? []).map((h) => h._source).filter((s): s is ScicrunchSource => Boolean(s))
      }
    } catch {
      // fall through to retry
    }
    if (attempt < retries) await new Promise((r) => setTimeout(r, 500 * (attempt + 1)))
  }
  return []
}

const RRID_LIKE = /^(rrid:)?ab[_\s-]?\d+$/i

// Free-text search across name, target, catalog, and identifier. Routes RRID/AB-id-looking queries to
// an identifier match so "AB_2904121" / "RRID:AB_2904121" resolve directly.
export async function searchAntibodyHits(query: string, size = 20): Promise<ScicrunchSource[]> {
  const q = query.trim()
  if (!q) return []

  if (RRID_LIKE.test(q)) {
    const id = q
      .replace(/^rrid:/i, "")
      .replace(/[\s-]/g, "_")
      .toUpperCase()
    return rinSearch({
      size,
      query: { match: { "item.identifier": id } },
      _source: ANTIBODY_SOURCE_FIELDS,
    })
  }

  // Citation count boosts canonical, well-cited antibodies to the top (the registry ranks purely by
  // text relevance otherwise, which buries the popular reagents under obscure conjugates).
  return rinSearch({
    size,
    query: {
      function_score: {
        query: {
          bool: {
            should: [
              {
                multi_match: {
                  query: q,
                  type: "best_fields",
                  fields: ["item.name^2", "antibodies.primary.targets.name^2", "vendors.catalogNumber"],
                },
              },
              { match_phrase: { "vendors.catalogNumber": q } },
            ],
            minimum_should_match: 1,
          },
        },
        field_value_factor: { field: "mentions.totalMentions.count", modifier: "log1p", factor: 2, missing: 0 },
        boost_mode: "multiply",
      },
    },
    _source: ANTIBODY_SOURCE_FIELDS,
  })
}

// Catalog-targeted search used for precise (vendor, catalog) reconciliation. The catalog field is
// analyzed, so callers verify the structured (vendor, catalog) pair client-side; this only needs to
// surface candidates. The vendor name is a should-boost so the right reseller listing ranks first.
export async function searchAntibodyHitsByCatalog(
  catalogTerms: string[],
  vendor?: string,
  size = 60,
): Promise<ScicrunchSource[]> {
  const terms = [...new Set(catalogTerms.map((t) => t.trim()).filter(Boolean))]
  if (terms.length === 0) return []

  return rinSearch({
    size,
    query: {
      bool: {
        must: [
          {
            bool: {
              should: terms.map((term) => ({ match: { "vendors.catalogNumber": term } })),
              minimum_should_match: 1,
            },
          },
        ],
        should: [
          ...terms.map((term) => ({ match_phrase: { "vendors.catalogNumber": term } })),
          ...(vendor ? [{ match: { "vendors.name": vendor } }] : []),
        ],
      },
    },
    _source: ANTIBODY_SOURCE_FIELDS,
  })
}

// Resolve a single RRID (e.g. "RRID:AB_2904121") to its structured record. Uses the keyless public
// resolver, which returns the same RIN _source as the Elastic index, so this path needs no API key
// (and is HTTP-cached). Only free-text/catalog search requires the key.
export async function resolveRridSource(rrid: string): Promise<ScicrunchSource | null> {
  const id = rrid.replace(/^rrid:/i, "").trim()
  if (!id) return null
  try {
    const res = await fetch(`https://scicrunch.org/resolver/RRID:${id}.json`, { next: { revalidate: 86400 } })
    if (!res.ok) return null
    const json = (await res.json()) as { hits?: { hits?: { _source?: ScicrunchSource }[] } }
    return json.hits?.hits?.[0]?._source ?? null
  } catch {
    return null
  }
}

// ---- Field helpers + normalizer ----

export function citationCountOf(hit: ScicrunchSource): number {
  const m = hit.mentions?.[0]
  return m?.totalMentions?.count ?? m?.totalRRIDMentions?.count ?? 0
}

export function vendorCatalogs(vendor: ScicrunchVendor): string[] {
  const out: string[] = []
  if (vendor.catalogNumber) out.push(vendor.catalogNumber)
  for (const alt of vendor.alternativeCatalogNumbers ?? []) if (alt.catalogNumber) out.push(alt.catalogNumber)
  return out
}

const text = (s: string | undefined | null): string => (s ?? "").trim()

// Map a structured hit to the canonical app shape. No UniProt/gene is produced here by design.
export function mapHit(hit: ScicrunchSource): RegistryAntibody {
  const primary = hit.antibodies?.primary?.[0]
  const vendor = hit.vendors?.[0]
  const targetSpecies = (hit.organisms?.target ?? []).map((t) => text(t.species?.name)).filter(Boolean)

  return {
    name: text(hit.item?.name),
    citation: text(hit.rrid?.curie),
    vendor: text(vendor?.name) || "Unknown",
    catalogNumber: text(vendor?.catalogNumber),
    clonality: text(primary?.clonality?.name),
    cloneId: text(primary?.clone?.identifier),
    target: text(primary?.targets?.[0]?.name),
    sourceOrganism: text(hit.organisms?.source?.[0]?.species?.name),
    conjugate: text(primary?.conjugate?.name),
    isotype: text(primary?.isotype?.name),
    targetSpecies,
    applications: [],
    url: "",
    citationCount: citationCountOf(hit),
  }
}
