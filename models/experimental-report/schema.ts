import { Fixation, MultiplexMethod, SignalQuality, Species, Specificity } from "@prisma/client"
import { z } from "zod"

export const createReportSchema = z
  .object({
    antibodyId: z.number().int().positive().optional(),
    cellTypeId: z.string().optional(),
    structureId: z.string().optional(),
    species: z.nativeEnum(Species).optional(),
    tissueType: z.string().max(255).optional(),
    fixation: z.nativeEnum(Fixation).optional(),
    method: z.nativeEnum(MultiplexMethod).optional(),
    fluorophore: z.string().max(100).optional(),
    metalTag: z.string().max(100).optional(),
    cycleNumber: z.number().int().positive().optional(),
    dilution: z.string().max(50).optional(),
    antigenRetrieval: z.string().max(255).optional(),
    works: z.boolean().optional(),
    signalQuality: z.nativeEnum(SignalQuality).optional(),
    specificity: z.nativeEnum(Specificity).optional(),
    notes: z.string().max(5000).optional(),
    imageUrls: z.array(z.string().url()).optional(),
    isPublic: z.boolean().default(true),
  })
  .strict()

export type CreateReportData = z.infer<typeof createReportSchema>

export const updateReportStatusSchema = z
  .object({
    status: z.enum(["PENDING", "VALIDATED", "REJECTED"]),
  })
  .strict()

export type UpdateReportStatusData = z.infer<typeof updateReportStatusSchema>

export const searchParamsSchema = z
  .object({
    q: z.string().optional(),
    method: z.nativeEnum(MultiplexMethod).optional(),
    fixation: z.nativeEnum(Fixation).optional(),
    species: z.nativeEnum(Species).optional(),
    limit: z.coerce.number().min(1).max(100).default(20),
    cursor: z.coerce.number().optional(),
  })
  .strict()

export type SearchParams = z.infer<typeof searchParamsSchema>
