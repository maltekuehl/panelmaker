import { resolveFluorophoreSpectra } from "@/lib/integrations/fpbase"
import { Prisma, type PrismaClient } from "../lib/generated/prisma/client"
import { FLUOROPHORE_SEED } from "./data/fluorophores"
import {
  CELLULAR_COMPONENTS,
  CELL_TYPES,
  DEVELOPMENTAL_STAGES,
  DISEASE_CONDITIONS,
  FIXATIVES,
  TISSUES,
} from "./data/ontology"
import { CELL_TYPE_MARKERS, PROTEINS } from "./data/proteins"
import { TAXA } from "./data/taxa"

export type ReferenceDataCounts = {
  taxa: number
  tissues: number
  cellularComponents: number
  cellTypes: number
  diseaseConditions: number
  fixatives: number
  developmentalStages: number
  proteins: number
  cellTypeMarkers: number
  fluorophores: { created: number; updated: number }
}

export type FluorophoreSpectraSyncResult = {
  considered: number
  matched: number
  withEmission: number
  withExcitation: number
  withBrightness: number
  unmatched: string[]
}

async function upsertFluorophores(prisma: PrismaClient): Promise<{ created: number; updated: number }> {
  const existing = await prisma.fluorophore.findMany({
    select: { id: true, name: true, aliases: true, fpbaseId: true },
  })
  const byName = new Map(existing.map((row) => [row.name, row]))
  const takenFpbaseIds = new Set(existing.map((row) => row.fpbaseId).filter((id): id is string => id !== null))

  let created = 0
  let updated = 0
  for (const seed of FLUOROPHORE_SEED) {
    const row = byName.get(seed.name)
    if (!row) {
      await prisma.fluorophore.create({
        data: {
          name: seed.name,
          excitation: seed.excitation,
          emission: seed.emission,
          aliases: seed.aliases,
          fpbaseId: takenFpbaseIds.has(seed.fpbaseId) ? null : seed.fpbaseId,
        },
      })
      takenFpbaseIds.add(seed.fpbaseId)
      created += 1
      continue
    }
    await prisma.fluorophore.update({
      where: { id: row.id },
      data: {
        excitation: seed.excitation,
        emission: seed.emission,
        aliases: [...new Set([...row.aliases, ...seed.aliases])],
      },
    })
    updated += 1
  }
  return { created, updated }
}

// Every write is an upsert keyed on the curated id, nothing is deleted, and rows created at runtime
// (ontology lookups, report submissions, the IBEX import) are left alone. Safe on a live instance.
export async function upsertReferenceData(prisma: PrismaClient): Promise<ReferenceDataCounts> {
  for (const { id, label } of TAXA) {
    await prisma.taxon.upsert({ where: { id }, update: { label }, create: { id, label } })
  }

  for (const { id, label, partOfIds } of TISSUES) {
    await prisma.tissue.upsert({ where: { id }, update: { label, partOfIds }, create: { id, label, partOfIds } })
  }

  for (const { id, label, partOfIds } of CELLULAR_COMPONENTS) {
    await prisma.cellularComponent.upsert({
      where: { id },
      update: { label, partOfIds },
      create: { id, label, partOfIds },
    })
  }

  for (const { id, label, parentIds } of CELL_TYPES) {
    await prisma.cellType.upsert({ where: { id }, update: { label, parentIds }, create: { id, label, parentIds } })
  }

  for (const { id, label } of DISEASE_CONDITIONS) {
    await prisma.diseaseCondition.upsert({ where: { id }, update: { label }, create: { id, label } })
  }
  for (const { id, label } of FIXATIVES) {
    await prisma.fixative.upsert({ where: { id }, update: { label }, create: { id, label } })
  }
  for (const { id, label } of DEVELOPMENTAL_STAGES) {
    await prisma.developmentalStage.upsert({ where: { id }, update: { label }, create: { id, label } })
  }

  for (const { id, ...fields } of PROTEINS) {
    await prisma.protein.upsert({ where: { id }, update: fields, create: { id, ...fields } })
  }

  for (const { cellTypeId, proteinId, isCanonical } of CELL_TYPE_MARKERS) {
    await prisma.cellTypeMarker.upsert({
      where: { cellTypeId_proteinId: { cellTypeId, proteinId } },
      update: { isCanonical, source: "HuBMAP" },
      create: { cellTypeId, proteinId, isCanonical, source: "HuBMAP" },
    })
  }

  const fluorophores = await upsertFluorophores(prisma)

  return {
    taxa: TAXA.length,
    tissues: TISSUES.length,
    cellularComponents: CELLULAR_COMPONENTS.length,
    cellTypes: CELL_TYPES.length,
    diseaseConditions: DISEASE_CONDITIONS.length,
    fixatives: FIXATIVES.length,
    developmentalStages: DEVELOPMENTAL_STAGES.length,
    proteins: PROTEINS.length,
    cellTypeMarkers: CELL_TYPE_MARKERS.length,
    fluorophores,
  }
}

