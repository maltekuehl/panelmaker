import "server-only"

import { searchAntibodies } from "@/models/antibody"
import { searchCellTypes as searchCellTypesQuery } from "@/models/cell-type"
import {
  getAllReports,
  getCellTypesFromReports,
  getReportsForCellType,
  getReportsForProtein,
} from "@/models/experimental-report"
import { getProteinById, searchProteins } from "@/models/protein"
import { tool } from "ai"
import { z } from "zod"

const searchMarkers = tool({
  description:
    "Search for proteins and antibodies relevant to a spatial proteomics panel. Use this to find markers by name, gene symbol, or target.",
  inputSchema: z.object({
    query: z.string().describe("Search term — gene symbol, protein name, or marker name (e.g. 'CD163', 'EPCAM')"),
  }),
  execute: async ({ query }) => {
    const [proteins, antibodies] = await Promise.all([searchProteins(query), searchAntibodies(query)])

    return {
      proteins: proteins.map((p) => ({
        id: p.id,
        label: p.label,
        geneSymbol: p.geneSymbol,
        ensemblGeneId: p.ensemblGeneId,
      })),
      antibodies: antibodies.map((a) => ({
        id: a.id,
        name: a.name,
        rrid: a.rrid,
        targetName: a.targetName,
        vendorName: a.vendorName,
        clonality: a.clonality,
        sourceOrganism: a.sourceOrganism,
        targetSpecies: a.targetSpecies,
      })),
      totalProteins: proteins.length,
      totalAntibodies: antibodies.length,
    }
  },
})

const getMarkerDetails = tool({
  description:
    "Get detailed information about a specific protein marker, including validated experimental reports and associated cell types.",
  inputSchema: z.object({
    proteinId: z.string().describe("The protein ID to retrieve details for"),
  }),
  execute: async ({ proteinId }) => {
    const [protein, reports, cellTypes] = await Promise.all([
      getProteinById(proteinId),
      getReportsForProtein(proteinId),
      getCellTypesFromReports(proteinId),
    ])

    if (!protein) {
      return { error: `Protein with ID ${proteinId} not found` }
    }

    return {
      protein: {
        id: protein.id,
        label: protein.label,
        geneSymbol: protein.geneSymbol,
        ensemblGeneId: protein.ensemblGeneId,
      },
      publishedReports: reports.map((r) => ({
        id: r.id,
        method: r.method,
        species: r.species,
        tissueType: r.tissueType,
        fixation: r.fixation,
        fluorophore: r.fluorophore,
        works: r.works,
        signalQuality: r.signalQuality,
        specificity: r.specificity,
        antibodyId: r.antibody?.id,
        antibodyName: r.antibody?.name,
        antibodyRrid: r.antibody?.rrid,
        cellTypeLabel: r.cellType?.label,
        structureLabel: r.structure?.label,
      })),
      associatedCellTypes: cellTypes.map((ct) => ({
        id: ct.id,
        label: ct.label,
      })),
      reportCount: reports.length,
      cellTypeCount: cellTypes.length,
    }
  },
})

const searchCellTypes = tool({
  description: "Search for cell types relevant to a panel design by name or ontology term.",
  inputSchema: z.object({
    query: z
      .string()
      .describe("Cell type name or partial name to search for (e.g. 'macrophage', 'T cell', 'hepatocyte')"),
  }),
  execute: async ({ query }) => {
    const cellTypes = await searchCellTypesQuery(query)

    return {
      cellTypes: cellTypes.map((ct) => ({
        id: ct.id,
        label: ct.label,
        parentIds: ct.parentIds,
      })),
      total: cellTypes.length,
    }
  },
})

const SPECIES_MAP: Record<string, string> = {
  "human": "HUMAN",
  "mouse": "MOUSE",
  "rat": "RAT",
  "pig": "PIG",
  "rabbit": "RABBIT",
  "zebrafish": "ZEBRAFISH",
  "nhp": "NON_HUMAN_PRIMATE",
  "non-human primate": "NON_HUMAN_PRIMATE",
  "primate": "NON_HUMAN_PRIMATE",
}

