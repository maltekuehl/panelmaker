import "server-only"

import { BadRequestError, UnprocessableError } from "@/lib/error-handling"
import type { Prisma } from "@/lib/generated/prisma/client"
import {
  type OntologyResult,
  searchCellOntology,
  searchChebi,
  searchDiseaseOntology,
  searchEfoImagingMethods,
  searchGoCellularComponent,
  searchHsapDv,
  searchMmusDv,
  searchSpecies,
  searchUberon,
} from "@/lib/ontology"
import { prisma } from "@/lib/prisma"

export type OntologyValue = { id: string; label: string }

export type OntologyKind =
  | "cellType"
  | "cellularComponent"
  | "condition"
  | "developmentalStage"
  | "fixative"
  | "imagingMethod"
  | "taxon"
  | "tissue"

type Db = Prisma.TransactionClient

type TermResolver = {
  exists: (db: Db, id: string) => Promise<unknown>
  persist: (db: Db, term: OntologyValue) => Promise<unknown>
  search: (q: string) => Promise<OntologyResult[]>
  noun: string
  ontology: string
}

const byId = (id: string) => ({ where: { id }, select: { id: true } })
const upsertTerm = (term: OntologyValue) => ({ where: { id: term.id }, update: {}, create: term })

// Every term table is global and shown in facets and filters, so an id the catalog does not know is only
// written after its source ontology confirms the id carries the submitted label. Existing rows keep
// their stored label.
const ONTOLOGY_RESOLVERS: Record<OntologyKind, TermResolver> = {
  cellType: {
    exists: (db, id) => db.cellType.findUnique(byId(id)),
    persist: (db, term) => db.cellType.upsert(upsertTerm(term)),
    search: searchCellOntology,
    noun: "Cell type",
    ontology: "Cell Ontology",
  },
  cellularComponent: {
    exists: (db, id) => db.cellularComponent.findUnique(byId(id)),
    persist: (db, term) => db.cellularComponent.upsert(upsertTerm(term)),
    search: searchGoCellularComponent,
    noun: "Subcellular location",
    ontology: "GO Cellular Component",
  },
  condition: {
    exists: (db, id) => db.diseaseCondition.findUnique(byId(id)),
    persist: (db, term) => db.diseaseCondition.upsert(upsertTerm(term)),
    search: searchDiseaseOntology,
    noun: "Disease condition",
    ontology: "Disease Ontology",
  },
  developmentalStage: {
    exists: (db, id) => db.developmentalStage.findUnique(byId(id)),
    persist: (db, term) => db.developmentalStage.upsert(upsertTerm(term)),
    // HsapDv covers human donors and MmusDv mouse; the submit form picks the ontology from the
    // experiment species, so accept an id from either here.
    search: async (q) => [...(await searchHsapDv(q)), ...(await searchMmusDv(q))],
    noun: "Developmental stage",
    ontology: "HsapDv or MmusDv",
  },
  fixative: {
    exists: (db, id) => db.fixative.findUnique(byId(id)),
    persist: (db, term) => db.fixative.upsert(upsertTerm(term)),
    search: searchChebi,
    noun: "Fixative",
    ontology: "ChEBI",
  },
  imagingMethod: {
    exists: (db, id) => db.imagingMethod.findUnique(byId(id)),
    persist: (db, term) => db.imagingMethod.upsert(upsertTerm(term)),
    search: searchEfoImagingMethods,
    noun: "Imaging method",
    ontology: "EFO",
  },
  taxon: {
    exists: (db, id) => db.taxon.findUnique(byId(id)),
    persist: (db, term) => db.taxon.upsert(upsertTerm(term)),
    search: searchSpecies,
    noun: "Species",
    ontology: "NCBI Taxonomy",
  },
  tissue: {
    exists: (db, id) => db.tissue.findUnique(byId(id)),
    persist: (db, term) => db.tissue.upsert(upsertTerm(term)),
    search: searchUberon,
    noun: "Tissue",
    ontology: "UBERON",
  },
}

async function confirmInOntology(resolver: TermResolver, value: OntologyValue): Promise<OntologyValue> {
  const match = (await resolver.search(value.label)).find((term) => term.id === value.id)
  if (!match) {
    throw new UnprocessableError(`${resolver.noun} ${value.id} (${value.label}) not found in ${resolver.ontology}`)
  }
  return { id: match.id, label: match.label }
}

// Accepts a term already in the catalog, otherwise requires the source ontology to confirm it. Nothing
// is written; pair it with persistOntologyTerms inside the caller's transaction.
export async function validateAndResolveOntologyTerm(kind: OntologyKind, value: OntologyValue): Promise<OntologyValue> {
  const resolver = ONTOLOGY_RESOLVERS[kind]
  if (await resolver.exists(prisma, value.id)) return value
  return confirmInOntology(resolver, value)
}

export async function resolveOptionalTerm(
  kind: OntologyKind,
  value: OntologyValue | null | undefined,
): Promise<OntologyValue | undefined> {
  return value ? validateAndResolveOntologyTerm(kind, value) : undefined
}

export async function persistOntologyTerms(db: Db, terms: [OntologyKind, OntologyValue | undefined][]): Promise<void> {
  for (const [kind, term] of terms) {
    if (term) await ONTOLOGY_RESOLVERS[kind].persist(db, term)
  }
}

// The id-plus-optional-label form panels submit: a known id passes straight through, an unknown one
// needs its label so the ontology can confirm it, and is then stored.
export async function ensureOntologyTermId(
  kind: OntologyKind,
  id?: string,
  label?: string,
): Promise<string | undefined> {
  if (!id) return undefined
  const resolver = ONTOLOGY_RESOLVERS[kind]
  if (await resolver.exists(prisma, id)) return id
  if (!label) throw new BadRequestError(`Unknown ${resolver.noun.toLowerCase()} ${id}`)
  const term = await confirmInOntology(resolver, { id, label })
  await resolver.persist(prisma, term)
  return term.id
}
