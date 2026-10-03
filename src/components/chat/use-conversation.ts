"use client"

import type { ReasoningEffort } from "@/models/chat/schema"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import { useState } from "react"

export interface SendOptions {
  model?: string
  labId?: string | null
  reasoning?: ReasoningEffort
}

interface UseConversationOptions {
  conversationId: string
  initialMessages: UIMessage[]
  onFinish?: () => void
}

// The single place both chat surfaces wire up useChat, so transport options, the streaming flag and
// submit handling cannot drift between the full page and the floating widget.
export function useConversation({ conversationId, initialMessages, onFinish }: UseConversationOptions) {
  const [input, setInput] = useState("")

  const { messages, sendMessage, setMessages, error, clearError, status, stop } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: "/api/chat", body: { conversationId } }),
    experimental_throttle: 50,
    onFinish,
  })

  const isStreaming = status === "submitted" || status === "streaming"

  const send = (text: string, options: SendOptions = {}) => {
    const trimmed = text.trim()
    if (!trimmed) return
    clearError()
    const body: Record<string, string> = { conversationId }
    if (options.model) body.model = options.model
    if (options.labId) body.labId = options.labId
    if (options.reasoning) body.reasoning = options.reasoning
    sendMessage({ text: trimmed }, { body })
  }

  const submit = (options: SendOptions = {}) => {
    if (isStreaming || !input.trim()) return
    send(input, options)
    setInput("")
  }

  return { messages, setMessages, error, status, isStreaming, stop, input, setInput, send, submit }
}
