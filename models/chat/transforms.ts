import type { ChatMessageRole } from "@/lib/generated/prisma/enums"
import type { UIMessage } from "ai"

export interface ConversationSummary {
  id: string
  title: string | null
  model: string | null
  pinned: boolean
  messageCount: number
  createdAt: string
  updatedAt: string
}

export interface ConversationWithMessages {
  id: string
  title: string | null
  model: string | null
  pinned: boolean
  messages: UIMessage[]
}

export interface ConversationRow {
  id: string
  title: string | null
  model: string | null
  pinned: boolean
  createdAt: Date
  updatedAt: Date
}

export function toConversationSummary(row: ConversationRow, messageCount: number): ConversationSummary {
  return {
    id: row.id,
    title: row.title,
    model: row.model,
    pinned: row.pinned,
    messageCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export function deriveRole(message: UIMessage): ChatMessageRole {
  if (message.role === "assistant") return "ASSISTANT"
  if (message.role === "system") return "SYSTEM"
  return "USER"
}

// Stored message rows are always JSON.stringify(UIMessage), but a single unreadable row must not take
// the whole conversation down with it, so parsing never throws.
export function parseStoredMessage(content: string): UIMessage | null {
  try {
    const parsed = JSON.parse(content) as UIMessage | null
    if (!parsed || typeof parsed !== "object") return null
    return typeof parsed.id === "string" && typeof parsed.role === "string" ? parsed : null
  } catch {
    return null
  }
}

// Pull the UIMessage id out of a stored content row without trusting it to parse.
export function storedMessageId(content: string): string | null {
  return parseStoredMessage(content)?.id || null
}

// Flatten a UIMessage into plain text. Client-safe: used by both chat surfaces and the stream route.
export function extractMessageText(message: UIMessage, options: { includeReasoning?: boolean } = {}): string {
  const chunks: string[] = []
  for (const part of message.parts ?? []) {
    if (part.type === "text") chunks.push(part.text)
    else if (part.type === "reasoning" && options.includeReasoning) chunks.push(part.text)
  }
  return chunks.join("\n\n").trim()
}
