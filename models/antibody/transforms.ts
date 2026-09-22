import type { Clonality, Prisma } from "@/lib/generated/prisma/client"
import type { RegistryAntibody } from "@/lib/integrations/scicrunch"
import type { AntibodyRow } from "./queries"

export type AntibodyResponse = AntibodyRow

export function toAntibodyResponse(antibody: AntibodyRow): AntibodyResponse {
  return antibody
}

export const CLONALITY_MAP: Record<string, Clonality> = {
  monoclonal: "MONOCLONAL",
  polyclonal: "POLYCLONAL",
  recombinant: "RECOMBINANT",
  oligoclonal: "OLIGOCLONAL",
}

export function mapClonality(raw: string | null | undefined): Clonality | null {
  return CLONALITY_MAP[(raw ?? "").trim().toLowerCase()] ?? null
}

// Registry strings carry "Unknown" placeholders; they are not data worth storing.
function cleanValue(value: string | undefined | null): string | null {
  const trimmed = value?.trim()
  return trimmed && trimmed.toLowerCase() !== "unknown" ? trimmed : null
}

export type RegistryAntibodyInput = Omit<RegistryAntibody, "citationCount" | "isotype"> & {
  citationCount?: number
  isotype?: string
}

// Single mapping from a registry hit to Antibody create data, shared by every path that can create
// an antibody from the registry (RRID resolution, report submission, registry search).
export function registryToAntibodyCreate(
  registry: RegistryAntibodyInput,
  opts: { rrid: string | null; hostTaxonId?: string | null; targetProteinId?: string | null },
): Prisma.AntibodyUncheckedCreateInput {
  return {
    rrid: opts.rrid,
    name: cleanValue(registry.name) ?? "Unknown",
    catalogNumber: cleanValue(registry.catalogNumber),
    cloneId: cleanValue(registry.cloneId),
    clonality: mapClonality(registry.clonality),
    hostTaxonId: opts.hostTaxonId ?? null,
    targetSpecies: registry.targetSpecies ?? [],
    targetName: cleanValue(registry.target),
    targetProteinId: opts.targetProteinId ?? null,
    applications: registry.applications ?? [],
    conjugate: cleanValue(registry.conjugate),
    vendorName: cleanValue(registry.vendor),
    vendorUrl: cleanValue(registry.url),
    citationCount: registry.citationCount ?? 0,
  }
}
