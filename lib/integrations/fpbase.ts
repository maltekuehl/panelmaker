// FPbase dye records and spectra (https://www.fpbase.org/graphql/, no auth, POST JSON).
//
// Two facts shape this module. First, the scalar fields are sparse: of 1007 dyes only 125 carry both
// exMax and emMax and only 109 carry both qy and extCoeff, so the spectra are the reliable source.
// Second, vendor shorthand does not match FPbase names ("AF647", "PE", "FITC", "JF549" all miss on an
// exact lookup), so matching goes through an expansion layer over the name plus the stored aliases.
//
// Deliberately NOT `server-only`: the nightly sync script under scripts/ is a thin caller of these
// functions and runs outside Next.
import { fetchJson } from "@/lib/integrations/http"

const FPBASE_GRAPHQL_URL = "https://www.fpbase.org/graphql/"

export type FpbaseDye = {
  id: string
  name: string
  slug: string
  exMax: number | null
  emMax: number | null
  extCoeff: number | null
  qy: number | null
}

export type FpbaseSpectrumSubtype = "EX" | "EM" | "AB" | "2P"

export type FpbaseSpectrumRef = {
  id: string
  subtype: FpbaseSpectrumSubtype
  ownerSlug: string
  ownerName: string
}

// [wavelength in nm, intensity normalized to a peak of 1].
export type SpectrumPoint = [number, number]

export type FpbaseFluorophoreUpdate = {
  fpbaseId: string
  fpbaseSlug: string
  excitation: number | null
  emission: number | null
  extinctionCoefficient: number | null
  quantumYield: number | null
  excitationSpectrum: SpectrumPoint[] | null
  emissionSpectrum: SpectrumPoint[] | null
}

export type FpbaseSyncInput = { id: string; name: string; aliases: string[] }

export type FpbaseSyncMatch = { id: string; name: string; dye: FpbaseDye; update: FpbaseFluorophoreUpdate }

export type FpbaseSyncResult = {
  matched: FpbaseSyncMatch[]
  unmatched: { id: string; name: string }[]
}

type GraphqlResponse<T> = { data?: T }

async function fpbaseQuery<T>(query: string): Promise<T | null> {
  const body = await fetchJson<GraphqlResponse<T>>(FPBASE_GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
    cache: "no-store",
  })
  return body?.data ?? null
}

export async function fetchFpbaseDyes(): Promise<FpbaseDye[]> {
  const data = await fpbaseQuery<{ dyes: FpbaseDye[] }>("{ dyes { id name slug exMax emMax extCoeff qy } }")
  return data?.dyes ?? []
}

// `category` is a String argument on the FPbase schema, so it has to be quoted. "D" selects dyes.
export async function fetchFpbaseDyeSpectra(): Promise<FpbaseSpectrumRef[]> {
  const data = await fpbaseQuery<{
    spectra: { id: string; subtype: FpbaseSpectrumSubtype; owner: { name: string; slug: string } | null }[]
  }>('{ spectra(category: "D") { id subtype owner { name slug } } }')

  return (data?.spectra ?? [])
    .filter((entry) => entry.owner !== null)
    .map((entry) => ({
      id: entry.id,
      subtype: entry.subtype,
      ownerSlug: entry.owner!.slug,
      ownerName: entry.owner!.name,
    }))
}

function isSpectrumPoint(value: unknown): value is SpectrumPoint {
  return Array.isArray(value) && value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number"
}

export function parseSpectrumData(value: unknown): SpectrumPoint[] | null {
  if (!Array.isArray(value)) return null
  const points = value.filter(isSpectrumPoint).map(([wavelength, intensity]): SpectrumPoint => [wavelength, intensity])
  return points.length > 1 ? points : null
}

// FPbase serves one spectrum per request, so a full sync would be hundreds of round trips. GraphQL
// aliases let a batch of ids travel in a single POST.
export async function fetchFpbaseSpectra(ids: string[], batchSize = 25): Promise<Map<string, SpectrumPoint[]>> {
  const result = new Map<string, SpectrumPoint[]>()

  for (let offset = 0; offset < ids.length; offset += batchSize) {
    const batch = ids.slice(offset, offset + batchSize)
    const query = `{ ${batch.map((id) => `s${id}: spectrum(id: ${Number(id)}) { id data }`).join(" ")} }`
    const data = await fpbaseQuery<Record<string, { id: string; data: unknown } | null>>(query)
    if (!data) continue

    for (const id of batch) {
      const points = parseSpectrumData(data[`s${id}`]?.data)
      if (points) result.set(id, points)
    }
  }

  return result
}

const normalizeDyeTerm = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, "")

// Vendor shorthand is a two-letter prefix plus a wavelength ("AF647", "eF660", "iF488"). FPbase spells
// the family out, so the shorthand is expanded before lookup.
const VENDOR_PREFIXES: Record<string, string> = {
  af: "alexa fluor",
  bv: "brilliant violet",
  cf: "cf",
  cl: "coralite",
  dl: "dylight",
  ef: "efluor",
  if: "ifluor",
  jf: "janelia fluor",
  rb: "realblue",
  ry: "realyellow",
}

function expandVendorShorthand(term: string): string[] {
  const candidates = [term]
  const match = /^([A-Za-z]{2})[\s-]?(\d{3}[A-Za-z]?)$/.exec(term.trim())
  const family = match ? VENDOR_PREFIXES[match[1].toLowerCase()] : undefined
  if (match && family) candidates.push(`${family} ${match[2]}`)
  return candidates
}

