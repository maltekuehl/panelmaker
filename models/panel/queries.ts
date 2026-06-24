import "server-only"

import type { Prisma } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import type { AddCycleData, AddMarkerData, CreatePanelData, UpdatePanelData } from "./schema"

export type PanelQueryParams = {
  limit?: number
  cursor?: string
}

const panelMarkerSelect = {
  id: true,
  cycleId: true,
  proteinId: true,
  antibodyId: true,
  fluorophore: true,
  metalTag: true,
  sortOrder: true,
  protein: {
    select: {
      id: true,
      label: true,
      geneSymbol: true,
    },
  },
  antibody: {
    select: {
      id: true,
      rrid: true,
      name: true,
      conjugate: true,
      sourceOrganism: true,
      vendorName: true,
      catalogNumber: true,
      cloneId: true,
    },
  },
} satisfies Prisma.PanelMarkerSelect

const panelCycleSelect = {
  id: true,
  panelId: true,
  name: true,
  notes: true,
  sortOrder: true,
  markers: {
    select: panelMarkerSelect,
    orderBy: { sortOrder: "asc" },
  },
} satisfies Prisma.PanelCycleSelect

const panelSelect = {
  id: true,
  name: true,
  description: true,
  species: true,
  fixation: true,
  ownerId: true,
  isPublic: true,
  createdAt: true,
  updatedAt: true,
  condition: {
    select: {
      id: true,
      label: true,
    },
  },
  owner: {
    select: {
      id: true,
      name: true,
    },
  },
  cycles: {
    select: panelCycleSelect,
    orderBy: { sortOrder: "asc" },
  },
} satisfies Prisma.PanelSelect

export type PanelRow = Prisma.PanelGetPayload<{ select: typeof panelSelect }>
export type PanelCycleRow = Prisma.PanelCycleGetPayload<{ select: typeof panelCycleSelect }>
export type PanelMarkerRow = Prisma.PanelMarkerGetPayload<{ select: typeof panelMarkerSelect }>

export async function getPanelsForUser(userId: string): Promise<PanelRow[]> {
  return prisma.panel.findMany({
    select: panelSelect,
    where: { ownerId: userId },
    orderBy: { updatedAt: "desc" },
  })
}

export async function getPublicPanels(params: PanelQueryParams): Promise<PanelRow[]> {
  const { limit = 20, cursor } = params

  return prisma.panel.findMany({
    select: panelSelect,
    where: { isPublic: true },
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
  })
}

export async function getPanelById(id: string): Promise<PanelRow | null> {
  return prisma.panel.findUnique({
    where: { id },
    select: panelSelect,
  })
}

async function resolveCondition(conditionId?: string, conditionLabel?: string): Promise<string | undefined> {
  if (!conditionId) return undefined

  const existing = await prisma.diseaseCondition.findUnique({ where: { id: conditionId } })
  if (existing) return existing.id

  await prisma.diseaseCondition.create({ data: { id: conditionId, label: conditionLabel || conditionId } })
  return conditionId
}

export async function createPanel(data: CreatePanelData, ownerId: string): Promise<PanelRow> {
  const resolvedConditionId = await resolveCondition(data.conditionId, data.conditionLabel)

  return prisma.panel.create({
    data: {
      name: data.name,
      description: data.description,
      species: data.species,
      fixation: data.fixation,
      conditionId: resolvedConditionId,
      isPublic: data.isPublic,
      ownerId,
      cycles: {
        create: {
          name: "Cycle 1",
          sortOrder: 0,
        },
      },
    },
    select: panelSelect,
  })
}

export async function updatePanel(id: string, data: UpdatePanelData): Promise<PanelRow> {
  const resolvedConditionId =
    data.conditionId !== undefined ? await resolveCondition(data.conditionId, data.conditionLabel) : undefined

  return prisma.panel.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.species !== undefined && { species: data.species }),
      ...(data.fixation !== undefined && { fixation: data.fixation }),
      ...(resolvedConditionId !== undefined && { conditionId: resolvedConditionId }),
      ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
    },
    select: panelSelect,
  })
}

export async function deletePanel(id: string): Promise<void> {
  await prisma.panel.delete({ where: { id } })
}

export async function addCycle(panelId: string, data: AddCycleData): Promise<PanelCycleRow> {
  return prisma.panelCycle.create({
    data: {
      panelId,
      name: data.name,
      notes: data.notes,
      sortOrder: data.sortOrder ?? 0,
    },
    select: panelCycleSelect,
  })
}

export async function updateCycle(cycleId: string, data: { notes?: string | null }): Promise<PanelCycleRow> {
  return prisma.panelCycle.update({
    where: { id: cycleId },
    data: {
      ...(data.notes !== undefined && { notes: data.notes }),
    },
    select: panelCycleSelect,
  })
}

export async function addMarker(cycleId: string, data: AddMarkerData): Promise<PanelMarkerRow> {
  return prisma.panelMarker.create({
    data: {
      cycleId,
      proteinId: data.proteinId,
      antibodyId: data.antibodyId,
      fluorophore: data.fluorophore,
      metalTag: data.metalTag,
      sortOrder: data.sortOrder ?? 0,
    },
    select: panelMarkerSelect,
  })
}

export async function updateMarker(
  markerId: string,
  data: { antibodyId?: string | null; fluorophore?: string | null; metalTag?: string | null },
): Promise<PanelMarkerRow> {
  return prisma.panelMarker.update({
    where: { id: markerId },
    data,
    select: panelMarkerSelect,
  })
}

export async function removeCycle(cycleId: string): Promise<void> {
  await prisma.panelCycle.delete({ where: { id: cycleId } })
}

export async function removeMarker(markerId: string): Promise<void> {
  await prisma.panelMarker.delete({ where: { id: markerId } })
}

export async function reorderMarkers(items: { markerId: string; cycleId: string; sortOrder: number }[]): Promise<void> {
  await prisma.$transaction(
    items.map((item) =>
      prisma.panelMarker.update({
        where: { id: item.markerId },
        data: { cycleId: item.cycleId, sortOrder: item.sortOrder },
      }),
    ),
  )
}