export function printReferenceDataCounts(counts: ReferenceDataCounts): void {
  console.log(`  ${counts.taxa} taxa`)
  console.log(`  ${counts.tissues} tissues`)
  console.log(`  ${counts.cellularComponents} cellular components`)
  console.log(`  ${counts.cellTypes} cell types`)
  console.log(`  ${counts.diseaseConditions} disease conditions`)
  console.log(`  ${counts.fixatives} fixatives`)
  console.log(`  ${counts.developmentalStages} developmental stages`)
  console.log(`  ${counts.proteins} proteins`)
  console.log(`  ${counts.cellTypeMarkers} cell type markers`)
  console.log(`  fluorophores: ${counts.fluorophores.created} created, ${counts.fluorophores.updated} updated`)
}

// Pulls excitation and emission curves, extinction coefficients and quantum yields from FPbase. Every write
// is an update keyed on an existing row. With `onlyMissing`, fluorophores that already carry an emission
// curve are skipped, so a routine re-run of setup costs nothing once the spectra are in. If FPbase is
// unreachable the resolver returns no matches and nothing is written.
export async function syncFluorophoreSpectra(
  prisma: PrismaClient,
  { onlyMissing }: { onlyMissing: boolean },
): Promise<FluorophoreSpectraSyncResult> {
  const rows = await prisma.fluorophore.findMany({
    where: onlyMissing ? { emissionSpectrum: { equals: Prisma.AnyNull } } : undefined,
    select: { id: true, name: true, aliases: true },
  })
  const result: FluorophoreSpectraSyncResult = {
    considered: rows.length,
    matched: 0,
    withEmission: 0,
    withExcitation: 0,
    withBrightness: 0,
    unmatched: [],
  }
  if (rows.length === 0) return result

  const resolved = await resolveFluorophoreSpectra(rows)
  result.unmatched = resolved.unmatched.map((row) => row.name)

  for (const { id, update } of resolved.matched) {
    if (update.emissionSpectrum) result.withEmission += 1
    if (update.excitationSpectrum) result.withExcitation += 1
    if (update.extinctionCoefficient && update.quantumYield) result.withBrightness += 1

    await prisma.fluorophore.update({
      where: { id },
      data: {
        fpbaseId: update.fpbaseId,
        fpbaseSlug: update.fpbaseSlug,
        extinctionCoefficient: update.extinctionCoefficient,
        quantumYield: update.quantumYield,
        excitationSpectrum: update.excitationSpectrum ?? undefined,
        emissionSpectrum: update.emissionSpectrum ?? undefined,
      },
    })
    result.matched += 1
  }

  return result
}

export function printFluorophoreSpectraSync(result: FluorophoreSpectraSyncResult): void {
  console.log(`  considered:         ${result.considered}`)
  console.log(`  matched:            ${result.matched}`)
  console.log(`  emission curves:    ${result.withEmission}`)
  console.log(`  excitation curves:  ${result.withExcitation}`)
  console.log(`  brightness pairs:   ${result.withBrightness}`)
  console.log(`  unmatched:          ${result.unmatched.length}`)
  if (result.unmatched.length > 0) {
    console.log("\nNot in FPbase (or FPbase unreachable), these keep the emission-peak fallback:")
    for (const name of result.unmatched) console.log(`  ${name}`)
  }
}
