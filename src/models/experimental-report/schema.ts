import { AntigenRetrieval, Preservation, Recommendation, ValidationResult } from "@/lib/generated/prisma/enums"
import { normalizeRrid } from "@/lib/utils"
import {
  citationFields,
  emptyToUndefined,
  experimentNameSchema,
  ontologyValueSchema,
  specimenFields,
} from "@/models/experiment/schema"
import { resourceVisibilityFields } from "@/models/lab/schema"
import { z } from "zod"

const rridSchema = z.string().max(100).transform(normalizeRrid)

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
  isotype: z.string().optional(),
  targetSpecies: z.array(z.string()),
  applications: z.array(z.string()),
  url: z.string(),
})

const proteinSubmissionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  geneSymbol: z.string().nullable().optional(),
})

const imageUrlSchema = z
  .string()
  .max(512)
  .refine((s) => s.startsWith("/uploads/") || /^https?:\/\//.test(s), "Invalid image URL")

export const IMAGE_CAPTION_MAX_LENGTH = 1000

export const MAX_FOVS_PER_REPORT = 5

export const MAX_REFERENCES_PER_FOV = 4

export const REFERENCE_LABEL_MAX_LENGTH = 100

const hexColorSchema = z.string().regex(/^#[0-9a-f]{6}$/i, "Use a hex colour such as #ff00ff")

// A nuclear or structural counterstain visible in the same field of view, usually a dye with no report.
const referenceChannelSchema = z.object({
  role: z.enum(["NUCLEAR", "STRUCTURAL"]),
  label: z.string().trim().min(1).max(REFERENCE_LABEL_MAX_LENGTH),
  fluorophoreId: z.string().min(1).optional(),
  displayColor: hexColorSchema.optional(),
})

// One field of view. The same url sent for several antibodies of one experiment becomes one image with a
// channel per antibody. `displayColor` is the pseudo-colour this antibody has in the picture.
const reportImageSchema = z.object({
  url: imageUrlSchema,
  caption: z.string().max(IMAGE_CAPTION_MAX_LENGTH).optional(),
  cellTypeIds: z.array(z.string().min(1)).max(50).optional(),
  displayColor: hexColorSchema.optional(),
  references: z.array(referenceChannelSchema).max(MAX_REFERENCES_PER_FOV).optional(),
})

const reportImagesSchema = z.array(reportImageSchema).max(MAX_FOVS_PER_REPORT)

const validationEntrySchema = z.object({
  methodId: z.string().min(1).max(100),
  result: z.nativeEnum(ValidationResult),
})

// What the submitter concluded about the stain, the problems they saw and the specificity controls they ran.
const assessmentFields = {
  recommendation: z.nativeEnum(Recommendation).optional(),
  concentrationUgPerMl: z.preprocess(emptyToUndefined, z.coerce.number().positive().max(100000).optional()),
  issueIds: z
    .array(z.string().min(1).max(100))
    .max(20)
    .refine((ids) => new Set(ids).size === ids.length, "Each issue can only be listed once")
    .optional(),
  validations: z
    .array(validationEntrySchema)
    .max(20)
    .refine(
      (entries) => new Set(entries.map((entry) => entry.methodId)).size === entries.length,
      "Each validation method can only be listed once",
    )
    .optional(),
}

// A report without any antibody identity is unusable: it renders as "Report #<id>" and drops out of
// every antibody-based aggregation. Accept a picked antibody, a typed RRID, or a registry citation.
function requireAntibodyIdentity(
  data: { antibodyId?: string; rrid?: string; antibodyData?: { citation?: string } | null },
  ctx: z.RefinementCtx,
) {
  if (data.antibodyId?.trim() || data.rrid?.trim() || data.antibodyData?.citation?.trim()) return
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: "Select an antibody or enter its RRID",
    path: ["rrid"],
  })
}

