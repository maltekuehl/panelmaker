import type { PanelCycleRow, PanelMarkerRow, PanelRow } from "./queries"

const EMISSION_OVERLAP_THRESHOLD_NM = 30

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

export type PanelReport = {
  title: string
  generatedAt: string
  summary: {
    totalMarkers: number
    totalCycles: number
    species: string | null
    fixation: string | null
  }
  cycles: {
    name: string
    markers: {
      protein: string
      antibody: string | null
      fluorophore: string | null
      metalTag: string | null
    }[]
  }[]
  warnings: PanelWarning[]
}

type MarkerWithFluorophore = PanelMarkerRow & { fluorophore: NonNullable<PanelMarkerRow["fluorophore"]> }

export function checkFluorophoreOverlap(
  markers: PanelMarkerRow[],
  cycleNames: Map<string, string>,
): FluorophoreOverlapIssue[] {
  const issues: FluorophoreOverlapIssue[] = []

  const byCycle = groupByCycle(markers)

  for (const [cycleId, cycleMarkers] of byCycle) {
    const cycleName = cycleNames.get(cycleId) ?? `Cycle ${cycleId}`
    const withSpectra = cycleMarkers.filter((m): m is MarkerWithFluorophore => m.fluorophore != null)

    for (let i = 0; i < withSpectra.length; i++) {
      for (let j = i + 1; j < withSpectra.length; j++) {
        const a = withSpectra[i]
        const b = withSpectra[j]

        if (Math.abs(a.fluorophore.emission - b.fluorophore.emission) < EMISSION_OVERLAP_THRESHOLD_NM) {
          issues.push({
            type: "fluorophore_overlap",
            severity: "warning",
            cycleId,
            markers: [a.id, b.id],
            message: `${cycleName}: Spectral overlap detected between ${a.fluorophore.name} and ${b.fluorophore.name}. Their emission peaks are within ${EMISSION_OVERLAP_THRESHOLD_NM}nm of each other.`,
          })
        }
      }
    }
  }

  return issues
}

export function checkCrossReactivity(
  markers: PanelMarkerRow[],
  cycleNames: Map<string, string>,
): CrossReactivityIssue[] {
  const issues: CrossReactivityIssue[] = []

  const byCycle = groupByCycle(markers)

  for (const [cycleId, cycleMarkers] of byCycle) {
    const cycleName = cycleNames.get(cycleId) ?? `Cycle ${cycleId}`
    const withSpecies = cycleMarkers.filter(
      (m) => m.antibody?.sourceOrganism !== null && m.antibody?.sourceOrganism !== undefined,
    )

    for (let i = 0; i < withSpecies.length; i++) {
      for (let j = i + 1; j < withSpecies.length; j++) {
        const a = withSpecies[i]
        const b = withSpecies[j]

        if (a.antibody?.sourceOrganism === b.antibody?.sourceOrganism) {
          const species = a.antibody?.sourceOrganism as string
          const labelA = antibodyLabel(a)
          const labelB = antibodyLabel(b)
          issues.push({
            type: "cross_reactivity",
            severity: "warning",
            cycleId,
            markers: [a.id, b.id],
            message: `${cycleName}: Cross-reactivity risk — ${labelA} and ${labelB} are both raised in ${species}. Secondary antibodies may cross-react without species-specific blocking.`,
          })
        }
      }
    }
  }

  return issues
}

export function validatePanel(panel: PanelRow): PanelValidationResult {
  const allMarkers: PanelMarkerRow[] = panel.cycles.flatMap((cycle) => cycle.markers)
  const cycleNames = buildCycleNameMap(panel.cycles)

  const fluorophoreWarnings = checkFluorophoreOverlap(allMarkers, cycleNames)
  const crossReactivityWarnings = checkCrossReactivity(allMarkers, cycleNames)
  const warnings: PanelWarning[] = [...fluorophoreWarnings, ...crossReactivityWarnings]

  const errorCount = warnings.filter((w) => w.severity === "error").length
  const warningCount = warnings.filter((w) => w.severity === "warning").length

  return {
    valid: errorCount === 0,
    warnings,
    errorCount,
    warningCount,
  }
}

export function generatePanelReport(panel: PanelRow, warnings: PanelWarning[]): PanelReport {
  const totalMarkers = panel.cycles.reduce((sum, cycle) => sum + cycle.markers.length, 0)

  return {
    title: panel.name,
    generatedAt: new Date().toISOString(),
    summary: {
      totalMarkers,
      totalCycles: panel.cycles.length,
      species: panel.species ?? null,
      fixation: panel.fixation ?? null,
    },
    cycles: panel.cycles.map((cycle) => ({
      name: cycle.name,
      markers: cycle.markers.map((marker) => ({
        protein: marker.protein?.label ?? String(marker.proteinId ?? ""),
        antibody: marker.antibody?.name ?? null,
        fluorophore: marker.fluorophore?.name ?? null,
        metalTag: marker.metalTag ?? null,
      })),
    })),
    warnings,
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
        escapeCsvField(marker.antibody?.sourceOrganism ?? ""),
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
      escapeCsvField(marker.antibody?.sourceOrganism ?? ""),
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
    species: panel.species,
    fixation: panel.fixation,
    condition: panel.condition,
    isPublic: panel.isPublic,
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
              sourceOrganism: marker.antibody.sourceOrganism,
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
