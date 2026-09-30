import {
  fluorophoreBrightness,
  type FluorophoreSpectraMap,
  parseSpectrum,
  spectralOverlap,
} from "@/models/fluorophore/spectra"
import type { PanelCycleRow, PanelMarkerRow, PanelRow } from "./queries"

// ─── Spectral overlap ──────────────────────────────────────────────────
//
// Two emission curves are compared with the cosine similarity of their normalized intensities,
// resampled onto a 1 nm grid: dot(a, b) / (|a| * |b|), which is 1 for identical curves and 0 for
// curves that never share a wavelength.
//
// The 0.55 cut is a heuristic, not an instrument-specific prediction. It was chosen against real
// FPbase emission spectra so that pairs routinely imaged together in one acquisition round stay quiet
// (DAPI/AF488 0.50, AF488/AF555 0.26, AF555/AF647 0.10) while pairs that genuinely need unmixing are
// flagged (AF546/AF555 0.97, AF647/Cy5 0.94, AF594/Texas Red 0.98, AF555/AF568 0.61).
const EMISSION_OVERLAP_THRESHOLD = 0.55

// Cross-excitation: a pair can be separated on emission and still share an excitation line, which is
// the normal case for tandem dyes (PE and PE-Cy7 share the same donor). Reported as info only.
const EXCITATION_OVERLAP_THRESHOLD = 0.75

// Used only when a fluorophore has no stored emission spectrum.
const EMISSION_PEAK_DISTANCE_NM = 30

// Brightness is extinction coefficient times quantum yield. A pair this far apart in one cycle means
// the dim marker is exposed for the bright one, so it is worth surfacing.
const BRIGHTNESS_RATIO_THRESHOLD = 20

export type PairOverlap = {
  basis: "spectra" | "peak-distance"
  emissionOverlap: number | null
  excitationOverlap: number | null
  peakDistanceNm: number
}

type SpectralFluorophore = {
  id: string
  name: string
  excitation: number
  emission: number
  extinctionCoefficient?: number | null
  quantumYield?: number | null
  excitationSpectrum?: unknown
  emissionSpectrum?: unknown
}

export function computePairOverlap(a: SpectralFluorophore, b: SpectralFluorophore): PairOverlap {
  const peakDistanceNm = Math.abs(a.emission - b.emission)
  const emissionOverlap = spectralOverlap(parseSpectrum(a.emissionSpectrum), parseSpectrum(b.emissionSpectrum))
  const excitationOverlap = spectralOverlap(parseSpectrum(a.excitationSpectrum), parseSpectrum(b.excitationSpectrum))

  return {
    basis: emissionOverlap === null ? "peak-distance" : "spectra",
    emissionOverlap,
    excitationOverlap,
    peakDistanceNm,
  }
}

const formatPercent = (value: number): string => `${Math.round(value * 100)}%`

export type PanelWarning = {
  type: string
  severity: "info" | "warning" | "error"
  cycleId?: string
  markers?: string[]
  message: string
}

export type FluorophoreOverlapIssue = PanelWarning & {
  type: "fluorophore_overlap"
  cycleId: string
  markers: [string, string]
}

export type BrightnessIssue = PanelWarning & {
  type: "fluorophore_brightness"
  severity: "info"
  cycleId: string
  markers: [string, string]
}

export type CrossReactivityIssue = PanelWarning & {
  type: "cross_reactivity"
  severity: "warning"
  cycleId: string
  markers: [string, string]
}

export type PanelValidationResult = {
  valid: boolean
  warnings: PanelWarning[]
  errorCount: number
  warningCount: number
}

type MarkerWithFluorophore = PanelMarkerRow & { fluorophore: NonNullable<PanelMarkerRow["fluorophore"]> }

function resolveSpectralFluorophore(
  fluorophore: NonNullable<PanelMarkerRow["fluorophore"]>,
  spectra?: FluorophoreSpectraMap,
): SpectralFluorophore {
  const stored = spectra?.get(fluorophore.id)
  return {
    ...fluorophore,
    extinctionCoefficient: stored?.extinctionCoefficient ?? fluorophore.extinctionCoefficient,
    quantumYield: stored?.quantumYield ?? fluorophore.quantumYield,
    excitationSpectrum: stored?.excitationSpectrum,
    emissionSpectrum: stored?.emissionSpectrum,
  }
}