function normalizeSpecies(input: string): string {
  const upper = input.toUpperCase()
  if (["HUMAN", "MOUSE", "RAT", "PIG", "RABBIT", "ZEBRAFISH", "NON_HUMAN_PRIMATE", "OTHER"].includes(upper)) {
    return upper
  }
  return SPECIES_MAP[input.toLowerCase()] ?? input.toUpperCase()
}

const suggestPanel = tool({
  description:
    "Suggest validated marker antibodies for a given cell type, tissue, or species combination based on community-submitted experimental reports. Call searchCellTypes first if you need to find the correct cell type ID.",
  inputSchema: z.object({
    cellType: z.string().optional().describe("Target cell type name to search for (e.g. 'macrophage', 'T cell')"),
    tissue: z.string().optional().describe("Tissue or organ of interest (e.g. 'liver', 'lung', 'tonsil')"),
    species: z
      .string()
      .optional()
      .describe("Target species — will be normalized to enum (e.g. 'human', 'MOUSE', 'rat')"),
  }),
  execute: async ({ cellType, tissue, species }) => {
    const normalizedSpecies = species ? normalizeSpecies(species) : undefined

    let allReports: Awaited<ReturnType<typeof getAllReports>> = []

    if (cellType) {
      const matchedCellTypes = await searchCellTypesQuery(cellType)

      if (matchedCellTypes.length > 0) {
        const cellTypeReportArrays = await Promise.all(
          matchedCellTypes.slice(0, 5).map((ct) => getReportsForCellType(ct.id)),
        )
        allReports = cellTypeReportArrays.flat()
      }

      if (allReports.length === 0) {
        allReports = await getAllReports({ q: cellType, species: normalizedSpecies, limit: 50 })
      }
    }

    if (tissue) {
      const tissueReports = await getAllReports({ q: tissue, species: normalizedSpecies, limit: 50 })
      allReports = [...allReports, ...tissueReports]
    }

    if (!cellType && !tissue) {
      allReports = await getAllReports({ species: normalizedSpecies, limit: 50 })
    }

    if (normalizedSpecies) {
      allReports = allReports.filter((r) => r.species === normalizedSpecies)
    }

    const seen = new Set<string>()
    allReports = allReports.filter((r) => {
      if (seen.has(r.id)) return false
      seen.add(r.id)
      return true
    })

    const workedReports = allReports.filter((r) => r.works === true)

    const markerMap = new Map<
      string,
      {
        antibodyId: string | null
        antibodyName: string
        antibodyRrid: string | null
        targetName: string | null
        methods: Set<string>
        tissues: Set<string>
        cellTypes: Set<string>
        count: number
      }
    >()

    for (const report of workedReports) {
      const key = report.antibodyId?.toString() ?? ""
      if (!key) continue

      const existing = markerMap.get(key)
      const methods = existing?.methods ?? new Set<string>()
      const tissues = existing?.tissues ?? new Set<string>()
      const cellTypeLabels = existing?.cellTypes ?? new Set<string>()

      if (report.method) methods.add(report.method)
      if (report.tissueType) tissues.add(report.tissueType)
      if (report.cellType?.label) cellTypeLabels.add(report.cellType.label)

      markerMap.set(key, {
        antibodyId: report.antibodyId,
        antibodyName: report.antibody?.name ?? "Unknown",
        antibodyRrid: report.antibody?.rrid ?? null,
        targetName: report.antibody?.targetName ?? null,
        methods,
        tissues,
        cellTypes: cellTypeLabels,
        count: (existing?.count ?? 0) + 1,
      })
    }

    const suggestions = Array.from(markerMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 15)
      .map((m) => ({
        antibodyId: m.antibodyId,
        antibodyName: m.antibodyName,
        antibodyRrid: m.antibodyRrid,
        targetName: m.targetName,
        validatedReportCount: m.count,
        methods: Array.from(m.methods),
        tissues: Array.from(m.tissues),
        cellTypes: Array.from(m.cellTypes),
      }))

    return {
      suggestions,
      totalValidatedReports: workedReports.length,
      filters: { cellType, tissue, species: normalizedSpecies },
    }
  },
})

export const chatTools = {
  searchMarkers,
  getMarkerDetails,
  searchCellTypes,
  suggestPanel,
}
