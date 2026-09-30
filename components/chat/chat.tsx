"use client"

import ChatAbout from "@/components/chat/chat-about"
import { ChatMessage } from "@/components/chat/chat-message"
import { ChatSidebarDesktop, ChatSidebarMobile } from "@/components/chat/chat-sidebar"
import { ChatErrorNotice, MissingKeyNotice } from "@/components/chat/key-notice"
import { hasVisibleParts, isAwaitingFirstContent, MessageParts } from "@/components/chat/message-parts"
import { ModelPicker, ReasoningPicker } from "@/components/chat/model-picker"
import { useChatSetup } from "@/components/chat/use-chat-setup"
import { useConversation } from "@/components/chat/use-conversation"
import { useReasoningEffort } from "@/components/chat/use-reasoning-effort"
import { Button } from "@/components/ui/button"
import { parseChatError } from "@/models/chat/errors"
import type { ChatSetupData } from "@/models/chat/keys"
import { extractMessageText, type ConversationSummary } from "@/models/chat/transforms"
import type { UIMessage } from "ai"
import { ArrowUp, StopCircle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface ChatProps {
  conversationId: string
  initialMessages: UIMessage[]
  conversations: ConversationSummary[]
  name?: string
  chatSetup: ChatSetupData
}

export default function Chat({ conversationId, initialMessages, conversations, name, chatSetup }: ChatProps) {
  const router = useRouter()
  const setup = useChatSetup(conversationId, chatSetup)
  const [reasoning, setReasoning] = useReasoningEffort()
  const sendOptions = { model: setup.selectedModel, labId: setup.labContextId, reasoning }

  const { messages, setMessages, error, isStreaming, stop, input, setInput, send, submit } = useConversation({
    conversationId,
    initialMessages,
    // The first reply names the conversation server-side; refresh so the sidebar picks it up.
    onFinish: () => router.refresh(),
  })

  const handleSubmitAction = (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault()
    if (!setup.source) return
    submit(sendOptions)
  }

  // Delete a message and everything after it (server + local), keeping the linear thread consistent.
  const handleDeleteMessage = async (messageId: string) => {
    const index = messages.findIndex((m) => m.id === messageId)
    await fetch(`/api/chat/conversations/${conversationId}/messages/${messageId}`, { method: "DELETE" })
    setMessages(index === -1 ? messages : messages.slice(0, index))
    router.refresh()
  }

  // Edit a user message and regenerate: drop it and everything after on the server, then resend.
  const handleRegenerateFromHere = async (messageId: string, newContent: string) => {
    const messageIndex = messages.findIndex((m) => m.id === messageId)
    if (messageIndex === -1) return

    await fetch(`/api/chat/conversations/${conversationId}/messages/${messageId}`, { method: "DELETE" })
    setMessages(messages.slice(0, messageIndex))
    send(newContent, sendOptions)
  }

  const [scrollbarWidth, setScrollbarWidth] = useState(0)

  useEffect(() => {
    function updateScrollbarWidth() {
      if (typeof window === "undefined") return
      const chatElem = window.document.getElementById("chat")
      if (chatElem) {
        setScrollbarWidth(chatElem.offsetWidth - chatElem.clientWidth)
      }
    }
    updateScrollbarWidth()
    window.addEventListener("resize", updateScrollbarWidth)
    return () => window.removeEventListener("resize", updateScrollbarWidth)
  }, [])

  return (
    <div className="flex h-[calc(100vh-(--spacing(20)))]">
      <ChatSidebarDesktop
        conversations={conversations}
        currentConversationId={conversationId}
        isStreaming={isStreaming}
      />
      <div className="relative flex w-full flex-1 flex-col">
        <div className="border-b bg-background px-4 py-2 lg:hidden">
          <ChatSidebarMobile
            conversations={conversations}
            currentConversationId={conversationId}
            isStreaming={isStreaming}
          />
        </div>

        <div
          className={`relative flex ${messages.length >= 1 ? "flex-col-reverse pb-56" : "flex-col pb-60"} h-full w-full overflow-y-scroll bg-background`}
          id="chat"
          style={{
            scrollBehavior: "smooth",
            paddingInlineStart: Math.round(scrollbarWidth),
          }}
        >
          <div className="mt-8 w-full px-4 lg:px-8">
            <div className="mx-auto flex max-w-5xl flex-col">
              {messages.length <= 0 && <ChatAbout />}
              {messages.length <= 0 && !setup.source && (
                <MissingKeyNotice
                  provider={setup.provider}
                  inventory={setup.inventory}
                  labContextId={setup.labContextId}
                  className="mt-6"
                />
              )}

              {messages.map((m) => {
                const isUserMessage = m.role === "user"
                if (!isUserMessage && !hasVisibleParts(m)) return null
                return (
                  <ChatMessage
                    key={m.id}
                    role={isUserMessage ? "user" : "assistant"}
                    author={isUserMessage ? (name ?? "You") : "PanelMaker AI"}
                    rawContent={extractMessageText(m, { includeReasoning: true })}
                    onDelete={() => handleDeleteMessage(m.id)}
                    onRegenerateFromHere={
                      isUserMessage ? (newContent) => handleRegenerateFromHere(m.id, newContent) : undefined
                    }
                    message={
                      isUserMessage ? (
                        <p className="whitespace-pre-wrap break-words">{extractMessageText(m)}</p>
                      ) : (
                        <MessageParts message={m} isStreaming={isStreaming} />
                      )
                    }
                  />
                )
              })}
              {messages.length > 0 && error !== undefined && (
                <ChatMessage
                  key="error"
                  role="assistant"
                  author="PanelMaker AI"
                  message={
                    <ChatErrorNotice
                      error={parseChatError(error.message)}
                      inventory={setup.inventory}
                      labContextId={setup.labContextId}
                    />
                  }
                />
              )}
              {isAwaitingFirstContent(messages, isStreaming) && (
                <div className="mb-4 flex w-full items-start justify-start gap-2 duration-300 animate-in fade-in">
                  <div className="flex max-w-[85%] flex-col items-start">
                    <span className="mb-1 px-1 text-xs font-medium text-muted-foreground">PanelMaker AI</span>
                    <div className="rounded-2xl rounded-bl-md bg-muted/50 px-4 py-3 text-foreground">
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1.5">
                          <div className="size-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]"></div>
                          <div className="size-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]"></div>
                          <div className="size-2 animate-bounce rounded-full bg-primary"></div>
                        </div>
                        <span className="text-sm text-muted-foreground">Processing...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-40 w-full bg-linear-to-t from-background via-background to-transparent"></div>
        <div className="absolute right-0 bottom-0 left-0 w-full px-4 pb-4 lg:px-8">
          <div className="mx-auto max-w-5xl">
            {messages.length > 0 && !setup.source && (
              <div className="mb-2">
                <MissingKeyNotice
                  provider={setup.provider}
                  inventory={setup.inventory}
                  labContextId={setup.labContextId}
                  compact
                />
              </div>
            )}
            <div className="overflow-hidden rounded-2xl border bg-background/95 shadow-lg backdrop-blur-sm transition-colors focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/40 supports-backdrop-filter:bg-background/60">
              <form className="flex flex-col" onSubmit={handleSubmitAction}>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSubmitAction()
                    }
                  }}
                  minLength={3}
                  maxLength={2048}
                  autoFocus
                  rows={2}
                  aria-label="Message PanelMaker AI"
                  className="max-h-48 min-h-11 w-full resize-none border-0 bg-transparent px-4 pt-4 pb-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden focus-visible:outline-hidden"
                  placeholder="E.g., which markers work for resident memory T cells in human kidney?"
                />
                <div className="flex items-center justify-between gap-2 px-4 pt-1 pb-2.5">
                  <ModelPicker setup={setup} disabled={isStreaming}>
                    <ReasoningPicker value={reasoning} onChange={setReasoning} disabled={isStreaming} />
                  </ModelPicker>
                  {isStreaming ? (
                    <Button type="button" size="sm" onClick={() => stop()} className="size-8 shrink-0 rounded-full p-0">
                      <StopCircle className="size-4" />
                      <span className="sr-only">Stop</span>
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!input.trim() || !setup.source}
                      className="size-8 shrink-0 rounded-full p-0"
                    >
                      <ArrowUp className="size-4" />
                      <span className="sr-only">Send message</span>
                    </Button>
                  )}
                </div>
              </form>
            </div>
            <div className="text-balance py-2 text-center text-[10px] text-muted-foreground select-none">
              Information purposes only. No medical advice. Verify responses. Do not submit personal or copyrighted
              data. By using this service, you agree to our{" "}
              <Link href="/docs/legal/terms" className="underline transition-colors hover:text-primary">
                Terms of Service
              </Link>{" "}
              and confirm that you have read our{" "}
              <Link href="/docs/legal/privacy" className="underline transition-colors hover:text-primary">
                Privacy Policy
              </Link>{" "}
              and the{" "}
              <Link href="/docs/knowledgebase" className="underline transition-colors hover:text-primary">
                Data Sources and Licensing
              </Link>{" "}
              section.{" "}
              <Link href="/docs/legal/notice" className="underline transition-colors hover:text-primary">
                Legal Notice and Disclaimer
              </Link>
              . Logos may be trademarked and remain the property of their respective owner.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
