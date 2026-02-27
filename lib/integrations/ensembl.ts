import "server-only"

type EnsemblLookupResponse = {
  id: string
  display_name: string
  description: string
  biotype: string
  species: string
  seq_region_name: string
  start: number
  end: number
  strand: number
}

export type EnsemblGeneResult = {
  id: string
  displayName: string
  description: string
  biotype: string
  species: string
  chromosome: string
  start: number
  end: number
  strand: number
}

function parseEnsemblResponse(data: EnsemblLookupResponse): EnsemblGeneResult {
  return {
    id: data.id,
    displayName: data.display_name,
    description: data.description,
    biotype: data.biotype,
    species: data.species,
    chromosome: data.seq_region_name,
    start: data.start,
    end: data.end,
    strand: data.strand,
  }
}

export async function lookupGene(ensemblId: string): Promise<EnsemblGeneResult | null> {
  try {
    const response = await fetch(`https://rest.ensembl.org/lookup/id/${ensemblId}?content-type=application/json`, {
      next: { revalidate: 86400 },
    })

    if (!response.ok) {
      return null
    }

    const data: EnsemblLookupResponse = await response.json()
    return parseEnsemblResponse(data)
  } catch {
    return null
  }
}

export async function searchGeneBySymbol(
  symbol: string,
  species: string = "homo_sapiens",
): Promise<EnsemblGeneResult | null> {
  try {
    const response = await fetch(
      `https://rest.ensembl.org/lookup/symbol/${species}/${symbol}?content-type=application/json`,
      {
        next: { revalidate: 86400 },
      },
    )

    if (!response.ok) {
      return null
    }

    const data: EnsemblLookupResponse = await response.json()
    return parseEnsemblResponse(data)
  } catch {
    return null
  }
}
