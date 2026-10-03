import { z } from "zod"

export const imagingMethodQuerySchema = z
  .object({
    q: z.string().trim().max(255).optional(),
  })
  .strict()

export type ImagingMethodQuery = z.infer<typeof imagingMethodQuerySchema>
