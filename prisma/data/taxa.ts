export type TaxonDef = { id: string; label: string }

export const TAXA: TaxonDef[] = [
  { id: "NCBITaxon:9606", label: "Homo sapiens" },
  { id: "NCBITaxon:10090", label: "Mus musculus" },
  { id: "NCBITaxon:10116", label: "Rattus norvegicus" },
  { id: "NCBITaxon:9986", label: "Oryctolagus cuniculus" },
  { id: "NCBITaxon:9925", label: "Capra hircus" },
  { id: "NCBITaxon:9793", label: "Equus asinus" },
  { id: "NCBITaxon:10036", label: "Mesocricetus auratus" },
  { id: "NCBITaxon:9940", label: "Ovis aries" },
  { id: "NCBITaxon:10141", label: "Cavia porcellus" },
  { id: "NCBITaxon:9835", label: "Camelidae" },
]

export const HOST_SPECIES_TO_TAXON = {
  "MOUSE": "NCBITaxon:10090",
  "RABBIT": "NCBITaxon:9986",
  "RAT": "NCBITaxon:10116",
  "GOAT": "NCBITaxon:9925",
  "HAMSTER": "NCBITaxon:10036",
  "DONKEY": "NCBITaxon:9793",
  "SHEEP": "NCBITaxon:9940",
  "GUINEA PIG": "NCBITaxon:10141",
  "CAMELID": "NCBITaxon:9835",
  "HUMAN": "NCBITaxon:9606",
} as const

export type AntibodyHostSpecies = keyof typeof HOST_SPECIES_TO_TAXON

export function taxonIdForHost(host: string | null | undefined): string | null {
  if (!host) return null
  const key = host.trim().toUpperCase()
  return (HOST_SPECIES_TO_TAXON as Record<string, string>)[key] ?? null
}

export const SPECIES_TO_TAXON: Record<string, string> = {
  HUMAN: "NCBITaxon:9606",
  MOUSE: "NCBITaxon:10090",
}
