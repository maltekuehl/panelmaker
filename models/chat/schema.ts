import { z } from "zod"

// The providers the app can actually resolve a language model for. Kept here (a pure module) so the
// server model catalog and the credential API validate against the same list.
export const PROVIDER_IDS = ["google", "openai", "anthropic"] as const
export type ProviderId = (typeof PROVIDER_IDS)[number]

export const createConversationSchema = z
  .object({
    title: z.string().trim().max(200).optional(),
    model: z.string().trim().max(120).optional(),
  })
  .strict()

export const updateConversationSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    model: z.string().trim().max(120).optional(),
    pinned: z.boolean().optional(),
  })
  .strict()

// Client-supplied history. Roles are restricted to user/assistant so a caller cannot inject a system
// turn that overrides the server prompt, and user turns may only carry text so the community key
// cannot be used for image or file input.
const messagePartSchema = z.object({ type: z.string().min(1) }).passthrough()

const textPartSchema = z.object({ type: z.literal("text"), text: z.string().max(4096) }).passthrough()

const messageSchema = z.union([
  z
    .object({
      id: z.string().min(1).max(64),
      role: z.literal("user"),
      parts: z.array(textPartSchema).min(1).max(20),
    })
    .passthrough(),
  z
    .object({
      id: z.string().max(64),
      role: z.literal("assistant"),
      parts: z.array(messagePartSchema).max(200),
    })
    .passthrough(),
])

// The chat stream body. Not strict: the AI SDK transport also sends id/trigger/messageId fields.
export const chatRequestSchema = z.object({
  conversationId: z.string().trim().min(1).optional(),
  messages: z.array(messageSchema).min(1).max(200),
  model: z.string().trim().max(120).optional(),
})

export const upsertCredentialSchema = z
  .object({
    provider: z.enum(PROVIDER_IDS),
    apiKey: z.string().trim().min(8).max(400),
    label: z.string().trim().max(120).optional(),
  })
  .strict()
