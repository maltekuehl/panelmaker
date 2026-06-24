import "server-only"

type AntibodyRegistryResponse = {
  hits: {
    hits: Array<{
      _source: {
        item: {
          name: string
          description: string
        }
        rrid: {
          properCitation: string
        }
        vendors: Array<{
          name: string
          catalogNumber: string
        }>
        antibodies: {
          primary: Array<{
            clonality: { name: string }
            clone: { identifier: string }
            targets: Array<{ name: string }>
          }>
        }
      }
    }>
  }
}

type FtsAntibodyItem = {
  abName?: string
  abTarget?: string
  abId?: number
  accession?: number
  vendorName?: string
  catalogNum?: string
  clonality?: string
  cloneId?: string
  sourceOrganism?: string
  productConjugate?: string
  productIsotype?: string
  uniprotId?: string
  abTargetEntrezId?: string
  abTargetUniprotId?: string
  targetSpecies?: string[]
  applications?: string[]
  comments?: string
  url?: string
}

type FtsResponse = {
  totalElements: number
  items: FtsAntibodyItem[]
}

export type AntibodyRegistryResult = {
  name: string
  description: string
  citation: string
  vendor: string
  catalogNumber: string
  clonality: string
  cloneId: string
  target: string
  sourceOrganism: string
  conjugate: string
  isotype: string
  uniprotId: string
  targetSpecies: string[]
  applications: string[]
  url: string
}

export async function searchAntibodyRegistry(query: string, limit = 20): Promise<AntibodyRegistryResult[]> {
  try {
    const response = await fetch(
      `https://www.antibodyregistry.org/api/fts-antibodies?q=${encodeURIComponent(query)}&page=1&size=${limit}`,
    )

    if (!response.ok) return []

    const data: FtsResponse = await response.json()

    return (data.items ?? []).map((item) => ({
      name: item.abName ?? "",
      description: item.comments ?? "",
      citation: item.abId ? `RRID:AB_${item.abId}` : "",
      vendor: item.vendorName ?? "Unknown",
      catalogNumber: item.catalogNum ?? "",
      clonality: item.clonality ?? "",
      cloneId: item.cloneId ?? "",
      target: item.abTarget ?? "",
      sourceOrganism: item.sourceOrganism ?? "",
      conjugate: item.productConjugate ?? "",
      isotype: item.productIsotype ?? "",
      uniprotId: item.abTargetUniprotId ?? item.uniprotId ?? "",
      targetSpecies: item.targetSpecies ?? [],
      applications: item.applications ?? [],
      url: item.url ?? "",
    }))
  } catch {
    return []
  }
}

export async function searchAntibodyRegistryByTarget(uniprotId: string, limit = 20): Promise<AntibodyRegistryResult[]> {
  try {
    const response = await fetch("https://www.antibodyregistry.org/api/search/antibodies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contains: [{ key: "abTargetUniprotId", value: uniprotId }],
        page: 1,
        size: limit,
      }),
    })

    if (!response.ok) return []

    const data: FtsResponse = await response.json()

    return (data.items ?? []).map((item) => ({
      name: item.abName ?? "",
      description: item.comments ?? "",
      citation: item.abId ? `RRID:AB_${item.abId}` : "",
      vendor: item.vendorName ?? "Unknown",
      catalogNumber: item.catalogNum ?? "",
      clonality: item.clonality ?? "",
      cloneId: item.cloneId ?? "",
      target: item.abTarget ?? "",
      sourceOrganism: item.sourceOrganism ?? "",
      conjugate: item.productConjugate ?? "",
      isotype: item.productIsotype ?? "",
      uniprotId: item.abTargetUniprotId ?? item.uniprotId ?? "",
      targetSpecies: item.targetSpecies ?? [],
      applications: item.applications ?? [],
      url: item.url ?? "",
    }))
  } catch {
    return []
  }
}

export async function lookupAntibodyByRrid(rrid: string): Promise<AntibodyRegistryResult | null> {
  try {
    const id = rrid.replace(/^RRID:/, "")

    const response = await fetch(`https://scicrunch.org/resolver/${id}.json`, {
      next: { revalidate: 86400 },
    })

    if (!response.ok) {
      return null
    }

    const data: AntibodyRegistryResponse = await response.json()

    if (!data.hits.hits || data.hits.hits.length === 0) {
      return null
    }

    const source = data.hits.hits[0]._source
    const primary = source.antibodies?.primary?.[0]
    const vendor = source.vendors?.[0]

    return {
      name: source.item.name,
      description: source.item.description,
      citation: source.rrid.properCitation,
      vendor: vendor?.name ?? "Unknown",
      catalogNumber: vendor?.catalogNumber ?? "Unknown",
      clonality: primary?.clonality?.name ?? "Unknown",
      cloneId: primary?.clone?.identifier ?? "",
      target: primary?.targets?.[0]?.name ?? "",
      sourceOrganism: "",
      conjugate: "",
      isotype: "",
      uniprotId: "",
      targetSpecies: [],
      applications: [],
      url: "",
    }
  } catch {
    return null
  }
}