function brightnessNote(a: SpectralFluorophore, b: SpectralFluorophore): string {
  const brightnessA = fluorophoreBrightness(a)
  const brightnessB = fluorophoreBrightness(b)
  if (brightnessA === null || brightnessB === null) return ""

  const ratio = brightnessA > brightnessB ? brightnessA / brightnessB : brightnessB / brightnessA
  if (ratio < 3) return ""

  const dimmer = brightnessA < brightnessB ? a.name : b.name
  return ` ${dimmer} is about ${Math.round(ratio)} times dimmer, so it is the one that will be lost.`
}

function describeOverlap(
  cycleId: string,
  cycleName: string,
  a: MarkerWithFluorophore,
  b: MarkerWithFluorophore,
  spectra?: FluorophoreSpectraMap,
): FluorophoreOverlapIssue | null {
  const left = resolveSpectralFluorophore(a.fluorophore, spectra)
  const right = resolveSpectralFluorophore(b.fluorophore, spectra)
  const overlap = computePairOverlap(left, right)
  const base = { type: "fluorophore_overlap" as const, cycleId, markers: [a.id, b.id] as [string, string] }

  if (overlap.basis === "peak-distance") {
    if (overlap.peakDistanceNm >= EMISSION_PEAK_DISTANCE_NM) return null
    return {
      ...base,
      severity: "warning",
      message: `${cycleName}: Likely spectral overlap between ${left.name} and ${right.name}. Their emission peaks are ${overlap.peakDistanceNm}nm apart and no FPbase spectrum is stored for at least one of them.`,
    }
  }

  const emissionOverlap = overlap.emissionOverlap ?? 0
  if (emissionOverlap >= EMISSION_OVERLAP_THRESHOLD) {
    return {
      ...base,
      severity: "warning",
      message: `${cycleName}: ${left.name} and ${right.name} share ${formatPercent(emissionOverlap)} of their emission spectrum. Separating them needs spectral unmixing or a different pairing.${brightnessNote(left, right)}`,
    }
  }

  const excitationOverlap = overlap.excitationOverlap
  if (excitationOverlap !== null && excitationOverlap >= EXCITATION_OVERLAP_THRESHOLD) {
    return {
      ...base,
      severity: "info",
      message: `${cycleName}: ${left.name} and ${right.name} separate on emission but share ${formatPercent(excitationOverlap)} of their excitation. One excitation line will raise both, so check the filter set and the exposure order.`,
    }
  }

  return null
}

export function checkFluorophoreOverlap(
  markers: PanelMarkerRow[],
  cycleNames: Map<string, string>,
  spectra?: FluorophoreSpectraMap,
): FluorophoreOverlapIssue[] {
  const issues: FluorophoreOverlapIssue[] = []

  const byCycle = groupByCycle(markers)

  for (const [cycleId, cycleMarkers] of byCycle) {
    const cycleName = cycleNames.get(cycleId) ?? `Cycle ${cycleId}`
    const withFluorophore = cycleMarkers.filter((m): m is MarkerWithFluorophore => m.fluorophore != null)

    for (let i = 0; i < withFluorophore.length; i++) {
      for (let j = i + 1; j < withFluorophore.length; j++) {
        const a = withFluorophore[i]
        const b = withFluorophore[j]

        if (a.fluorophoreId === b.fluorophoreId) {
          issues.push({
            type: "fluorophore_overlap",
            severity: "error",
            cycleId,
            markers: [a.id, b.id],
            message: `${cycleName}: ${a.fluorophore.name} is used by two markers in the same cycle. Their signals cannot be separated.`,
          })
          continue
        }

        const issue = describeOverlap(cycleId, cycleName, a, b, spectra)
        if (issue) issues.push(issue)
      }
    }
  }

  return issues
}

