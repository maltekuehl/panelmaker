import "server-only"

import { mapHit, type RegistryAntibody, resolveRridSource, searchAntibodyHits } from "@/lib/integrations/scicrunch"

// The Antibody Registry is now reached through the documented SciCrunch RIN gateway (see
// lib/integrations/scicrunch.ts). This module is the server-only adapter that exposes the registry to
// app routes and model queries in the canonical RegistryAntibody shape.
//
// Antibody records carry NO gene/UniProt cross-reference, only a target name. The target -> UniProt
// link is resolved separately and species-constrained (lib/integrations/uniprot.ts), never read off
// the antibody record here.
export type AntibodyRegistryResult = RegistryAntibody

export async function searchAntibodyRegistry(query: string, limit = 20): Promise<AntibodyRegistryResult[]> {
  const hits = await searchAntibodyHits(query, limit)
  return hits.map(mapHit).filter((r) => r.citation)
}

export async function lookupAntibodyByRrid(rrid: string): Promise<AntibodyRegistryResult | null> {
  const source = await resolveRridSource(rrid)
  return source ? mapHit(source) : null
}
