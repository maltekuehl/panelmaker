import "server-only"

import { Fixation, type LabRole } from "@/lib/generated/prisma/enums"
import { prisma } from "@/lib/prisma"
import { checkUserRateLimit, RATE_LIMITS } from "@/lib/rate-limiting"
import { getAntibodyById, lookupByRrid, searchAntibodies } from "@/models/antibody"
import { getCellTypeDescendantIds, searchCellTypes } from "@/models/cell-type"
import { aggregateReports, type EvidenceFilter, type EvidenceGroupBy, findReports } from "@/models/evidence"
import { fluorophoreExists, searchFluorophores } from "@/models/fluorophore"
import { canEditPanel, getInventoryForLabs, getLabsForUser } from "@/models/lab"
import type { ViewerContext } from "@/models/lab/access"
import {
  addCycle,
  addMarker,
  createPanel,
  getPanelById,
  getPanelsForUser,
  getVisiblePanelById,
  getVisiblePanels,
  type PanelRow,
  removeCycle,
  removeMarker,
  reorderMarkers,
  validatePanel,
} from "@/models/panel"
import { getProteinById, searchProteins } from "@/models/protein"
import { searchTaxa } from "@/models/taxon"
import { searchTissues } from "@/models/tissue"
import { tool } from "ai"
import { z } from "zod"

// All tools close over the server-resolved viewer. A model-supplied scope/labIds is intersected with
// the viewer's own memberships, so non-public lab data can never leak across labs.
function scopedViewer(
  viewer: ViewerContext,
  scope: "public" | "mine" | "labs",
  labIds?: string[],
): ViewerContext | null {
  if (scope === "public") return null
  if (scope === "mine" || !labIds?.length) return scope === "mine" ? viewer : null
  const allowed = labIds.filter((id) => viewer.labIds.includes(id))
  const roleByLab: Record<string, LabRole> = {}
  for (const id of allowed) roleByLab[id] = viewer.roleByLab[id]
  return { ...viewer, labIds: allowed, roleByLab }
}

const scopeSchema = z
  .enum(["public", "mine", "labs"])
  .default("public")
  .describe("public = published+public only; mine = also your own + all your labs' work; labs = only the given labIds")

const evidenceFilterShape = {
  markerIds: z.array(z.string()).optional().describe("Protein/marker ids (from resolveMarkers)"),
  cellTypeIds: z.array(z.string()).optional().describe("Cell type ids; expand with resolveCellTypes first"),
  tissueIds: z.array(z.string()).optional(),
  speciesIds: z.array(z.string()).optional().describe("Taxon ids (from resolveSpecies)"),
  methods: z.array(z.string()).optional().describe("MultiplexMethod values: CODEX, CYCIF, IMC, MIBI, IBEX, PATHOPLEX"),
  antibodyIds: z.array(z.string()).optional(),
  rrids: z.array(z.string()).optional(),
  hostTaxonIds: z.array(z.string()).optional(),
  clonalities: z.array(z.string()).optional().describe("MONOCLONAL, POLYCLONAL, RECOMBINANT, OLIGOCLONAL"),
  conjugates: z.array(z.string()).optional(),
  fluorophoreIds: z.array(z.string()).optional(),
  works: z.boolean().optional().describe("true = only validations that worked; false = only failures"),
  signalQualityIn: z.array(z.string()).optional().describe("EXCELLENT, GOOD, MODERATE, POOR, NONE"),
  specificityIn: z.array(z.string()).optional().describe("HIGH, MODERATE, LOW, NON_SPECIFIC"),
  submitterIds: z.array(z.string()).optional(),
  conditionIds: z.array(z.string()).optional(),
}

function pickFilter(input: Record<string, unknown>): EvidenceFilter {
  const keys = Object.keys(evidenceFilterShape) as (keyof EvidenceFilter)[]
  const filter: Record<string, unknown> = {}
  for (const key of keys) if (input[key] !== undefined) filter[key] = input[key]
  return filter as EvidenceFilter
}

const LABILE_PATTERN = /phospho|(^|[^a-z])p-|cleaved|^p[STY]\d|active\s/i

