import { z } from "zod"

export const searchParamsSchema = z
  .object({
    q: z.string().optional(),
    limit: z.coerce.number().min(1).max(100).default(20),
    cursor: z.string().optional(),
  })
  .strict()

export type SearchParams = z.infer<typeof searchParamsSchema>
