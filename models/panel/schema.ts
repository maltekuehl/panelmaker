import { Fixation, Visibility } from "@/lib/generated/prisma/enums"
import { z } from "zod"

const visibilityFields = {
  visibility: z.nativeEnum(Visibility).optional(),
  sharedLabIds: z.array(z.string().min(1)).max(50).optional(),
  owningLabId: z.string().min(1).nullable().optional(),
}

export const createPanelSchema = z
  .object({
    name: z.string().min(1).max(255),
    description: z.string().max(2000).optional(),
    speciesId: z.string().max(255).optional(),
    speciesLabel: z.string().max(255).optional(),
    fixation: z.nativeEnum(Fixation).optional(),
    conditionId: z.string().max(255).optional(),
    conditionLabel: z.string().max(255).optional(),
    ...visibilityFields,
  })
  .strict()

export type CreatePanelData = z.infer<typeof createPanelSchema>

export const updatePanelSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(2000).optional(),
    speciesId: z.string().max(255).optional(),
    speciesLabel: z.string().max(255).optional(),
    fixation: z.nativeEnum(Fixation).optional(),
    conditionId: z.string().max(255).optional(),
    conditionLabel: z.string().max(255).optional(),
    ...visibilityFields,
  })
  .strict()

export type UpdatePanelData = z.infer<typeof updatePanelSchema>

export const addCycleSchema = z
  .object({
    name: z.string().min(1).max(255),
    notes: z.string().max(500).optional(),
    sortOrder: z.number().int().min(0).optional(),
  })
  .strict()

export type AddCycleData = z.infer<typeof addCycleSchema>

export const updateCycleSchema = z
  .object({
    notes: z.string().max(500).nullable().optional(),
  })
  .strict()

export type UpdateCycleData = z.infer<typeof updateCycleSchema>

export const addMarkerSchema = z
  .object({
    proteinId: z.string().optional(),
    proteinLabel: z.string().max(255).optional(),
    geneSymbol: z.string().max(100).optional(),
    ensemblGeneId: z.string().max(100).optional(),
    antibodyId: z.string().optional(),
    fluorophoreId: z.string().optional(),
    metalTag: z.string().max(100).optional(),
    sortOrder: z.number().int().min(0).optional(),
  })
  .strict()

export type AddMarkerData = z.infer<typeof addMarkerSchema>

export const panelQueryParamsSchema = z
  .object({
    limit: z.coerce.number().min(1).max(100).default(20),
    cursor: z.string().optional(),
  })
  .strict()

export type PanelQueryParams = z.infer<typeof panelQueryParamsSchema>

export const reorderMarkersSchema = z
  .object({
    items: z
      .array(
        z.object({
          markerId: z.string(),
          cycleId: z.string(),
          sortOrder: z.number().int().min(0),
        }),
      )
      .min(1),
  })
  .strict()

export type ReorderMarkersData = z.infer<typeof reorderMarkersSchema>
