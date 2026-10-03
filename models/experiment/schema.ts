import { DonorSex, Preservation, SampleType } from "@/lib/generated/prisma/enums"
import { z } from "zod"

export const experimentNameSchema = z.string().trim().min(1, "Experiment name is required").max(255)

export const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value

export const ontologyValueSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
})

const doiValueSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/^(https?:\/\/(dx\.)?doi\.org\/|doi:\s*)/i, ""))
  .pipe(z.string().max(255))

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
  doi: z.preprocess(emptyToUndefined, doiValueSchema.optional()),
}

// SDRF-Proteomics `characteristics[age]`: a years/months/days run (45Y, 6M, 30Y6M), optionally a
// range (40Y-50Y) or an open bound (>18Y).
const AGE_RUN = String.raw`\d{1,3}Y(\d{1,2}M)?(\d{1,2}D)?|\d{1,3}M(\d{1,2}D)?|\d{1,4}D`
const DONOR_AGE_PATTERN = new RegExp(`^([<>]=?)?(${AGE_RUN})(-(${AGE_RUN}))?$`)

export const donorAgeSchema = z
  .string()
  .trim()
  .max(40)
  .regex(DONOR_AGE_PATTERN, "Use the SDRF form, for example 45Y, 30Y6M or 40Y-50Y")

export function isValidDonorAge(value: string): boolean {
  return DONOR_AGE_PATTERN.test(value.trim())
}

// Every specimen and donor field is optional. They are additive: an experiment submitted before
// these existed stays valid, and the submit form keeps them behind one collapsed section.
export const specimenFields = {
  preservation: z.nativeEnum(Preservation).optional(),
  preservationText: z.preprocess(emptyToUndefined, z.string().trim().max(255).optional()),
  fixative: ontologyValueSchema.nullable().optional(),
  fixativeConcentration: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
  antigenRetrievalText: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
  sampleType: z.nativeEnum(SampleType).optional(),
  sectionThicknessUm: z.preprocess(emptyToUndefined, z.coerce.number().positive().max(10000).optional()),
  donorSex: z.nativeEnum(DonorSex).optional(),
  donorAge: z.preprocess(emptyToUndefined, donorAgeSchema.optional()),
  developmentalStage: ontologyValueSchema.nullable().optional(),
  protocolDoi: z.preprocess(emptyToUndefined, doiValueSchema.optional()),
}

export const updateExperimentSchema = z
  .object({
    name: experimentNameSchema,
    description: z.preprocess(emptyToUndefined, z.string().trim().max(5000).nullable().optional()),
    ...citationFields,
    ...specimenFields,
  })
  .strict()

export type UpdateExperimentData = z.infer<typeof updateExperimentSchema>

export const specimenSchema = z.object(specimenFields)

export type SpecimenInput = z.infer<typeof specimenSchema>
