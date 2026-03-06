export type OntologyType = "cl" | "uberon" | "ncbi_taxonomy" | "go_cc" | "doid" | "ror"

export type OntologyResult = {
  id: string
  label: string
  description?: string
  ontology: string
}

const OLS4_BASE = "https://www.ebi.ac.uk/ols4/api"
const NCBI_EUTILS_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"

async function searchOls4(query: string, ontology: string, ontologyLabel: string): Promise<OntologyResult[]> {
  const url = `${OLS4_BASE}/search?q=${encodeURIComponent(query)}&ontology=${ontology}&rows=10`
  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) return []
  const data = await res.json()
  const docs: OntologyResult[] = (data.response?.docs ?? []).map(
    (doc: { obo_id?: string; short_form?: string; label: string; description?: string[] }) => ({
      id: doc.obo_id ?? doc.short_form ?? "",
      label: doc.label,
      description: doc.description?.[0],
      ontology: ontologyLabel,
    }),
  )

  if (docs.length > 0) return docs

  const wildcardUrl = `${OLS4_BASE}/search?q=${encodeURIComponent(`${query}*`)}&ontology=${ontology}&rows=10`
  const wildcardRes = await fetch(wildcardUrl, { next: { revalidate: 3600 } })
  if (!wildcardRes.ok) return []
  const wildcardData = await wildcardRes.json()
  return (wildcardData.response?.docs ?? []).map(
    (doc: { obo_id?: string; short_form?: string; label: string; description?: string[] }) => ({
      id: doc.obo_id ?? doc.short_form ?? "",
      label: doc.label,
      description: doc.description?.[0],
      ontology: ontologyLabel,
    }),
  )
}

export async function searchCellOntology(query: string): Promise<OntologyResult[]> {
  return searchOls4(query, "cl", "CL")
}

export async function searchUberon(query: string): Promise<OntologyResult[]> {
  return searchOls4(query, "uberon", "UBERON")
}

export async function searchGoCellularComponent(query: string): Promise<OntologyResult[]> {
  const results = await searchOls4(query, "go", "GO")
  return results.filter((r) => r.id.startsWith("GO:"))
}

export async function searchDiseaseOntology(query: string): Promise<OntologyResult[]> {
  return searchOls4(query, "doid", "DOID")
}

export async function searchRor(query: string): Promise<OntologyResult[]> {
  return searchOls4(query, "ror", "ROR")
}

export async function searchSpecies(query: string): Promise<OntologyResult[]> {
  const searchUrl = `${NCBI_EUTILS_BASE}/esearch.fcgi?db=taxonomy&term=${encodeURIComponent(query)}&retmode=json&retmax=10`
  const searchRes = await fetch(searchUrl)
  if (!searchRes.ok) return []

  const searchData = await searchRes.json()
  const ids: string[] = searchData.esearchresult?.idlist ?? []
  if (ids.length === 0) return []

  const summaryUrl = `${NCBI_EUTILS_BASE}/esummary.fcgi?db=taxonomy&id=${ids.join(",")}&retmode=json`
  const summaryRes = await fetch(summaryUrl)
  if (!summaryRes.ok) return []

  const summaryData = await summaryRes.json()
  const uids: string[] = summaryData.result?.uids ?? []

  return uids.map((uid) => {
    const entry = summaryData.result[uid]
    return {
      id: `NCBI:txid${uid}`,
      label: entry.scientificname ?? entry.commonname ?? uid,
      description: entry.commonname ? `Common name: ${entry.commonname}` : undefined,
      ontology: "NCBI_TAXONOMY",
    }
  })
}