export function checkFluorophoreBrightness(
  markers: PanelMarkerRow[],
  cycleNames: Map<string, string>,
  spectra?: FluorophoreSpectraMap,
): BrightnessIssue[] {
  const issues: BrightnessIssue[] = []

  for (const [cycleId, cycleMarkers] of groupByCycle(markers)) {
    const cycleName = cycleNames.get(cycleId) ?? `Cycle ${cycleId}`
    const rated = cycleMarkers
      .filter((m): m is MarkerWithFluorophore => m.fluorophore != null)
      .map((marker) => ({ marker, fluorophore: resolveSpectralFluorophore(marker.fluorophore, spectra) }))
      .map((entry) => ({ ...entry, brightness: fluorophoreBrightness(entry.fluorophore) }))
      .filter((entry): entry is typeof entry & { brightness: number } => entry.brightness !== null)

    if (rated.length < 2) continue

    const brightest = rated.reduce((best, entry) => (entry.brightness > best.brightness ? entry : best))
    const dimmest = rated.reduce((worst, entry) => (entry.brightness < worst.brightness ? entry : worst))
    const ratio = brightest.brightness / dimmest.brightness
    if (ratio < BRIGHTNESS_RATIO_THRESHOLD) continue

    issues.push({
      type: "fluorophore_brightness",
      severity: "info",
      cycleId,
      markers: [dimmest.marker.id, brightest.marker.id],
      message: `${cycleName}: ${brightest.fluorophore.name} is about ${Math.round(ratio)} times brighter than ${dimmest.fluorophore.name}. Put the dim dye on the abundant target, or expect to push its exposure.`,
    })
  }

  return issues
}

const UNCONJUGATED_LABELS = new Set(["", "unconjugated", "none", "unknown", "n/a"])

function isDirectlyConjugated(marker: PanelMarkerRow): boolean {
  return !UNCONJUGATED_LABELS.has((marker.antibody?.conjugate ?? "").trim().toLowerCase())
}

export function checkCrossReactivity(
  markers: PanelMarkerRow[],
  cycleNames: Map<string, string>,
): CrossReactivityIssue[] {
  const issues: CrossReactivityIssue[] = []

  const byCycle = groupByCycle(markers)

  for (const [cycleId, cycleMarkers] of byCycle) {
    const cycleName = cycleNames.get(cycleId) ?? `Cycle ${cycleId}`
    // A directly conjugated primary needs no secondary, so a shared host species cannot cross-react.
    const withSpecies = cycleMarkers.filter((m) => m.antibody?.hostTaxon?.id && !isDirectlyConjugated(m))

    for (let i = 0; i < withSpecies.length; i++) {
      for (let j = i + 1; j < withSpecies.length; j++) {
        const a = withSpecies[i]
        const b = withSpecies[j]

        if (a.antibody?.hostTaxon?.id === b.antibody?.hostTaxon?.id) {
          const species = a.antibody?.hostTaxon?.label as string
          const labelA = antibodyLabel(a)
          const labelB = antibodyLabel(b)
          issues.push({
            type: "cross_reactivity",
            severity: "warning",
            cycleId,
            markers: [a.id, b.id],
            message: `${cycleName}: Cross-reactivity risk: ${labelA} and ${labelB} are both raised in ${species}. Secondary antibodies may cross-react without species-specific blocking.`,
          })
        }
      }
    }
  }

  return issues
}

export type TaggingIssue = PanelWarning & {
  type: "tagging_modality"
  severity: "warning"
  cycleId: string
  markers: [string]
}

