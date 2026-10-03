// Spectral maths for stored FPbase curves. Pure and free of Prisma, so both the panel intelligence
// and the API transforms can use it.

// [wavelength in nm, intensity normalized to a peak of 1], as FPbase serves it.
export type SpectrumPoint = [number, number]

export type FluorophoreSpectra = {
  excitationSpectrum: unknown
  emissionSpectrum: unknown
  extinctionCoefficient: number | null
  quantumYield: number | null
}

export type FluorophoreSpectraMap = Map<string, FluorophoreSpectra>

export function parseSpectrum(value: unknown): SpectrumPoint[] | null {
  if (!Array.isArray(value)) return null

  const points: SpectrumPoint[] = []
  for (const entry of value) {
    if (Array.isArray(entry) && typeof entry[0] === "number" && typeof entry[1] === "number") {
      points.push([entry[0], entry[1]])
    }
  }

  return points.length > 1 ? points : null
}

function resample(points: SpectrumPoint[]): Map<number, number> {
  const grid = new Map<number, number>()
  for (const [wavelength, intensity] of points) {
    const nm = Math.round(wavelength)
    grid.set(nm, Math.max(grid.get(nm) ?? 0, Math.max(intensity, 0)))
  }
  return grid
}

/**
 * Normalized overlap integral of two spectra: dot(a, b) / (|a| * |b|) on a shared 1 nm grid. Returns
 * 1 for identical curves, 0 for curves that never share a wavelength, and null when either is missing.
 */
export function spectralOverlap(a: SpectrumPoint[] | null, b: SpectrumPoint[] | null): number | null {
  if (!a || !b) return null

  const gridA = resample(a)
  const gridB = resample(b)

  let dot = 0
  let normA = 0
  let normB = 0

  for (const value of gridA.values()) normA += value * value
  for (const [nm, value] of gridB) {
    normB += value * value
    const other = gridA.get(nm)
    if (other !== undefined) dot += other * value
  }

  if (normA === 0 || normB === 0) return null
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

export function fluorophoreBrightness(fluorophore: {
  extinctionCoefficient?: number | null
  quantumYield?: number | null
}): number | null {
  const { extinctionCoefficient, quantumYield } = fluorophore
  if (typeof extinctionCoefficient !== "number" || typeof quantumYield !== "number") return null
  if (extinctionCoefficient <= 0 || quantumYield <= 0) return null
  return extinctionCoefficient * quantumYield
}
