"use client"

import { ChatMessage } from "@/components/chat/chat-message"
import { ChatErrorNotice, MissingKeyNotice } from "@/components/chat/key-notice"
import { hasVisibleParts, isAwaitingFirstContent, MessageParts } from "@/components/chat/message-parts"
import { useConversation } from "@/components/chat/use-conversation"
import { useReasoningEffort } from "@/components/chat/use-reasoning-effort"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { parseChatError } from "@/models/chat/errors"
import { describeKeySource, parseModelId, type ChatSetupData } from "@/models/chat/keys"
import { extractMessageText } from "@/models/chat/transforms"
import type { UIMessage } from "ai"
import { Loader2, Send, StopCircle } from "lucide-react"
import { useEffect, useRef, useState } from "react"

function useFetchedChatSetup(conversationId: string): ChatSetupData | null {
  const [chatSetup, setChatSetup] = useState<ChatSetupData | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch(`/api/chat/setup?conversationId=${encodeURIComponent(conversationId)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((json: ChatSetupData | null) => {
        if (!cancelled && json) setChatSetup(json)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [conversationId])
  return chatSetup
}

// The live conversation surface. Keyed by conversationId so a fresh useChat store and the loaded
// history mount together. Persists through the same /api/chat route as the full-screen page.
export function FloatingConversation({
  conversationId,
  initialMessages,
}: {
  conversationId: string
  initialMessages: UIMessage[]
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)

  const { messages, error, isStreaming, stop, input, setInput, submit } = useConversation({
    conversationId,
    initialMessages,
  })
  const chatSetup = useFetchedChatSetup(conversationId)
  const [reasoning] = useReasoningEffort()

  // Auto-scroll only while the user is already at the bottom, so reading an earlier tool card is not
  // undone by the next streamed chunk.
  useEffect(() => {
    if (!stickToBottom.current) return
    messagesEndRef.current?.scrollIntoView({ behavior: isStreaming ? "auto" : "smooth" })
  }, [messages, isStreaming])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    stickToBottom.current = true
    submit(chatSetup ? { model: chatSetup.selectedModel, labId: chatSetup.labContextId, reasoning } : { reasoning })
  }

  const selected = chatSetup?.models.find((model) => model.id === chatSetup.selectedModel) ?? null
  const blocked = Boolean(chatSetup && !selected?.source)

  return (
    <>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 space-y-2 overflow-y-auto bg-background p-3 text-[13px]"
      >
        {messages.length === 0 && (
          <p className="text-muted-foreground">
            Hello! I can help you design IF panels or find markers. Try asking: &quot;Design a 4-plex panel for human
            liver.&quot;
          </p>
        )}

        {messages
          .filter((message) => message.role === "user" || hasVisibleParts(message))
          .map((message) => (
            <ChatMessage
              key={message.id}
              compact
              role={message.role === "user" ? "user" : "assistant"}
              rawContent={extractMessageText(message)}
              message={
                message.role === "user" ? (
                  <p className="whitespace-pre-wrap break-words">{extractMessageText(message)}</p>
                ) : (
                  <MessageParts message={message} isStreaming={isStreaming} compact />
                )
              }
            />
          ))}

        {isAwaitingFirstContent(messages, isStreaming) && (
          <Loader2 className="size-4 animate-spin text-primary" aria-label="Assistant is responding" />
        )}

        {chatSetup && blocked && (
          <MissingKeyNotice
            provider={parseModelId(chatSetup.selectedModel)?.provider ?? null}
            inventory={chatSetup.inventory}
            labContextId={chatSetup.labContextId}
            compact
          />
        )}

        {error && (
          <ChatErrorNotice
            error={parseChatError(error.message)}
            inventory={chatSetup?.inventory ?? { user: [], labs: [], instance: [] }}
            labContextId={chatSetup?.labContextId ?? null}
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t bg-background p-3">
        <form className="flex w-full items-center space-x-2" onSubmit={handleSubmit}>
          <Input
            className="h-9 flex-1 text-sm"
            placeholder="Ask PanelMaker AI…"
            aria-label="Ask PanelMaker AI"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          {isStreaming ? (
            <Button type="button" size="icon" className="size-9" onClick={() => stop()} aria-label="Stop generating">
              <StopCircle className="size-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              className="size-9"
              disabled={!input.trim() || blocked}
              aria-label="Send message"
            >
              <Send className="size-4" />
            </Button>
          )}
        </form>
        {selected?.source && (
          <p className="mt-1.5 flex min-w-0 gap-3 text-[11px] text-muted-foreground">
            <span className="truncate">{selected.label}</span>
            <span className="truncate">{describeKeySource(selected.source)}</span>
          </p>
        )}
      </div>
    </>
  )
}