function mapPanel(panel: PanelRow) {
  const markers = panel.cycles.flatMap((cycle) =>
    cycle.markers.map((marker) => ({
      cycle: cycle.name,
      markerId: marker.protein?.id ?? null,
      marker: marker.protein?.geneSymbol ?? marker.protein?.label ?? null,
      antibody: marker.antibody?.name ?? null,
      rrid: marker.antibody?.rrid ?? null,
      host: marker.antibody?.hostTaxon?.label ?? null,
      fluorophore: marker.fluorophore?.name ?? null,
    })),
  )
  return {
    id: panel.id,
    name: panel.name,
    ownerId: panel.ownerId,
    owner: panel.owner?.name ?? null,
    visibility: panel.visibility,
    species: panel.species?.label ?? null,
    markerCount: markers.length,
    markers,
  }
}

// Editing view: exposes the cycle and marker ids the panel-editing tools need to target.
function mapPanelForEditing(panel: PanelRow) {
  return {
    id: panel.id,
    name: panel.name,
    visibility: panel.visibility,
    species: panel.species?.label ?? null,
    cycles: panel.cycles.map((cycle) => ({
      cycleId: cycle.id,
      name: cycle.name,
      sortOrder: cycle.sortOrder,
      markers: cycle.markers.map((marker) => ({
        markerId: marker.id,
        marker: marker.protein?.geneSymbol ?? marker.protein?.label ?? null,
        antibody: marker.antibody?.name ?? null,
        rrid: marker.antibody?.rrid ?? null,
        fluorophore: marker.fluorophore?.name ?? null,
        sortOrder: marker.sortOrder,
      })),
    })),
  }
}

// RRIDs are stored with the "RRID:" prefix (e.g. "RRID:AB_443425"). Models pass them either way, so try
// the prefixed form, the raw form, then treat the value as an internal antibody id.
async function resolveAntibodyFlexible(idOrRrid: string) {
  const raw = idOrRrid.trim()
  const withPrefix = raw.startsWith("RRID:") ? raw : `RRID:${raw}`
  return (await lookupByRrid(withPrefix)) ?? (await lookupByRrid(raw)) ?? (await getAntibodyById(raw))
}

