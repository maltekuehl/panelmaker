"use client"

import ChatAbout from "@/components/chat/chat-about"
import { ChatSidebarDesktop, ChatSidebarMobile, type ConversationListItem } from "@/components/chat/chat-sidebar"
import { ToolResultCard } from "@/components/chat/tool-result-card"
import Markdown from "@/components/markdown"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, UIMessage } from "ai"
import clsx from "clsx"
import { ArrowUp, Check, Copy, Edit2, Loader2, StopCircle, Trash2, X } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Fragment, ReactElement, useEffect, useRef, useState } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion"
import { Textarea } from "../ui/textarea"

type ToolPart = Parameters<typeof ToolResultCard>[0]["part"]

export const maxDuration = 50

const MessageCard = ({
  user,
  message,
  rawContent,
  onDelete,
  onEdit,
  onRegenerateFromHere,
}: {
  user: string
  message: ReactElement<any>
  rawContent?: string
  onDelete?: () => void
  onEdit?: (newContent: string) => void
  onRegenerateFromHere?: (newContent: string) => void
}) => {
  const isBot = user === "PanelMaker AI"
  const [copied, setCopied] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState("")

  // Update editedContent when rawContent changes or editing starts
  useEffect(() => {
    if (isEditing && rawContent) {
      setEditedContent(rawContent)
    }
  }, [isEditing, rawContent])

  const handleCopy = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    if (rawContent) {
      navigator.clipboard.writeText(rawContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSaveEdit = () => {
    if (editedContent.trim() && editedContent !== rawContent && onEdit) {
      onEdit(editedContent.trim())
    }
    setIsEditing(false)
  }

  const handleRegenerateFromHere = () => {
    if (editedContent.trim() && onRegenerateFromHere) {
      onRegenerateFromHere(editedContent.trim())
    }
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditedContent(rawContent || "")
    setIsEditing(false)
  }

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this message? This action cannot be undone.")) {
      onDelete?.()
    }
  }

  return (
    <div className={clsx("flex w-full items-start gap-2 group", isBot ? "justify-start" : "justify-end")}>
      {/* Action buttons for user messages - on the left */}
      {!isBot && onDelete && (
        <div
          className="flex flex-row gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ paddingTop: "1.875rem" }}
        >
          {(onEdit || onRegenerateFromHere) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-7 w-7 p-0 hover:bg-muted"
              title="Edit message"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="h-7 w-7 p-0 hover:bg-destructive hover:text-destructive-foreground"
            title="Delete message"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Message content */}
      <div className={clsx("flex flex-col mb-4", isBot ? "w-full items-start" : "max-w-[85%] items-end")}>
        <span className="text-xs font-medium text-muted-foreground mb-1 px-1">{user}</span>
        <div
          className={clsx(
            "w-full max-w-full relative animate-in fade-in duration-300",
            isBot
              ? "text-foreground"
              : isEditing
                ? "rounded-2xl bg-muted/40 p-2 text-foreground"
                : "rounded-2xl px-4 py-3 bg-primary text-primary-foreground rounded-br-md",
          )}
        >
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="w-full min-h-25 resize-none bg-background text-sm text-foreground"
                autoFocus
              />
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveEdit}>
                  <Check className="h-3.5 w-3.5" />
                  Save
                </Button>
                {onRegenerateFromHere && (
                  <Button variant="outline" size="sm" onClick={handleRegenerateFromHere}>
                    <ArrowUp className="h-3.5 w-3.5" />
                    Save & regenerate
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div
              className={clsx(
                "max-w-none mb-0",
                isBot ? "prose-zinc dark:prose-invert" : "prose-primary-foreground",
                "[&_.not-prose]:not-prose [&_.not-prose_*]:not-prose",
              )}
            >
              <div className="text-sm leading-6">{message}</div>
            </div>
          )}
        </div>
        {rawContent && !isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="text-xs h-6 py-1 px-2 flex gap-1 mt-1"
            aria-label="Copy message to clipboard"
          >
            {copied ? <Check className="size-3!" /> : <Copy className="size-3!" />}
            {copied && <span className="sr-only">Copied!</span>}
            <span>Copy message</span>
          </Button>
        )}
      </div>

      {/* Action buttons for bot messages - on the right */}
      {isBot && onDelete && (
        <div
          className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ paddingTop: "1.875rem" }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="h-7 w-7 p-0 hover:bg-destructive hover:text-destructive-foreground"
            title="Delete message"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}

// Collapsible reasoning display similar to tool invocation card
const ReasoningCard = ({
  text,
  isStreaming,
  reasoningIndex,
}: {
  text: string
  isStreaming: boolean
  reasoningIndex: number
}) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="relative px-4 py-0 bg-card border-border reasoning-invocation animate-in fade-in duration-300">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value={`reasoning-${reasoningIndex}`} className="border-none">
          <AccordionTrigger className="text-start overflow-hidden">
            <div className="flex items-center justify-between gap-2 pe-1 w-full min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                {isStreaming ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                ) : (
                  <Check className="h-4 w-4 text-primary shrink-0" />
                )}
                <div className="text-sm font-medium text-muted-foreground truncate">Reasoning</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground shrink-0"
                  aria-label="Copy reasoning to clipboard"
                  role="button"
                >
                  <div>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied && <span className="sr-only">Copied!</span>}
                  </div>
                </Button>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-4">
            <div className="prose prose-sm max-w-none">
              <Markdown>{text}</Markdown>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  )
}

