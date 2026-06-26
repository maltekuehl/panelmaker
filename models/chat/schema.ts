import { z } from "zod"

export const createConversationSchema = z
  .object({
    title: z.string().trim().max(200).optional(),
    model: z.string().trim().max(120).optional(),
  })
  .strict()

export const renameConversationSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
  })
  .strict()

export const updateConversationSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    model: z.string().trim().max(120).optional(),
    pinned: z.boolean().optional(),
  })
  .strict()

// The chat stream body. Not strict: the AI SDK transport also sends id/trigger/messageId fields.
export const chatRequestSchema = z.object({
  conversationId: z.string().trim().min(1).optional(),
  messages: z.array(z.any()).min(1),
  model: z.string().trim().max(120).optional(),
})

export const upsertCredentialSchema = z
  .object({
    provider: z.string().trim().min(1).max(40),
    apiKey: z.string().trim().min(8).max(400),
    label: z.string().trim().max(120).optional(),
  })
  .strict()
