import "server-only"

type UniProtEntry = {
  primaryAccession: string
  proteinDescription?: {
    recommendedName?: {
      fullName?: { value: string }
    }
    submissionNames?: Array<{ fullName?: { value: string } }>
  }
  genes?: Array<{
    geneName?: { value: string }
  }>
  organism?: {
    scientificName?: string
  }
  uniProtKBCrossReferences?: Array<{
    database: string
    id: string
    properties?: Array<{ key: string; value: string }>
  }>
  comments?: Array<{
    commentType: string
    texts?: Array<{ value: string }>
    subcellularLocations?: Array<{
      location?: { value: string }
    }>
  }>
}

type UniProtSearchResponse = {
  results: UniProtEntry[]
}

export type UniProtResult = {
  id: string
  name: string
  geneName: string
  organism: string
  ensemblGeneId?: string
  function?: string
  subcellularLocation?: string[]
  tissueSpecificity?: string
}

function parseUniProtEntry(entry: UniProtEntry): UniProtResult {
  const recommendedName = entry.proteinDescription?.recommendedName?.fullName?.value
  const submissionName = entry.proteinDescription?.submissionNames?.[0]?.fullName?.value
  const name = recommendedName ?? submissionName ?? ""

  const geneName = entry.genes?.[0]?.geneName?.value ?? ""
  const organism = entry.organism?.scientificName ?? ""

  const functionComment = entry.comments?.find((c) => c.commentType === "FUNCTION")
  const functionText = functionComment?.texts?.[0]?.value

  const subcellularComment = entry.comments?.find((c) => c.commentType === "SUBCELLULAR_LOCATION")
  const subcellularLocation = subcellularComment?.subcellularLocations
    ?.map((loc) => loc.location?.value)
    .filter((v): v is string => v !== undefined)

  const tissueComment = entry.comments?.find((c) => c.commentType === "TISSUE_SPECIFICITY")
  const tissueSpecificity = tissueComment?.texts?.[0]?.value

  const ensemblRef = entry.uniProtKBCrossReferences?.find((ref) => ref.database === "Ensembl")
  const ensemblGeneId = ensemblRef?.properties?.find((p) => p.key === "GeneId")?.value

  return {
    id: entry.primaryAccession,
    name,
    geneName,
    organism,
    ensemblGeneId,
    function: functionText,
    subcellularLocation,
    tissueSpecificity,
  }
}

export async function lookupProtein(uniprotId: string): Promise<UniProtResult | null> {
  try {
    const response = await fetch(`https://rest.uniprot.org/uniprotkb/${uniprotId}?format=json`, {
      next: { revalidate: 86400 },
    })

    if (!response.ok) {
      return null
    }

    const entry: UniProtEntry = await response.json()
    return parseUniProtEntry(entry)
  } catch {
    return null
  }
}

export async function searchProteinsByGene(geneName: string, organismId?: number): Promise<UniProtResult[]> {
  try {
    const orgFilter = organismId ? `organism_id:${organismId}` : "organism_id:9606"

    const fields = "accession,protein_name,gene_names,organism_name,xref_ensembl"
    const exactQuery = encodeURIComponent(`gene_exact:${geneName} AND ${orgFilter}`)
    const exactResponse = await fetch(
      `https://rest.uniprot.org/uniprotkb/search?query=${exactQuery}&format=json&size=5&fields=${fields}`,
      { next: { revalidate: 86400 } },
    )

    if (exactResponse.ok) {
      const exactData: UniProtSearchResponse = await exactResponse.json()
      if (exactData.results.length > 0) {
        return exactData.results.map(parseUniProtEntry)
      }
    }

    const broadQuery = encodeURIComponent(`(gene:${geneName} OR protein_name:${geneName}) AND ${orgFilter}`)
    const broadResponse = await fetch(
      `https://rest.uniprot.org/uniprotkb/search?query=${broadQuery}&format=json&size=10&fields=${fields}`,
      { next: { revalidate: 86400 } },
    )

    if (!broadResponse.ok) {
      return []
    }

    const broadData: UniProtSearchResponse = await broadResponse.json()
    return broadData.results.map(parseUniProtEntry)
  } catch {
    return []
  }
}
