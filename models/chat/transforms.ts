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

export function deriveRole(message: UIMessage): ChatMessageRole {
  if (message.role === "assistant") return "ASSISTANT"
  if (message.role === "system") return "SYSTEM"
  return "USER"
}

// Pull the UIMessage id out of a stored content row without trusting it to parse.
export function storedMessageId(content: string): string | null {
  try {
    const parsed = JSON.parse(content) as { id?: string }
    return parsed.id ?? null
  } catch {
    return null
  }
}
