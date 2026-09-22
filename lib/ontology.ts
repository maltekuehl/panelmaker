import { fetchJson } from "@/lib/integrations/http"
import { taxonId } from "@/models/taxon/id"

export type OntologyType = "cl" | "uberon" | "ncbi_taxonomy" | "go_cc" | "doid" | "ror" | "chebi" | "hsapdv" | "mmusdv"

export type OntologyResult = {
  id: string
  label: string
  description?: string
  ontology: string
}

const OLS4_BASE = "https://www.ebi.ac.uk/ols4/api"
const NCBI_EUTILS_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"

// The GO root term for cellular_component. Without it an `ontology=go` search also returns
// biological_process and molecular_function terms, which are not subcellular locations.
const GO_CELLULAR_COMPONENT_ROOT = "http://purl.obolibrary.org/obo/GO_0005575"

type Ols4Doc = { obo_id?: string; short_form?: string; label: string; description?: string[] }
type Ols4Response = { response?: { docs?: Ols4Doc[] } }

function mapOlsDoc(doc: Ols4Doc, ontologyLabel: string): OntologyResult {
  return {
    id: doc.obo_id ?? doc.short_form ?? "",
    label: doc.label,
    description: doc.description?.[0],
    ontology: ontologyLabel,
  }
}

async function searchOls4(
  query: string,
  ontology: string,
  ontologyLabel: string,
  allChildrenOf?: string,
): Promise<OntologyResult[]> {
  const scope = allChildrenOf ? `&allChildrenOf=${encodeURIComponent(allChildrenOf)}` : ""

  for (const term of [query, `${query}*`]) {
    const url = `${OLS4_BASE}/search?q=${encodeURIComponent(term)}&ontology=${ontology}&rows=10${scope}`
    const data = await fetchJson<Ols4Response>(url, { next: { revalidate: 3600 } })
    const docs = (data?.response?.docs ?? []).map((doc) => mapOlsDoc(doc, ontologyLabel))
    if (docs.length > 0) return docs
  }

  return []
}

export async function searchCellOntology(query: string): Promise<OntologyResult[]> {
  return searchOls4(query, "cl", "CL")
}

export async function searchUberon(query: string): Promise<OntologyResult[]> {
  return searchOls4(query, "uberon", "UBERON")
}

export async function searchGoCellularComponent(query: string): Promise<OntologyResult[]> {
  const results = await searchOls4(query, "go", "GO", GO_CELLULAR_COMPONENT_ROOT)
  return results.filter((r) => r.id.startsWith("GO:"))
}

export async function searchDiseaseOntology(query: string): Promise<OntologyResult[]> {
  return searchOls4(query, "doid", "DOID")
}

export async function searchRor(query: string): Promise<OntologyResult[]> {
  return searchOls4(query, "ror", "ROR")
}

// Fixative chemistry. The terms that matter here are small molecules with a single unambiguous ChEBI
// entry: CHEBI:16842 formaldehyde, CHEBI:752978 paraformaldehyde, CHEBI:17790 methanol,
// CHEBI:15347 acetone, CHEBI:64276 glutaraldehyde.
export async function searchChebi(query: string): Promise<OntologyResult[]> {
  return searchOls4(query, "chebi", "CHEBI")
}

export async function searchHsapDv(query: string): Promise<OntologyResult[]> {
  return searchOls4(query, "hsapdv", "HsapDv")
}

export async function searchMmusDv(query: string): Promise<OntologyResult[]> {
  return searchOls4(query, "mmusdv", "MmusDv")
}

type NcbiSearchResponse = { esearchresult?: { idlist?: string[] } }
type NcbiSummaryEntry = { scientificname?: string; commonname?: string }
type NcbiSummaryResponse = { result?: { uids?: string[] } & Record<string, NcbiSummaryEntry> }

// Species stay on NCBI E-utilities rather than OLS4 `ontology=ncbitaxon`: OLS4 ranks common names
// badly. Measured on 2026-09-22, `mouse` returned Mousrhavirus moussa and no Mus musculus, `rat`
// returned Rathayibacter rathayi first, and `human` returned only viruses, while E-utilities
// resolved all three to the right organism. Only the id format changed, to the NCBITaxon CURIE.
export async function searchSpecies(query: string): Promise<OntologyResult[]> {
  const searchUrl = `${NCBI_EUTILS_BASE}/esearch.fcgi?db=taxonomy&term=${encodeURIComponent(query)}&retmode=json&retmax=10`
  const searchData = await fetchJson<NcbiSearchResponse>(searchUrl, { next: { revalidate: 86400 } })
  const ids = searchData?.esearchresult?.idlist ?? []
  if (ids.length === 0) return []

  const summaryUrl = `${NCBI_EUTILS_BASE}/esummary.fcgi?db=taxonomy&id=${ids.join(",")}&retmode=json`
  const summaryData = await fetchJson<NcbiSummaryResponse>(summaryUrl, { next: { revalidate: 86400 } })
  const uids = summaryData?.result?.uids ?? []

  return uids.map((uid) => {
    const entry = summaryData?.result?.[uid]
    return {
      id: taxonId(uid),
      label: entry?.scientificname ?? entry?.commonname ?? uid,
      description: entry?.commonname ? `Common name: ${entry.commonname}` : undefined,
      ontology: "NCBI_TAXONOMY",
    }
  })
}
