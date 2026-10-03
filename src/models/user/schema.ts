import { z } from "zod"

function normalizeOrcid(value: string): string {
  const stripped = value.replace(/^https?:\/\/orcid\.org\//, "")
  const digits = stripped.replace(/-/g, "")
  if (/^\d{15}[\dX]$/.test(digits)) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}-${digits.slice(12, 16)}`
  }
  return stripped
}

const orcidSchema = z
  .string()
  .transform(normalizeOrcid)
  .pipe(z.string().regex(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/, "Invalid ORCID format (e.g. 0000-0002-1825-0097)"))

export const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  orcid: orcidSchema.optional().or(z.literal("")),
  institution: z.string().max(200).optional().or(z.literal("")),
  institutionId: z.string().max(100).optional().or(z.literal("")),
})

export type RegisterData = z.infer<typeof registerSchema>

export const updateProfileSchema = z
  .object({
    name: z.string().max(100).nullable().optional(),
    orcid: orcidSchema.nullable().optional(),
    institution: z.string().max(255).nullable().optional(),
    institutionId: z.string().max(255).nullable().optional(),
  })
  .strict()

export type UpdateProfileData = z.infer<typeof updateProfileSchema>
