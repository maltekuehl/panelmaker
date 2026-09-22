"use client"

import ChatAbout from "@/components/chat/chat-about"
import { ChatSidebarDesktop, ChatSidebarMobile } from "@/components/chat/chat-sidebar"
import { MessageParts } from "@/components/chat/message-parts"
import { useConversation } from "@/components/chat/use-conversation"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { extractMessageText, type ConversationSummary } from "@/models/chat/transforms"
import type { UIMessage } from "ai"
import clsx from "clsx"
import { ArrowUp, Check, Copy, Edit2, StopCircle, Trash2, X } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState, type ReactNode } from "react"

const MessageCard = ({
  role,
  author,
  message,
  rawContent,
  onDelete,
  onRegenerateFromHere,
}: {
  role: "user" | "assistant"
  author: string
  message: ReactNode
  rawContent?: string
  onDelete?: () => void
  onRegenerateFromHere?: (newContent: string) => void
}) => {
  const isBot = role === "assistant"
  const [copied, setCopied] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState("")
  const [confirmingDelete, setConfirmingDelete] = useState(false)

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

  const deleteButton = onDelete && (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setConfirmingDelete(true)}
      className="size-7 p-0 hover:bg-destructive hover:text-destructive-foreground"
      aria-label="Delete message"
      title="Delete message"
    >
      <Trash2 className="size-3.5" />
    </Button>
  )

  return (
    <div className={clsx("group flex w-full items-start gap-2", isBot ? "justify-start" : "justify-end")}>
      {!isBot && onDelete && (
        <div className="flex flex-row gap-1 pt-7.5 opacity-0 transition-opacity group-hover:opacity-100">
          {onRegenerateFromHere && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="size-7 p-0 hover:bg-muted"
              aria-label="Edit message"
              title="Edit message"
            >
              <Edit2 className="size-3.5" />
            </Button>
          )}
          {deleteButton}
        </div>
      )}

      <div className={clsx("mb-4 flex flex-col", isBot ? "w-full items-start" : "max-w-[85%] items-end")}>
        <span className="mb-1 px-1 text-xs font-medium text-muted-foreground">{author}</span>
        <div
          className={clsx(
            "relative w-full max-w-full duration-300 animate-in fade-in",
            isBot
              ? "text-foreground"
              : isEditing
                ? "rounded-2xl bg-muted/40 p-2 text-foreground"
                : "rounded-2xl rounded-br-md bg-primary px-4 py-3 text-primary-foreground",
          )}
        >
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="min-h-25 w-full resize-none bg-background text-sm text-foreground"
                autoFocus
              />
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                  <X className="size-3.5" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleRegenerateFromHere}>
                  <ArrowUp className="size-3.5" />
                  Save and regenerate
                </Button>
              </div>
            </div>
          ) : (
            <div className="mb-0 max-w-none [&_.not-prose]:not-prose [&_.not-prose_*]:not-prose">
              <div className="text-sm leading-6">{message}</div>
            </div>
          )}
        </div>
        {rawContent && !isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="mt-1 h-6 px-2 text-xs"
            aria-label="Copy message to clipboard"
          >
            {copied ? <Check className="size-3!" /> : <Copy className="size-3!" />}
            {copied && <span className="sr-only">Copied</span>}
            <span>Copy message</span>
          </Button>
        )}
      </div>

      {isBot && onDelete && (
        <div className="flex flex-col gap-1 pt-7.5 opacity-0 transition-opacity group-hover:opacity-100">
          {deleteButton}
        </div>
      )}

      {onDelete && (
        <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this message and everything after it?</AlertDialogTitle>
              <AlertDialogDescription>
                All later messages in this conversation will also be removed. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={() => onDelete()}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}

interface ModelChoice {
  id: string
  label: string
}

interface ChatProps {
  conversationId: string
  initialMessages: UIMessage[]
  conversations: ConversationSummary[]
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
  const router = useRouter()

  const initialModel = availableModels.some((model) => model.id === currentModel)
    ? currentModel
    : (availableModels[0]?.id ?? currentModel)
  const [selectedModel, setSelectedModel] = useState(initialModel)

  const { messages, setMessages, error, status, isStreaming, stop, input, setInput, send, submit } = useConversation({
    conversationId,
    initialMessages,
    // The first reply names the conversation server-side; refresh so the sidebar picks it up.
    onFinish: () => router.refresh(),
  })

  const handleModelChange = (model: string) => {
    setSelectedModel(model)
    fetch(`/api/chat/conversations/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model }),
    })
  }

  const handleSubmitAction = (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault()
    submit(selectedModel)
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
    send(newContent, selectedModel)
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

              {messages.map((m) => {
                const isUserMessage = m.role === "user"
                return (
                  <MessageCard
                    key={m.id}
                    role={isUserMessage ? "user" : "assistant"}
                    author={isUserMessage ? (name ?? "You") : "PanelMaker AI"}
                    rawContent={extractMessageText(m, { includeReasoning: true })}
                    onDelete={() => handleDeleteMessage(m.id)}
                    onRegenerateFromHere={
                      isUserMessage ? (newContent) => handleRegenerateFromHere(m.id, newContent) : undefined
                    }
                    message={<MessageParts message={m} isStreaming={isStreaming} />}
                  />
                )
              })}
              {messages.length > 0 && error !== undefined && (
                <MessageCard
                  key="error"
                  role="assistant"
                  author="PanelMaker AI"
                  message={
                    <div className="text-destructive duration-300 animate-in fade-in">
                      <strong>Error:</strong> {error.message}
                    </div>
                  }
                />
              )}
              {status === "submitted" && (
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
                  {availableModels.length > 1 ? (
                    <Select value={selectedModel} onValueChange={handleModelChange}>
                      <SelectTrigger
                        size="sm"
                        aria-label="Model"
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
                  {isStreaming ? (
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
            <div className="text-balance py-2 text-center text-[10px] text-muted-foreground select-none">
              Information purposes only. No medical advice. Verify responses. Do not submit personal or copyrighted
              data. By using this service, you agree to our{" "}
              <Link href="/legal/terms" className="underline transition-colors hover:text-primary">
                Terms of Service
              </Link>{" "}
              and confirm that you have read our{" "}
              <Link href="/legal/privacy" className="underline transition-colors hover:text-primary">
                Privacy Policy
              </Link>{" "}
              and the{" "}
              <Link href="/docs/knowledgebase" className="underline transition-colors hover:text-primary">
                Data Sources and Licensing
              </Link>{" "}
              section.{" "}
              <Link href="/legal/notice" className="underline transition-colors hover:text-primary">
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