// Which tag a marker needs is a property of the imaging method, read from the ImagingMethod row:
// a fluorescence method reads dyes, a mass method reads metal isotopes. A panel with no method set
// yet is left alone rather than guessed at.
export function checkTaggingModality(
  panel: PanelRow,
  markers: PanelMarkerRow[],
  cycleNames: Map<string, string>,
): TaggingIssue[] {
  const detection = panel.imagingMethod?.detection
  if (detection !== "FLUORESCENCE" && detection !== "MASS") return []

  const methodLabel = panel.imagingMethod?.shortLabel ?? "This method"
  const issues: TaggingIssue[] = []

  for (const marker of markers) {
    const cycleName = cycleNames.get(marker.cycleId) ?? `Cycle ${marker.cycleId}`
    const target = marker.protein?.label ?? marker.antibody?.name ?? "A marker"
    const base = {
      type: "tagging_modality" as const,
      severity: "warning" as const,
      cycleId: marker.cycleId,
      markers: [marker.id] as [string],
    }

    if (detection === "FLUORESCENCE" && marker.metalTag) {
      issues.push({
        ...base,
        message: `${cycleName}: ${target} carries the metal tag ${marker.metalTag}, but ${methodLabel} reads fluorescence. Give it a fluorophore instead.`,
      })
      continue
    }

    if (detection === "MASS" && marker.fluorophore) {
      issues.push({
        ...base,
        message: `${cycleName}: ${target} carries the fluorophore ${marker.fluorophore.name}, but ${methodLabel} reads metal isotopes. Give it a metal tag instead.`,
      })
    }
  }

  return issues
}

// `spectra` is optional so existing synchronous callers keep working. Without it the overlap check
// falls back to the stored emission peaks; `validatePanelWithSpectra` in ./queries loads the curves.
export function validatePanel(panel: PanelRow, spectra?: FluorophoreSpectraMap): PanelValidationResult {
  const allMarkers: PanelMarkerRow[] = panel.cycles.flatMap((cycle) => cycle.markers)
  const cycleNames = buildCycleNameMap(panel.cycles)

  // Spectral overlap and relative brightness are properties of dyes, so they say nothing about a
  // mass-detection panel; its channels are isotope masses.
  const isMassPanel = panel.imagingMethod?.detection === "MASS"
  const fluorophoreWarnings = isMassPanel ? [] : checkFluorophoreOverlap(allMarkers, cycleNames, spectra)
  const brightnessWarnings = isMassPanel ? [] : checkFluorophoreBrightness(allMarkers, cycleNames, spectra)
  const crossReactivityWarnings = checkCrossReactivity(allMarkers, cycleNames)
  const taggingWarnings = checkTaggingModality(panel, allMarkers, cycleNames)
  const warnings: PanelWarning[] = [
    ...fluorophoreWarnings,
    ...crossReactivityWarnings,
    ...taggingWarnings,
    ...brightnessWarnings,
  ]

  const errorCount = warnings.filter((w) => w.severity === "error").length
  const warningCount = warnings.filter((w) => w.severity === "warning").length

  return {
    valid: errorCount === 0,
    warnings,
    errorCount,
    warningCount,
  }
}

const CSV_HEADER =
  "Cycle,Notes,Protein,Gene Symbol,Antibody,Clone,RRID,Vendor,Catalog #,Fluorophore,Metal Tag,Host Species"

export function exportPanelCsv(panel: PanelRow): string {
  const rows = panel.cycles.flatMap((cycle) =>
    cycle.markers.map((marker) => {
      const cols = [
        escapeCsvField(cycle.name),
        escapeCsvField(cycle.notes ?? ""),
        escapeCsvField(marker.protein?.label ?? ""),
        escapeCsvField(marker.protein?.geneSymbol ?? ""),
        escapeCsvField(marker.antibody?.name ?? ""),
        escapeCsvField(marker.antibody?.cloneId ?? ""),
        escapeCsvField(marker.antibody?.rrid ?? ""),
        escapeCsvField(marker.antibody?.vendorName ?? ""),
        escapeCsvField(marker.antibody?.catalogNumber ?? ""),
        escapeCsvField(marker.fluorophore?.name ?? ""),
        escapeCsvField(marker.metalTag ?? ""),
        escapeCsvField(marker.antibody?.hostTaxon?.label ?? ""),
      ]
      return cols.join(",")
    }),
  )

  return [CSV_HEADER, ...rows].join("\n")
}

const ORDER_CSV_HEADER = "Protein,Gene Symbol,Antibody,Clone,RRID,Vendor,Catalog #,Host Species,Conjugate,Quantity"

