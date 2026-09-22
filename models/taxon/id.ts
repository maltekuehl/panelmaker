// The one place the taxon id format is defined. PanelMaker stores NCBI taxonomy ids as the
// `NCBITaxon:9606` CURIE used by SDRF-Proteomics, REMBI, CELLxGENE, HuBMAP OMAP and Cellosaurus.
// The legacy `NCBI:txid9606` form is still accepted on the way in so importers and older payloads
// keep resolving.
export const TAXON_ID_PREFIX = "NCBITaxon:"
export const LEGACY_TAXON_ID_PREFIX = "NCBI:txid"

export function taxonId(uid: string | number): string {
  return `${TAXON_ID_PREFIX}${String(uid).trim()}`
}

export function parseTaxonUid(id: string): string | null {
  const match = /^(?:NCBITaxon:|NCBI:txid)(\d+)$/.exec(id.trim())
  return match ? match[1] : null
}

export function normalizeTaxonId(id: string): string | null {
  const uid = parseTaxonUid(id)
  return uid === null ? null : taxonId(uid)
}
