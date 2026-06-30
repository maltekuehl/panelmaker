import { z } from "zod"

export const experimentNameSchema = z.string().trim().min(1, "Experiment name is required").max(255)

const emptyToUndefined = (value: unknown) => (typeof value === "string" && value.trim() === "" ? undefined : value)

export const citationFields = {
  citation: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
  pmid: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .transform((value) => value.replace(/^PMID:\s*/i, ""))
      .pipe(z.string().regex(/^\d+$/, "PMID must be digits only").max(20))
      .optional(),
  ),
  doi: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .transform((value) => value.replace(/^(https?:\/\/(dx\.)?doi\.org\/|doi:\s*)/i, ""))
      .pipe(z.string().max(255))
      .optional(),
  ),
}

export const updateExperimentSchema = z
  .object({
    name: experimentNameSchema,
    description: z.preprocess(emptyToUndefined, z.string().trim().max(5000).nullable().optional()),
    ...citationFields,
  })
  .strict()

export type UpdateExperimentData = z.infer<typeof updateExperimentSchema>
