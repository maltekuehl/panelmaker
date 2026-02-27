import "server-only"

import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"
import type { AddCycleData, AddMarkerData, CreatePanelData, UpdatePanelData } from "./schema"

export type PanelQueryParams = {
  limit?: number
  cursor?: number
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
  condition: true,
  ownerId: true,
  isPublic: true,
  createdAt: true,
  updatedAt: true,
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

export async function getPanelById(id: number): Promise<PanelRow | null> {
  return prisma.panel.findUnique({
    where: { id },
    select: panelSelect,
  })
}

export async function createPanel(data: CreatePanelData, ownerId: string): Promise<PanelRow> {
  return prisma.panel.create({
    data: {
      name: data.name,
      description: data.description,
      species: data.species,
      fixation: data.fixation,
      condition: data.condition,
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

export async function updatePanel(id: number, data: UpdatePanelData): Promise<PanelRow> {
  return prisma.panel.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.species !== undefined && { species: data.species }),
      ...(data.fixation !== undefined && { fixation: data.fixation }),
      ...(data.condition !== undefined && { condition: data.condition }),
      ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
    },
    select: panelSelect,
  })
}

export async function deletePanel(id: number): Promise<void> {
  await prisma.panel.delete({ where: { id } })
}

export async function addCycle(panelId: number, data: AddCycleData): Promise<PanelCycleRow> {
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

export async function updateCycle(cycleId: number, data: { notes?: string | null }): Promise<PanelCycleRow> {
  return prisma.panelCycle.update({
    where: { id: cycleId },
    data: {
      ...(data.notes !== undefined && { notes: data.notes }),
    },
    select: panelCycleSelect,
  })
}

export async function addMarker(cycleId: number, data: AddMarkerData): Promise<PanelMarkerRow> {
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
  markerId: number,
  data: { antibodyId?: number | null; fluorophore?: string | null; metalTag?: string | null },
): Promise<PanelMarkerRow> {
  return prisma.panelMarker.update({
    where: { id: markerId },
    data,
    select: panelMarkerSelect,
  })
}

export async function removeCycle(cycleId: number): Promise<void> {
  await prisma.panelCycle.delete({ where: { id: cycleId } })
}

export async function removeMarker(markerId: number): Promise<void> {
  await prisma.panelMarker.delete({ where: { id: markerId } })
}
