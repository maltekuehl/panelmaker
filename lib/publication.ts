export function pubmedUrl(pmid: string): string {
  return `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
}

export function doiUrl(doi: string): string {
  return `https://doi.org/${doi}`
}

export type PublicationRef = {
  citation: string | null
  pmid: string | null
  doi: string | null
}

export function hasPublication(ref: PublicationRef): boolean {
  return Boolean(ref.citation || ref.pmid || ref.doi)
}
