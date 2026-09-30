import "server-only"

import type { Prisma } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import type { FluorophoreSpectraMap } from "./spectra"

const fluorophoreSelect = {
  id: true,
  name: true,
  excitation: true,
  emission: true,
  fpbaseId: true,
  fpbaseSlug: true,
  chebiId: true,
  aliases: true,
  extinctionCoefficient: true,
  quantumYield: true,
} satisfies Prisma.FluorophoreSelect

const fluorophoreSpectraSelect = {
  id: true,
  excitationSpectrum: true,
  emissionSpectrum: true,
  extinctionCoefficient: true,
  quantumYield: true,
} satisfies Prisma.FluorophoreSelect

export type FluorophoreRow = Prisma.FluorophoreGetPayload<{ select: typeof fluorophoreSelect }>

export async function getAllFluorophores(): Promise<FluorophoreRow[]> {
  return prisma.fluorophore.findMany({ select: fluorophoreSelect, orderBy: { emission: "asc" } })
}

// `aliases` is a string[] column, so Prisma can only match a whole element. The table is small
// (about 50 rows), so the search normalizes case and separators in memory instead: "af647",
// "Alexa-647" and "alexa fluor 647" all reach "Alexa Fluor 647".
const normalizeFluorophoreTerm = (value: string): string => value.toLowerCase().replace(/[\s_-]/g, "")

export async function searchFluorophores(query: string): Promise<FluorophoreRow[]> {
  const term = normalizeFluorophoreTerm(query)
  if (!term) return getAllFluorophores()

  const all = await getAllFluorophores()
  return all.filter(
    (flu) =>
      normalizeFluorophoreTerm(flu.name).includes(term) ||
      flu.aliases.some((alias) => normalizeFluorophoreTerm(alias).includes(term)),
  )
}

export async function fluorophoreExists(id: string): Promise<boolean> {
  const found = await prisma.fluorophore.findUnique({ where: { id }, select: { id: true } })
  return found !== null
}

/**
 * Load the FPbase spectra for a set of fluorophores, keyed by id. Spectra are several hundred points
 * each, so they are fetched only where they are used rather than joined into every panel read.
 */
export async function getFluorophoreSpectra(ids: string[]): Promise<FluorophoreSpectraMap> {
  if (ids.length === 0) return new Map()

  const rows = await prisma.fluorophore.findMany({ where: { id: { in: ids } }, select: fluorophoreSpectraSelect })

  return new Map(
    rows.map((row) => [
      row.id,
      {
        excitationSpectrum: row.excitationSpectrum,
        emissionSpectrum: row.emissionSpectrum,
        extinctionCoefficient: row.extinctionCoefficient,
        quantumYield: row.quantumYield,
      },
    ]),
  )
}