export function createChatTools(viewer: ViewerContext) {
  const resolveMarkers = tool({
    description: "Resolve a marker/protein name or gene symbol to ids (e.g. 'CD8', 'FOXP3', 'Ki-67').",
    inputSchema: z.object({ query: z.string() }),
    execute: async ({ query }) => {
      const proteins = await searchProteins(query)
      return {
        markers: proteins.map((p) => ({ id: p.id, label: p.label, geneSymbol: p.geneSymbol })),
      }
    },
  })

  const resolveCellTypes = tool({
    description:
      "Resolve a cell-type name to ids. Set expandDescendants for broad terms like 'T cell' so the ids cover CD4/CD8/etc.",
    inputSchema: z.object({
      query: z.string(),
      expandDescendants: z.boolean().default(false),
    }),
    execute: async ({ query, expandDescendants }) => {
      const matches = await searchCellTypes(query)
      const top = matches.slice(0, 5)
      let expandedIds: string[] = top.map((c) => c.id)
      if (expandDescendants && top.length > 0) {
        const sets = await Promise.all(top.map((c) => getCellTypeDescendantIds(c.id)))
        expandedIds = [...new Set(sets.flat())]
      }
      return {
        matches: matches.map((c) => ({ id: c.id, label: c.label })),
        expandedIds,
      }
    },
  })

  const resolveSpecies = tool({
    description: "Resolve a species name (e.g. 'mouse', 'human') to taxon ids used by reports.",
    inputSchema: z.object({ query: z.string() }),
    execute: async ({ query }) => ({ species: (await searchTaxa(query)).map((t) => ({ id: t.id, label: t.label })) }),
  })

  const resolveTissues = tool({
    description: "Resolve a tissue/organ name (e.g. 'kidney', 'tonsil') to tissue ids used by reports.",
    inputSchema: z.object({ query: z.string() }),
    execute: async ({ query }) => ({
      tissues: (await searchTissues(query)).map((t) => ({ id: t.id, label: t.label })),
    }),
  })

  const resolveAntibodies = tool({
    description: "Resolve an antibody by name, RRID, target, or clone to its catalog record.",
    inputSchema: z.object({ query: z.string() }),
    execute: async ({ query }) => {
      const antibodies = await searchAntibodies(query)
      return {
        antibodies: antibodies.map((a) => ({
          id: a.id,
          name: a.name,
          rrid: a.rrid,
          targetName: a.targetName,
          clonality: a.clonality,
          host: a.hostTaxon?.label ?? null,
          vendor: a.vendorName,
        })),
      }
    },
  })

  const getMarkerDetails = tool({
    description: "Full detail for a marker/protein, including validation reports visible to you.",
    inputSchema: z.object({ markerId: z.string(), scope: scopeSchema }),
    execute: async ({ markerId, scope }) => {
      const [protein, reports] = await Promise.all([
        getProteinById(markerId),
        findReports(scopedViewer(viewer, scope), { markerIds: [markerId] }, 50),
      ])
      if (!protein) return { error: `Marker ${markerId} not found` }
      return {
        marker: { id: protein.id, label: protein.label, geneSymbol: protein.geneSymbol },
        reportCount: reports.length,
        reports,
      }
    },
  })

  const getAntibodyDetails = tool({
    description: "Full detail for an antibody (by id or RRID) plus its validation reports.",
    inputSchema: z.object({ idOrRrid: z.string(), scope: scopeSchema }),
    execute: async ({ idOrRrid, scope }) => {
      const antibody = await resolveAntibodyFlexible(idOrRrid)
      if (!antibody) return { error: `Antibody ${idOrRrid} not found` }
      const reports = await findReports(scopedViewer(viewer, scope), { antibodyIds: [antibody.id] }, 50)
      return {
        antibody: {
          id: antibody.id,
          name: antibody.name,
          rrid: antibody.rrid,
          cloneId: antibody.cloneId,
          clonality: antibody.clonality,
          host: antibody.hostTaxon?.label ?? null,
          vendor: antibody.vendorName,
          conjugate: antibody.conjugate,
          targetName: antibody.targetName,
        },
        reportCount: reports.length,
        reports,
      }
    },
  })

  const findReportsTool = tool({
    description:
      "THE evidence workhorse. Search validation reports with any combination of filters. Resolve names to ids first. Returns individual reports (antibody, clone, dilution, antigen retrieval, fixation, fluorophore, works, signal quality, specificity, submitter, lab, report link).",
    inputSchema: z.object({
      ...evidenceFilterShape,
      scope: scopeSchema,
      labIds: z.array(z.string()).optional(),
      limit: z.number().int().min(1).max(200).default(50),
    }),
    execute: async (input) => {
      const reports = await findReports(scopedViewer(viewer, input.scope, input.labIds), pickFilter(input), input.limit)
      return { count: reports.length, reports }
    },
  })

  const aggregateReportsTool = tool({
    description:
      "Roll up reports along one dimension with works-rate and strong-signal counts. Use groupBy 'antibody'/'clone' to rank antibodies, 'marker' to rank markers for cell types, 'dilution'/'antigenRetrieval'/'fixation' for protocols, 'fluorophore' for empirical contrast, 'submitter' for who has experience.",
    inputSchema: z.object({
      ...evidenceFilterShape,
      groupBy: z.enum([
        "antibody",
        "clone",
        "marker",
        "tissue",
        "species",
        "dilution",
        "antigenRetrieval",
        "fixation",
        "method",
        "submitter",
        "fluorophore",
      ]),
      scope: scopeSchema,
      labIds: z.array(z.string()).optional(),
      limit: z.number().int().min(1).max(500).default(300),
    }),
    execute: async (input) => {
      const groups = await aggregateReports(
        scopedViewer(viewer, input.scope, input.labIds),
        pickFilter(input),
        input.groupBy as EvidenceGroupBy,
        input.limit,
      )
      return { groups: groups.slice(0, 25) }
    },
  })

  const listMyLabs = tool({
    description: "List the labs you belong to (id, name, role). Call this first for any lab-scoped question.",
    inputSchema: z.object({}),
    execute: async () => {
      const labs = await getLabsForUser(viewer.userId)
      return {
        labs: labs.map(({ lab, role }) => ({
          id: lab.id,
          name: lab.name,
          slug: lab.slug,
          role,
          memberCount: lab._count.memberships,
          inventoryCount: lab._count.inventory,
        })),
      }
    },
  })

  const getLabInventory = tool({
    description:
      "Antibodies stocked in your labs (defaults to all your labs). Filter by marker, host species, clonality, RRID, or stock status (IN_STOCK, LOW, ORDERED, OUT_OF_STOCK).",
    inputSchema: z.object({
      labIds: z.array(z.string()).optional(),
      markerIds: z.array(z.string()).optional(),
      hostTaxonIds: z.array(z.string()).optional(),
      clonalities: z.array(z.string()).optional(),
      rrids: z.array(z.string()).optional(),
      status: z.array(z.string()).optional(),
    }),
    execute: async ({ labIds, ...filter }) => {
      const allowed = labIds?.length ? labIds.filter((id) => viewer.labIds.includes(id)) : viewer.labIds
      const items = await getInventoryForLabs(allowed, filter)
      return {
        count: items.length,
        items: items.map((item) => ({
          id: item.id,
          status: item.status,
          aliquotsRemaining: item.aliquotsRemaining,
          storageLocation: item.storageLocation,
          markerId: item.antibody.targetProtein?.id ?? null,
          marker: item.antibody.targetProtein?.geneSymbol ?? item.antibody.targetName ?? null,
          antibodyId: item.antibody.id,
          antibody: item.antibody.name,
          rrid: item.antibody.rrid,
          clonality: item.antibody.clonality,
          host: item.antibody.hostTaxon?.label ?? null,
          addedBy: item.addedBy?.name ?? null,
        })),
      }
    },
  })

  const getLabPanels = tool({
    description:
      "Panels you can see, with their markers and fluorophores. Use for co-occurrence, reuse frequency, gap analysis, and panel review.",
    inputSchema: z.object({
      scope: z.enum(["mine", "labs"]).default("mine"),
      labIds: z.array(z.string()).optional(),
      panelId: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(50),
    }),
    execute: async ({ scope, labIds, panelId, limit }) => {
      if (panelId) {
        const panel = await getVisiblePanelById(panelId, viewer)
        return panel ? { panels: [mapPanel(panel)] } : { error: "Panel not found or not visible to you" }
      }
      const v = scopedViewer(viewer, scope, labIds) ?? viewer
      const panels = await getVisiblePanels(v, { limit })
      return { panels: panels.map(mapPanel) }
    },
  })

  const analyzePanel = tool({
    description:
      "Validate a panel for fluorophore spectral overlap and host cross-reactivity conflicts. Use after proposing or to review a layout.",
    inputSchema: z.object({ panelId: z.string() }),
    execute: async ({ panelId }) => {
      const panel = await getVisiblePanelById(panelId, viewer)
      if (!panel) return { error: "Panel not found or not visible to you" }
      return validatePanel(panel)
    },
  })

  const getPanelLayoutSignals = tool({
    description:
      "For a set of markers, gather the signals needed to lay out cycles + fluorophores: a labile/phospho hint, host species seen, and the fluorophores that gave the strongest empirical contrast for each marker. Combine these with panel-design best practices (labile/phospho early, robust strong-signal markers later, one host species per cycle, weak targets on cleaner channels) to propose a layout, then call analyzePanel.",
    inputSchema: z.object({ markerIds: z.array(z.string()).min(1), scope: scopeSchema }),
    execute: async ({ markerIds, scope }) => {
      const v = scopedViewer(viewer, scope)
      const signals = await Promise.all(
        markerIds.map(async (markerId) => {
          const [protein, byFluorophore, reports] = await Promise.all([
            getProteinById(markerId),
            aggregateReports(v, { markerIds: [markerId] }, "fluorophore", 200),
            findReports(v, { markerIds: [markerId] }, 50),
          ])
          const label = protein?.geneSymbol ?? protein?.label ?? markerId
          const hosts = [...new Set(reports.map((r) => r.antibody?.hostSpecies).filter(Boolean))]
          const worked = reports.filter((r) => r.works === true).length
          return {
            markerId,
            marker: label,
            likelyLabileOrPhospho: LABILE_PATTERN.test(label),
            hostSpeciesSeen: hosts,
            workedReportCount: worked,
            totalReportCount: reports.length,
            bestFluorophores: byFluorophore
              .slice(0, 4)
              .map((g) => ({ fluorophore: g.label, worksRate: g.worksRate, strongSignalCount: g.strongSignalCount })),
          }
        }),
      )
      return { signals }
    },
  })

  const recommendForPanel = tool({
    description:
      "Render your shortlist as ready-to-use 'Add to panel' cards. Call this to recommend the best 1-5 markers or antibodies AFTER you have found them with the other tools. The app renders each item as a card with a WORKING 'Add to panel' button automatically. Because of that: do NOT also repeat the same items as a bulleted list in your written answer, and NEVER write fake buttons like '[Add X to panel]' in text - the cards already provide the buttons. In your text reply, give only a brief overall rationale. Pass each item by its real id from a previous tool result: for kind 'antibody' use the exact RRID string (e.g. 'RRID:AB_443427', exactly as returned by resolveAntibodies / getLabInventory / findReports); for kind 'marker' use the marker id (cuid) from resolveMarkers. If an id does not resolve it is silently dropped, so use ids you actually retrieved, not guesses.",
    inputSchema: z.object({
      summary: z.string().describe("One short sentence introducing the recommendation. Shown above the cards."),
      items: z
        .array(
          z.object({
            kind: z.enum(["marker", "antibody"]),
            id: z
              .string()
              .describe(
                "kind='antibody' -> the RRID exactly as returned by a prior tool (e.g. 'RRID:AB_443427'); kind='marker' -> the marker id (cuid) from resolveMarkers.",
              ),
            reason: z
              .string()
              .describe("Short, specific reason this is a good choice (e.g. 'highest works-rate in human kidney IF')."),
          }),
        )
        .min(1)
        .max(5),
    }),
    execute: async ({ summary, items }) => {
      const recommendations = await Promise.all(
        items.map(async (item) => {
          if (item.kind === "marker") {
            const protein = (await getProteinById(item.id)) ?? (await searchProteins(item.id))[0]
            if (!protein) return null
            return {
              kind: "marker" as const,
              reason: item.reason,
              markerId: protein.id,
              label: protein.geneSymbol ?? protein.label,
              sublabel: protein.geneSymbol ? protein.label : null,
            }
          }
          const antibody = await resolveAntibodyFlexible(item.id)
          if (!antibody) return null
          return {
            kind: "antibody" as const,
            reason: item.reason,
            antibodyId: antibody.id,
            rrid: antibody.rrid,
            label: antibody.name,
            sublabel:
              [antibody.targetName, antibody.clonality, antibody.hostTaxon?.label].filter(Boolean).join(" · ") || null,
          }
        }),
      )
      return { summary, recommendations: recommendations.filter(Boolean) }
    },
  })

  // --- Panel editing ---------------------------------------------------------
  // Every mutation tool runs through this choke point: load the panel and confirm the viewer may
  // edit it (owner or lab ADMIN, enforced exactly like the REST routes). Errors are returned as
  // data, never thrown, so the model can relay them.
  async function loadEditablePanel(panelId: string): Promise<{ panel: PanelRow } | { error: string }> {
    const panel = await getPanelById(panelId)
    if (!panel) return { error: `Panel ${panelId} not found` }
    if (!canEditPanel(viewer, panel)) return { error: "You do not have permission to edit this panel" }
    return { panel }
  }

  // Re-fetch the panel after a write so the model always sees fresh cycle/marker ids.
  async function panelResult(panelId: string, message: string) {
    const refreshed = await getPanelById(panelId)
    return { message, panel: refreshed ? mapPanelForEditing(refreshed) : null }
  }

  const resolveFluorophores = tool({
    description:
      "Resolve a fluorophore/conjugate name (e.g. 'Alexa Fluor 647', 'AF488', 'DAPI') to ids used when adding markers to a panel.",
    inputSchema: z.object({ query: z.string() }),
    execute: async ({ query }) => ({
      fluorophores: (await searchFluorophores(query)).map((f) => ({ id: f.id, name: f.name })),
    }),
  })

  const listMyPanels = tool({
    description:
      "List the panels you can edit (your own panels and panels your lab-admin role covers), or, given a panelId, return that panel's full editable structure. Use this to obtain the panelId / cycleId / markerId values the other panel-editing tools require. Without panelId you get lightweight summaries; with panelId you get every cycle and marker with their ids.",
    inputSchema: z.object({ panelId: z.string().optional() }),
    execute: async ({ panelId }) => {
      if (panelId) {
        const loaded = await loadEditablePanel(panelId)
        if ("error" in loaded) return loaded
        return { panel: mapPanelForEditing(loaded.panel) }
      }
      const panels = await getPanelsForUser(viewer.userId)
      return {
        panels: panels
          .filter((p) => canEditPanel(viewer, p))
          .map((p) => ({
            id: p.id,
            name: p.name,
            visibility: p.visibility,
            species: p.species?.label ?? null,
            cycleCount: p.cycles.length,
            markerCount: p.cycles.reduce((sum, c) => sum + c.markers.length, 0),
          })),
      }
    },
  })

  const createPanelTool = tool({
    description:
      "Create a NEW, empty panel owned by you. It starts PRIVATE with an initial 'Cycle 1'. Only call this when the user clearly asks to create a panel. Returns the new panel with its cycle ids so you can immediately add markers.",
    inputSchema: z.object({
      name: z.string().min(1).max(255),
      description: z.string().max(2000).optional(),
      speciesId: z.string().optional().describe("Taxon id from resolveSpecies, if known"),
      speciesLabel: z.string().optional().describe("Species display name, e.g. 'Homo sapiens'"),
      fixation: z.nativeEnum(Fixation).optional(),
      conditionId: z.string().optional(),
      conditionLabel: z.string().optional(),
    }),
    execute: async (input) => {
      const limit = await checkUserRateLimit(viewer.userId, RATE_LIMITS.PANELS_CREATE)
      if (!limit.allowed) {
        return { error: `Panel creation limit reached. Try again after ${limit.resetTime.toLocaleString()}.` }
      }
      const panel = await createPanel(input, viewer.userId)
      return { message: `Created panel "${panel.name}".`, panel: mapPanelForEditing(panel) }
    },
  })

  const addCycleTool = tool({
    description: "Add a new cycle to a panel. Only call when the user clearly asks to add a cycle.",
    inputSchema: z.object({
      panelId: z.string(),
      name: z.string().min(1).max(255),
      notes: z.string().max(500).optional(),
    }),
    execute: async ({ panelId, name, notes }) => {
      const loaded = await loadEditablePanel(panelId)
      if ("error" in loaded) return loaded
      const nextOrder = loaded.panel.cycles.reduce((max, c) => Math.max(max, c.sortOrder), -1) + 1
      await addCycle(panelId, { name, notes, sortOrder: nextOrder })
      return panelResult(panelId, `Added cycle "${name}".`)
    },
  })

  const deleteCycleTool = tool({
    description:
      "Delete a cycle and every marker inside it. Only call when the user EXPLICITLY asks to delete the cycle. This cannot be undone.",
    inputSchema: z.object({ panelId: z.string(), cycleId: z.string() }),
    execute: async ({ panelId, cycleId }) => {
      const loaded = await loadEditablePanel(panelId)
      if ("error" in loaded) return loaded
      const cycle = loaded.panel.cycles.find((c) => c.id === cycleId)
      if (!cycle) return { error: "Cycle not found in this panel" }
      await removeCycle(cycleId)
      return panelResult(panelId, `Deleted cycle "${cycle.name}".`)
    },
  })

  const addAntibodyToCycleTool = tool({
    description:
      "Add a marker/antibody to a cycle. Resolve names to ids first: marker via resolveMarkers (proteinId), antibody via resolveAntibodies or getLabInventory (antibodyId, or its RRID), fluorophore via resolveFluorophores (fluorophoreId). Get the panelId and cycleId from listMyPanels. proteinId and antibodyId can be provided together (a panel marker is a target protein stained by a specific antibody). For a recognizable label, include proteinId whenever you know the target; from getLabInventory pass its markerId as proteinId and its antibodyId. Only call when the user clearly asks to add it.",
    inputSchema: z.object({
      panelId: z.string(),
      cycleId: z.string(),
      proteinId: z.string().optional(),
      proteinLabel: z.string().optional(),
      geneSymbol: z.string().optional(),
      ensemblGeneId: z.string().optional(),
      antibodyId: z.string().optional().describe("Antibody id or RRID from resolveAntibodies / getLabInventory"),
      fluorophoreId: z.string().optional(),
      metalTag: z.string().optional(),
    }),
    execute: async ({ panelId, cycleId, antibodyId, ...marker }) => {
      const loaded = await loadEditablePanel(panelId)
      if ("error" in loaded) return loaded
      const cycle = loaded.panel.cycles.find((c) => c.id === cycleId)
      if (!cycle) return { error: "Cycle not found in this panel" }
      if (marker.fluorophoreId && !(await fluorophoreExists(marker.fluorophoreId))) {
        return { error: "Unknown fluorophore id; resolve it with resolveFluorophores first" }
      }
      // The model may pass a real antibody id, an RRID, or (mistakenly) an inventory id; resolve it
      // to a real Antibody record so we never trip the FK constraint.
      let resolvedAntibodyId: string | undefined
      if (antibodyId) {
        const antibody = await resolveAntibodyFlexible(antibodyId)
        if (!antibody) {
          return { error: `Antibody ${antibodyId} not found; resolve it with resolveAntibodies first` }
        }
        resolvedAntibodyId = antibody.id
      }
      if (marker.proteinId) {
        await prisma.protein.upsert({
          where: { id: marker.proteinId },
          update: { ...(marker.ensemblGeneId ? { ensemblGeneId: marker.ensemblGeneId } : {}) },
          create: {
            id: marker.proteinId,
            label: marker.proteinLabel ?? marker.proteinId,
            geneSymbol: marker.geneSymbol ?? null,
            ensemblGeneId: marker.ensemblGeneId ?? null,
          },
        })
      }
      const nextOrder = cycle.markers.reduce((max, m) => Math.max(max, m.sortOrder), -1) + 1
      await addMarker(cycleId, { ...marker, antibodyId: resolvedAntibodyId, sortOrder: nextOrder })
      return panelResult(panelId, `Added marker to "${cycle.name}".`)
    },
  })

  const moveMarkerTool = tool({
    description:
      "Move a marker to another cycle (and/or reposition it). Call listMyPanels with the panelId first to get the ids. markerId is the marker's OWN id (the `markerId` field on a marker in listMyPanels) - NOT the antibody id, RRID, or protein id. toCycleId is the DESTINATION cycle's `cycleId` from the same panel in listMyPanels. sortOrder sets the position within the destination cycle; omit it to append to the end. Only call when the user clearly asks to move or reorder a marker.",
    inputSchema: z.object({
      panelId: z.string(),
      markerId: z
        .string()
        .describe("The marker's own id (markerId field from listMyPanels), not the antibody/protein id"),
      toCycleId: z.string().describe("Destination cycle's cycleId from listMyPanels (must be in the same panel)"),
      sortOrder: z.number().int().min(0).optional(),
    }),
    execute: async ({ panelId, markerId, toCycleId, sortOrder }) => {
      const loaded = await loadEditablePanel(panelId)
      if ("error" in loaded) return loaded
      const targetCycle = loaded.panel.cycles.find((c) => c.id === toCycleId)
      if (!targetCycle) return { error: "Target cycle not found in this panel" }
      if (!loaded.panel.cycles.some((c) => c.markers.some((m) => m.id === markerId))) {
        return { error: "Marker not found in this panel" }
      }
      const order = sortOrder ?? targetCycle.markers.reduce((max, m) => Math.max(max, m.sortOrder), -1) + 1
      await reorderMarkers([{ markerId, cycleId: toCycleId, sortOrder: order }])
      return panelResult(panelId, `Moved marker to "${targetCycle.name}".`)
    },
  })

  const removeMarkerTool = tool({
    description:
      "Remove a marker/antibody from a panel. markerId is the marker's OWN id (the `markerId` field from listMyPanels), not the antibody/protein id. Only call when the user EXPLICITLY asks to delete it. This cannot be undone.",
    inputSchema: z.object({
      panelId: z.string(),
      markerId: z
        .string()
        .describe("The marker's own id (markerId field from listMyPanels), not the antibody/protein id"),
    }),
    execute: async ({ panelId, markerId }) => {
      const loaded = await loadEditablePanel(panelId)
      if ("error" in loaded) return loaded
      if (!loaded.panel.cycles.some((c) => c.markers.some((m) => m.id === markerId))) {
        return { error: "Marker not found in this panel" }
      }
      await removeMarker(markerId)
      return panelResult(panelId, "Removed marker.")
    },
  })

  return {
    resolveMarkers,
    resolveCellTypes,
    resolveSpecies,
    resolveTissues,
    resolveAntibodies,
    resolveFluorophores,
    getMarkerDetails,
    getAntibodyDetails,
    findReports: findReportsTool,
    aggregateReports: aggregateReportsTool,
    listMyLabs,
    getLabInventory,
    getLabPanels,
    analyzePanel,
    getPanelLayoutSignals,
    recommendForPanel,
    listMyPanels,
    createPanel: createPanelTool,
    addCycle: addCycleTool,
    deleteCycle: deleteCycleTool,
    addAntibodyToCycle: addAntibodyToCycleTool,
    moveMarker: moveMarkerTool,
    removeMarker: removeMarkerTool,
  }
}
