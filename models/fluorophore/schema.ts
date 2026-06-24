import { z } from "zod"

export const fluorophoreSearchSchema = z
  .object({
    q: z.string().optional(),
    limit: z.coerce.number().min(1).max(200).default(200),
  })
  .strict()

export type FluorophoreSearchParams = z.infer<typeof fluorophoreSearchSchema>
