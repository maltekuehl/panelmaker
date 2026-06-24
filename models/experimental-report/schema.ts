import { Fixation, MultiplexMethod, SignalQuality, Species, Specificity } from "@/lib/generated/prisma/enums"
import { z } from "zod"

const ontologyValueSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
})

const antibodySubmissionSchema = z.object({
  name: z.string(),
  citation: z.string(),
  vendor: z.string(),
  catalogNumber: z.string(),
  clonality: z.string(),
  cloneId: z.string(),
  target: z.string(),
  sourceOrganism: z.string(),
  conjugate: z.string(),
  isotype: z.string(),
  uniprotId: z.string(),
  targetSpecies: z.array(z.string()),
  applications: z.array(z.string()),
  url: z.string(),
})

const proteinSubmissionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  geneSymbol: z.string().nullable().optional(),
})

export const createReportSchema = z.object({
  antibodyId: z.string().optional(),
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
  antibodyData: antibodySubmissionSchema.nullable().optional(),
  proteinData: proteinSubmissionSchema.nullable().optional(),
  cellTypes: z.array(ontologyValueSchema).optional(),
  subcellularLocation: ontologyValueSchema.nullable().optional(),
  condition: ontologyValueSchema.nullable().optional(),
  markerName: z.string().max(255).optional(),
  rrid: z.string().max(100).optional(),
  hostSpecies: z.string().max(100).optional(),
  antibodyVendor: z.string().max(255).optional(),
  catalogNumber: z.string().max(100).optional(),
  cloneId: z.string().max(100).optional(),
})

export type CreateReportData = z.infer<typeof createReportSchema>

const batchContextSchema = z.object({
  species: z.nativeEnum(Species),
  tissueType: z.string().min(1).max(255),
  fixation: z.nativeEnum(Fixation),
  method: z.nativeEnum(MultiplexMethod),
  antigenRetrieval: z.string().min(1).max(255),
  condition: ontologyValueSchema.nullable().optional(),
})

const batchAntibodySchema = z.object({
  antibodyData: antibodySubmissionSchema.nullable().optional(),
  proteinData: proteinSubmissionSchema.nullable().optional(),
  markerName: z.string().min(1).max(255),
  rrid: z.string().max(100).optional(),
  antibodyVendor: z.string().max(255).optional(),
  catalogNumber: z.string().max(100).optional(),
  cloneId: z.string().max(100).optional(),
  hostSpecies: z.string().max(100).optional(),
  cellTypes: z.array(ontologyValueSchema).min(1, "At least one cell type is required"),
  dilution: z.string().min(1).max(50),
  fluorophore: z.string().max(100).optional(),
  metalTag: z.string().max(100).optional(),
  cycleNumber: z.number().int().positive().optional(),
  works: z.boolean().optional(),
  signalQuality: z.nativeEnum(SignalQuality).optional(),
  specificity: z.nativeEnum(Specificity).optional(),
  subcellularLocation: ontologyValueSchema.nullable().optional(),
  notes: z.string().max(5000).optional(),
  imageUrls: z.array(z.string().url()).optional(),
})

export const createReportBatchSchema = z.object({
  context: batchContextSchema,
  antibodies: z
    .array(batchAntibodySchema)
    .min(1, "Add at least one antibody")
    .max(100, "Too many antibodies in one batch"),
})

export type CreateReportBatchData = z.infer<typeof createReportBatchSchema>

export const updateReportStatusSchema = z
  .object({
    status: z.enum(["PENDING", "PUBLISHED", "REJECTED"]),
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
    cursor: z.string().optional(),
  })
  .strict()

export type SearchParams = z.infer<typeof searchParamsSchema>
