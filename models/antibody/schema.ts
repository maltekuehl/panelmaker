import { z } from "zod"

export const searchParamsSchema = z
  .object({
    q: z.string().optional(),
    species: z.string().optional(),
    proteinId: z.string().optional(),
    limit: z.coerce.number().min(1).max(100).default(20),
    cursor: z.coerce.number().optional(),
  })
  .strict()

export type SearchParams = z.infer<typeof searchParamsSchema>
