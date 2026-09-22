"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import { useState } from "react"

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

  const send = (text: string, model?: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    clearError()
    sendMessage({ text: trimmed }, { body: { conversationId, ...(model ? { model } : {}) } })
  }

  const submit = (model?: string) => {
    if (isStreaming || !input.trim()) return
    send(input, model)
    setInput("")
  }

  return { messages, setMessages, error, status, isStreaming, stop, input, setInput, send, submit }
}
