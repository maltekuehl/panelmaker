"use server"

interface AntibodyRegistryResponse {
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

export interface AntibodyDetails {
  name: string
  description: string
  citation: string
  vendor: string
  catalogNumber: string
  clonality: string
  cloneId: string
  target: string
}

export async function getAntibodyDetails(rrid: string): Promise<AntibodyDetails | null> {
  try {
    // Extract the ID part (e.g., "AB_443425" from "RRID:AB_443425")
    const id = rrid.replace(/^RRID:/, "")

    const response = await fetch(`https://scicrunch.org/resolver/${id}.json`, {
      next: { revalidate: 86400 }, // Cache for 24 hours
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
      vendor: vendor?.name || "Unknown",
      catalogNumber: vendor?.catalogNumber || "Unknown",
      clonality: primary?.clonality?.name || "Unknown",
      cloneId: primary?.clone?.identifier || "",
      target: primary?.targets?.[0]?.name || "",
    }
  } catch (error) {
    console.error("Error fetching antibody details:", error)
    return null
  }
}