const createReportFieldsSchema = z.object({
  antibodyId: z.string().optional(),
  species: ontologyValueSchema.nullable().optional(),
  tissue: ontologyValueSchema.nullable().optional(),
  ...specimenFields,
  imagingMethod: ontologyValueSchema.nullable().optional(),
  fluorophoreId: z.string().optional(),
  metalTag: z.string().max(100).optional(),
  cycleNumber: z.number().int().positive().optional(),
  dilution: z.string().max(50).optional(),
  incubation: z.string().max(255).optional(),
  antigenRetrieval: z.nativeEnum(AntigenRetrieval).optional(),
  ...assessmentFields,
  notes: z.string().max(5000).optional(),
  images: reportImagesSchema.optional(),
  ...resourceVisibilityFields,
  ...citationFields,
  antibodyData: antibodySubmissionSchema.nullable().optional(),
  proteinData: proteinSubmissionSchema.nullable().optional(),
  cellTypes: z.array(ontologyValueSchema).optional(),
  subcellularLocation: ontologyValueSchema.nullable().optional(),
  condition: ontologyValueSchema.nullable().optional(),
  markerName: z.string().max(255).optional(),
  rrid: rridSchema.optional(),
  hostSpecies: ontologyValueSchema.nullable().optional(),
  antibodyVendor: z.string().max(255).optional(),
  catalogNumber: z.string().max(100).optional(),
  cloneId: z.string().max(100).optional(),
})

export const createReportSchema = createReportFieldsSchema.superRefine(requireAntibodyIdentity)

export type CreateReportData = z.infer<typeof createReportSchema>

const batchContextSchema = z.object({
  name: experimentNameSchema,
  description: z.string().max(5000).optional(),
  ...citationFields,
  species: ontologyValueSchema.nullable().optional(),
  tissue: ontologyValueSchema.nullable().optional(),
  ...specimenFields,
  imagingMethod: ontologyValueSchema.nullable().optional(),
  antigenRetrieval: z.nativeEnum(AntigenRetrieval).optional(),
  condition: ontologyValueSchema.nullable().optional(),
  ...resourceVisibilityFields,
})

const batchAntibodySchema = z.object({
  antibodyData: antibodySubmissionSchema.nullable().optional(),
  proteinData: proteinSubmissionSchema.nullable().optional(),
  markerName: z.string().min(1).max(255),
  rrid: rridSchema.optional(),
  antibodyVendor: z.string().max(255).optional(),
  catalogNumber: z.string().max(100).optional(),
  cloneId: z.string().max(100).optional(),
  hostSpecies: ontologyValueSchema.nullable().optional(),
  cellTypes: z.array(ontologyValueSchema).optional(),
  dilution: z.string().max(50).optional(),
  incubation: z.string().max(255).optional(),
  fluorophoreId: z.string().optional(),
  metalTag: z.string().max(100).optional(),
  cycleNumber: z.number().int().positive().optional(),
  ...assessmentFields,
  subcellularLocation: ontologyValueSchema.nullable().optional(),
  notes: z.string().max(5000).optional(),
  images: reportImagesSchema.optional(),
})

const batchAntibodyEntrySchema = batchAntibodySchema.superRefine(requireAntibodyIdentity)

export const createReportBatchSchema = z.object({
  context: batchContextSchema,
  antibodies: z
    .array(batchAntibodyEntrySchema)
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

// `method` is an ImagingMethod id: an EFO CURIE, or the id of a local method filed under one.
export const searchParamsSchema = z
  .object({
    q: z.string().optional(),
    method: z.string().max(100).optional(),
    preservation: z.nativeEnum(Preservation).optional(),
    fixative: z.string().optional(),
    species: z.string().optional(),
    tissue: z.string().optional(),
    limit: z.coerce.number().min(1).max(100).default(20),
    cursor: z.string().optional(),
  })
  .strict()

export type SearchParams = z.infer<typeof searchParamsSchema>