export function exportPanelOrderCsv(panel: PanelRow): string {
  const seen = new Set<string>()
  const dedupedMarkers: PanelMarkerRow[] = []

  for (const cycle of panel.cycles) {
    for (const marker of cycle.markers) {
      if (marker.antibodyId !== null && !seen.has(marker.antibodyId)) {
        seen.add(marker.antibodyId)
        dedupedMarkers.push(marker)
      }
    }
  }

  dedupedMarkers.sort((a, b) => {
    const vendorA = a.antibody?.vendorName ?? ""
    const vendorB = b.antibody?.vendorName ?? ""
    if (vendorA !== vendorB) return vendorA.localeCompare(vendorB)
    const proteinA = a.protein?.label ?? ""
    const proteinB = b.protein?.label ?? ""
    return proteinA.localeCompare(proteinB)
  })

  const rows = dedupedMarkers.map((marker) => {
    const cols = [
      escapeCsvField(marker.protein?.label ?? ""),
      escapeCsvField(marker.protein?.geneSymbol ?? ""),
      escapeCsvField(marker.antibody?.name ?? ""),
      escapeCsvField(marker.antibody?.cloneId ?? ""),
      escapeCsvField(marker.antibody?.rrid ?? ""),
      escapeCsvField(marker.antibody?.vendorName ?? ""),
      escapeCsvField(marker.antibody?.catalogNumber ?? ""),
      escapeCsvField(marker.antibody?.hostTaxon?.label ?? ""),
      escapeCsvField(marker.antibody?.conjugate ?? ""),
      "1",
    ]
    return cols.join(",")
  })

  return [ORDER_CSV_HEADER, ...rows].join("\n")
}

export function exportPanelJson(panel: PanelRow): object {
  return {
    id: panel.id,
    name: panel.name,
    description: panel.description,
    species: panel.species?.label ?? null,
    fixation: panel.fixation,
    method: panel.imagingMethod
      ? { id: panel.imagingMethod.id, label: panel.imagingMethod.label, efoId: panel.imagingMethod.efoId }
      : null,
    condition: panel.condition,
    isPublic: panel.visibility === "PUBLIC",
    createdAt: panel.createdAt,
    updatedAt: panel.updatedAt,
    cycles: panel.cycles.map((cycle) => ({
      id: cycle.id,
      name: cycle.name,
      notes: cycle.notes,
      sortOrder: cycle.sortOrder,
      markers: cycle.markers.map((marker) => ({
        id: marker.id,
        sortOrder: marker.sortOrder,
        fluorophore: marker.fluorophore?.name ?? null,
        metalTag: marker.metalTag,
        protein: marker.protein
          ? {
              id: marker.protein.id,
              label: marker.protein.label,
              geneSymbol: marker.protein.geneSymbol,
            }
          : null,
        antibody: marker.antibody
          ? {
              id: marker.antibody.id,
              name: marker.antibody.name,
              rrid: marker.antibody.rrid,
              conjugate: marker.antibody.conjugate,
              hostSpecies: marker.antibody.hostTaxon?.label ?? null,
              vendorName: marker.antibody.vendorName,
              catalogNumber: marker.antibody.catalogNumber,
              cloneId: marker.antibody.cloneId,
            }
          : null,
      })),
    })),
  }
}

function buildCycleNameMap(cycles: PanelCycleRow[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const cycle of cycles) {
    map.set(cycle.id, cycle.name)
  }
  return map
}

function antibodyLabel(marker: PanelMarkerRow): string {
  const name = marker.antibody?.name ?? marker.protein?.label ?? "Unknown"
  const clone = marker.antibody?.cloneId
  return clone ? `${name} (clone ${clone})` : name
}

function groupByCycle(markers: PanelMarkerRow[]): Map<string, PanelMarkerRow[]> {
  const map = new Map<string, PanelMarkerRow[]>()
  for (const marker of markers) {
    const existing = map.get(marker.cycleId) ?? []
    existing.push(marker)
    map.set(marker.cycleId, existing)
  }
  return map
}

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