interface ModelChoice {
  id: string
  label: string
}

interface ChatProps {
  conversationId: string
  initialMessages: UIMessage[]
  conversations: ConversationListItem[]
  name?: string
  availableModels: ModelChoice[]
  currentModel: string
}

export default function Chat({
  conversationId,
  initialMessages,
  conversations,
  name,
  availableModels,
  currentModel,
}: ChatProps) {
  const form = useRef<HTMLFormElement>(null)
  const router = useRouter()
  const [input, setInput] = useState("")

  const initialModel = availableModels.some((model) => model.id === currentModel)
    ? currentModel
    : (availableModels[0]?.id ?? currentModel)
  const [selectedModel, setSelectedModel] = useState(initialModel)

  const {
    messages,
    sendMessage,
    error,
    setMessages: setAiMessages,
    stop,
    status,
  } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: "/api/chat", body: { conversationId } }),
    experimental_throttle: 50,
    onFinish: () => {
      // The first reply names the conversation server-side; refresh so the sidebar picks it up.
      router.refresh()
    },
  })

  // Check if currently streaming
  const isStreaming = ["submitted", "streaming"].includes(status)

  const handleModelChange = (model: string) => {
    setSelectedModel(model)
    fetch(`/api/chat/conversations/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model }),
    })
  }

  const handleSubmitAction = (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) {
      e.preventDefault()
    }
    if (!input.trim()) return
    if (isStreaming) return

    sendMessage({ text: input.trim() }, { body: { conversationId, model: selectedModel } })
    setInput("")
  }

  // Helper function to extract raw text content from message parts
  const extractRawContent = (message: any): string => {
    if (!message.parts) {
      return message.content || ""
    }

    return message.parts
      .filter((part: any) => part.type === "text" || part.type === "reasoning")
      .map((part: any) => part.text || part.reasoningText || "")
      .join("\n\n")
      .trim()
  }

  // Delete a message and everything after it (server + local), keeping the linear thread consistent.
  const handleDeleteMessage = async (messageId: string) => {
    const index = messages.findIndex((m) => m.id === messageId)
    await fetch(`/api/chat/conversations/${conversationId}/messages/${messageId}`, { method: "DELETE" })
    setAiMessages(index === -1 ? messages : messages.slice(0, index))
    router.refresh()
  }

  // Edit a user message and regenerate: drop it and everything after on the server, then resend.
  const handleRegenerateFromHere = async (messageId: string, newContent: string) => {
    const messageIndex = messages.findIndex((m) => m.id === messageId)
    if (messageIndex === -1) return

    await fetch(`/api/chat/conversations/${conversationId}/messages/${messageId}`, { method: "DELETE" })
    setAiMessages(messages.slice(0, messageIndex))
    sendMessage({ text: newContent.trim() }, { body: { conversationId, model: selectedModel } })
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
      <div className="flex-1 flex flex-col relative w-full">
        <div className="lg:hidden border-b bg-background px-4 py-2">
          <ChatSidebarMobile
            conversations={conversations}
            currentConversationId={conversationId}
            isStreaming={isStreaming}
          />
        </div>

        <div
          className={`relative flex ${messages.length >= 1 ? "flex-col-reverse pb-56" : "flex-col pb-60"} h-full overflow-y-scroll w-full bg-background`}
          id="chat"
          style={{
            scrollBehavior: "smooth",
            paddingInlineStart: Math.round(scrollbarWidth),
          }}
        >
          <div className="w-full mt-8 px-4 lg:px-8">
            <div className="max-w-5xl mx-auto flex flex-col">
              {messages.length <= 0 && <ChatAbout />}

              {messages.map((m, index) => {
                const rawContent = extractRawContent(m)
                const isUserMessage = m.role === "user"
                return (
                  <Fragment key={m.id}>
                    <MessageCard
                      key={index}
                      user={isUserMessage ? (name ? name : "You") : "PanelMaker AI"}
                      rawContent={rawContent}
                      onDelete={() => handleDeleteMessage(m.id)}
                      onRegenerateFromHere={
                        isUserMessage ? (newContent) => handleRegenerateFromHere(m.id, newContent) : undefined
                      }
                      message={
                        <>
                          {m.parts?.map((part, partIndex) => (
                            <Fragment key={partIndex}>
                              {part.type === "reasoning" && (
                                <div className="py-1.5">
                                  <ReasoningCard
                                    text={part.text}
                                    isStreaming={
                                      (status === "submitted" || status === "streaming") &&
                                      partIndex === (m.parts?.length || 0) - 1
                                    }
                                    reasoningIndex={partIndex}
                                  />
                                </div>
                              )}
                              {(part.type === "dynamic-tool" ||
                                (typeof part.type === "string" && part.type.startsWith("tool-"))) && (
                                <div className="py-1.5">
                                  <ToolResultCard part={part as ToolPart} />
                                </div>
                              )}
                              {part.type === "text" && (
                                <div className="prose prose-sm animate-in fade-in duration-300">
                                  <Markdown>{part.text}</Markdown>
                                </div>
                              )}
                            </Fragment>
                          ))}
                        </>
                      }
                    />
                  </Fragment>
                )
              })}
              {messages.length > 0 && error !== undefined && (
                <Fragment key="error">
                  <MessageCard
                    user="PanelMaker AI"
                    message={
                      <div className="text-destructive animate-in fade-in duration-300">
                        <strong>Error:</strong> {error.message}
                      </div>
                    }
                  />
                </Fragment>
              )}
              {status === "submitted" && (
                <div className="flex w-full items-start gap-2 justify-start mb-4 animate-in fade-in duration-300">
                  <div className="flex flex-col items-start max-w-[85%]">
                    <span className="text-xs font-medium text-muted-foreground mb-1 px-1">PanelMaker AI</span>
                    <div className="rounded-2xl px-4 py-3 bg-muted/50 text-foreground rounded-bl-md">
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
                          <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
                          <div className="w-2 h-2 rounded-full bg-primary animate-bounce"></div>
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
        <div className="absolute bottom-0 left-0 right-0 w-full h-40 bg-linear-to-t from-background via-background to-transparent pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 right-0 w-full px-4 lg:px-8 pb-4">
          <div className="max-w-5xl mx-auto">
            <div className="overflow-hidden rounded-2xl border bg-background/95 shadow-lg backdrop-blur-sm supports-backdrop-filter:bg-background/60 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/40 transition-colors">
              <form className="flex flex-col" onSubmit={handleSubmitAction} ref={form}>
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
                  className="w-full min-h-11 max-h-48 resize-none border-0 bg-transparent px-4 pt-4 pb-0 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-hidden focus:outline-hidden"
                  placeholder="E.g., which markers work for resident memory T cells in human kidney?"
                />
                <div className="flex items-center justify-between gap-2 px-4 pb-2.5 pt-1">
                  {availableModels.length > 1 ? (
                    <Select value={selectedModel} onValueChange={handleModelChange}>
                      <SelectTrigger
                        size="sm"
                        className="-ml-2 h-7 w-auto gap-1 border-0 bg-transparent px-2 text-xs text-muted-foreground shadow-none hover:bg-muted hover:text-foreground focus-visible:ring-0"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableModels.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span />
                  )}
                  {["submitted", "streaming"].includes(status) ? (
                    <Button type="button" size="sm" onClick={() => stop()} className="size-8 shrink-0 rounded-full p-0">
                      <StopCircle className="size-4" />
                      <span className="sr-only">Stop</span>
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!input.trim()}
                      className="size-8 shrink-0 rounded-full p-0"
                    >
                      <ArrowUp className="size-4" />
                      <span className="sr-only">Send message</span>
                    </Button>
                  )}
                </div>
              </form>
            </div>
            <div className="text-center py-2 text-balance text-[0.5rem] text-muted-foreground select-none">
              Information purposes only. No medical advice. Verify responses. Do not submit personal or copyrighted
              data. By using this service, you agree to our{" "}
              <Link href="/legal/terms" className="underline hover:text-primary transition-colors">
                Terms of Service
              </Link>{" "}
              and confirm that you have read our{" "}
              <Link href="/legal/privacy" className="underline hover:text-primary transition-colors">
                Privacy Policy
              </Link>{" "}
              and the{" "}
              <Link href="/docs/knowledgebase" className="underline hover:text-primary transition-colors">
                Data Sources and Licensing
              </Link>{" "}
              section.{" "}
              <Link href="/legal/notice" className="underline hover:text-primary transition-colors">
                Legal Notice & Disclaimer
              </Link>
              . Logos may be trademarked and remain the property of their respective owner.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
