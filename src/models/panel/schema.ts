import { Preservation } from "@/lib/generated/prisma/enums"
import { resourceVisibilityFields } from "@/models/lab/schema"
import { z } from "zod"

export const createPanelSchema = z
  .object({
    name: z.string().min(1).max(255),
    description: z.string().max(2000).optional(),
    speciesId: z.string().max(255).optional(),
    speciesLabel: z.string().max(255).optional(),
    preservation: z.nativeEnum(Preservation).optional(),
    fixativeId: z.string().max(255).optional(),
    fixativeLabel: z.string().max(255).optional(),
    imagingMethodId: z.string().max(255).optional(),
    imagingMethodLabel: z.string().max(255).optional(),
    conditionId: z.string().max(255).optional(),
    conditionLabel: z.string().max(255).optional(),
    ...resourceVisibilityFields,
  })
  .strict()

export type CreatePanelData = z.infer<typeof createPanelSchema>

export const updatePanelSchema = createPanelSchema.partial().extend({
  preservation: z.nativeEnum(Preservation).nullable().optional(),
  fixativeId: z.string().max(255).nullable().optional(),
  imagingMethodId: z.string().max(255).nullable().optional(),
})

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
