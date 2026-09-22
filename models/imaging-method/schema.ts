import { DetectionModality } from "@/lib/generated/prisma/enums"
import { z } from "zod"

export const imagingMethodQuerySchema = z
  .object({
    q: z.string().trim().max(255).optional(),
    detection: z.nativeEnum(DetectionModality).optional(),
  })
  .strict()

export type ImagingMethodQuery = z.infer<typeof imagingMethodQuerySchema>

export const imagingMethodIdSchema = z.string().trim().min(1).max(100)