// FPbase folds synonyms into the display name: "Fluorescein (FITC)", "PE (R-PE / R-phycoerythrin)",
// "Tetramethylrhodamine (TAMRA, TRITC)". The index is built in three passes so a full-name hit always
// beats a parenthetical one, and the shortest dye name wins inside a pass.
export function buildFpbaseDyeIndex(dyes: FpbaseDye[]): Map<string, FpbaseDye> {
  const passes: [string, FpbaseDye][][] = [[], [], []]

  for (const dye of dyes) {
    passes[0].push([normalizeDyeTerm(dye.name), dye])
    passes[0].push([normalizeDyeTerm(dye.slug.replace(/-default$/, "")), dye])

    const base = dye.name.replace(/\(.*?\)/g, "").trim()
    if (base && base !== dye.name) passes[1].push([normalizeDyeTerm(base), dye])

    for (const inner of dye.name.match(/\((.*?)\)/g) ?? []) {
      for (const part of inner.slice(1, -1).split(/[/,]/)) {
        const key = normalizeDyeTerm(part)
        if (key) passes[2].push([key, dye])
      }
    }
  }

  const index = new Map<string, FpbaseDye>()
  for (const pass of passes) {
    for (const [key, dye] of pass.sort((a, b) => a[1].name.length - b[1].name.length)) {
      if (key && !index.has(key)) index.set(key, dye)
    }
  }

  return index
}

export function matchFpbaseDye(name: string, aliases: string[], index: Map<string, FpbaseDye>): FpbaseDye | null {
  for (const candidate of [name, ...aliases]) {
    for (const expanded of expandVendorShorthand(candidate)) {
      const hit = index.get(normalizeDyeTerm(expanded))
      if (hit) return hit
    }
  }
  return null
}

function peakWavelength(points: SpectrumPoint[] | null): number | null {
  if (!points || points.length === 0) return null
  let peak = points[0]
  for (const point of points) {
    if (point[1] > peak[1]) peak = point
  }
  return Math.round(peak[0])
}

export function buildFluorophoreUpdate(
  dye: FpbaseDye,
  excitation: SpectrumPoint[] | null,
  emission: SpectrumPoint[] | null,
): FpbaseFluorophoreUpdate {
  return {
    fpbaseId: dye.id,
    fpbaseSlug: dye.slug,
    excitation: dye.exMax !== null ? Math.round(dye.exMax) : peakWavelength(excitation),
    emission: dye.emMax !== null ? Math.round(dye.emMax) : peakWavelength(emission),
    extinctionCoefficient: dye.extCoeff,
    quantumYield: dye.qy,
    excitationSpectrum: excitation,
    emissionSpectrum: emission,
  }
}

type SpectrumSlots = { excitation?: string; emission?: string }

// Some dyes publish an absorption (AB) curve instead of an excitation (EX) one. EX wins when both
// exist; AB is a usable stand-in for cross-excitation because it is the same transition.
function collectSpectrumSlots(refs: FpbaseSpectrumRef[]): Map<string, SpectrumSlots> {
  const bySlug = new Map<string, SpectrumSlots>()

  for (const ref of refs) {
    const slots = bySlug.get(ref.ownerSlug) ?? {}
    if (ref.subtype === "EM") slots.emission = ref.id
    if (ref.subtype === "EX") slots.excitation = ref.id
    if (ref.subtype === "AB" && !slots.excitation) slots.excitation = ref.id
    bySlug.set(ref.ownerSlug, slots)
  }

  return bySlug
}

/**
 * Resolve a set of stored fluorophores against FPbase and return the columns to write. The caller
 * (a script under scripts/) supplies the rows and performs the database writes, so this module stays
 * free of Prisma and of `server-only`.
 */
export async function resolveFluorophoreSpectra(inputs: FpbaseSyncInput[]): Promise<FpbaseSyncResult> {
  const dyes = await fetchFpbaseDyes()
  if (dyes.length === 0) return { matched: [], unmatched: inputs.map(({ id, name }) => ({ id, name })) }

  const index = buildFpbaseDyeIndex(dyes)
  const slots = collectSpectrumSlots(await fetchFpbaseDyeSpectra())

  const hits: { input: FpbaseSyncInput; dye: FpbaseDye }[] = []
  const unmatched: { id: string; name: string }[] = []

  for (const input of inputs) {
    const dye = matchFpbaseDye(input.name, input.aliases, index)
    if (dye) hits.push({ input, dye })
    else unmatched.push({ id: input.id, name: input.name })
  }

  const spectrumIds = new Set<string>()
  for (const { dye } of hits) {
    const slot = slots.get(dye.slug)
    if (slot?.excitation) spectrumIds.add(slot.excitation)
    if (slot?.emission) spectrumIds.add(slot.emission)
  }

  const spectra = await fetchFpbaseSpectra([...spectrumIds])

  const matched = hits.map(({ input, dye }) => {
    const slot = slots.get(dye.slug)
    const excitation = slot?.excitation ? (spectra.get(slot.excitation) ?? null) : null
    const emission = slot?.emission ? (spectra.get(slot.emission) ?? null) : null
    return { id: input.id, name: input.name, dye, update: buildFluorophoreUpdate(dye, excitation, emission) }
  })

  return { matched, unmatched }
}
