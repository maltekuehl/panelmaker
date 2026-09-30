"use client"

import {
  isActiveConversationEvent,
  readActiveConversationId,
  storeActiveConversationId,
} from "@/components/chat/active-conversation"
import { ChatMessage } from "@/components/chat/chat-message"
import { ChatErrorNotice, MissingKeyNotice } from "@/components/chat/key-notice"
import { hasVisibleParts, isAwaitingFirstContent, MessageParts } from "@/components/chat/message-parts"
import { useConversation } from "@/components/chat/use-conversation"
import { useReasoningEffort } from "@/components/chat/use-reasoning-effort"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { parseChatError } from "@/models/chat/errors"
import { describeKeySource, parseModelId, type ChatSetupData } from "@/models/chat/keys"
import { extractMessageText } from "@/models/chat/transforms"
import type { UIMessage } from "ai"
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  GripHorizontal,
  Loader2,
  Send,
  Sparkles,
  StopCircle,
  X,
} from "lucide-react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"

const DEFAULT_WIDTH = 440
const DEFAULT_HEIGHT = 640
const MIN_WIDTH = 300
const MAX_WIDTH = 600
const MIN_HEIGHT = 350
const MAX_HEIGHT = 800
const CARD_HEIGHT_MINIMIZED = 48
const EDGE_MARGIN = 16

// The card is anchored by its bottom-right corner (CSS `right`/`bottom` offsets
// from the viewport edges), matching the FAB origin. With this anchor, minimizing
// collapses straight down and resizing from the top-left corner grows up/left,
// both for free, without recomputing the position.
const DEFAULT_OFFSET = { right: EDGE_MARGIN, bottom: EDGE_MARGIN }

// Clamp the bottom-right offsets so the card stays fully on screen.
function clampOffset(right: number, bottom: number, width: number, height: number) {
  const maxRight = Math.max(0, window.innerWidth - width)
  const maxBottom = Math.max(0, window.innerHeight - height)
  return {
    right: Math.max(0, Math.min(right, maxRight)),
    bottom: Math.max(0, Math.min(bottom, maxBottom)),
  }
}

// The live conversation surface. Keyed by conversationId so a fresh useChat store and the loaded
// history mount together. Persists through the same /api/chat route as the full-screen page.
function FloatingConversation({
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
  const [chatSetup, setChatSetup] = useState<ChatSetupData | null>(null)
  const [reasoning] = useReasoningEffort()

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

export function AIAssistantFloating() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [offset, setOffset] = useState(DEFAULT_OFFSET)
  const [isDragging, setIsDragging] = useState(false)
  const [dimensions, setDimensions] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT })
  const [isResizing, setIsResizing] = useState(false)

  const dragStartPointer = useRef<{ x: number; y: number } | null>(null)
  const dragStartOffset = useRef<{ right: number; bottom: number } | null>(null)
  const hasDragged = useRef(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const offsetRef = useRef(offset)
  const resizeStart = useRef<{
    x: number
    y: number
    width: number
    height: number
  } | null>(null)

  const { data: session } = useSession()
  const pathname = usePathname()

  const [conversationId, setConversationId] = useState<string | null>(null)
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([])
  const loadStartedRef = useRef(false)
  const isOnChatPage = pathname.startsWith("/chat")

  // The /chat page owns the thread while it is shown and may switch, edit or delete it. Dropping the
  // loaded copy there makes the widget re-resolve and refetch once the user navigates away.
  const [wasOnChatPage, setWasOnChatPage] = useState(isOnChatPage)
  if (isOnChatPage !== wasOnChatPage) {
    setWasOnChatPage(isOnChatPage)
    if (isOnChatPage) {
      setConversationId(null)
      setInitialMessages([])
    }
  }

  // Another tab switching conversations on /chat makes this widget's thread the wrong one.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (!isActiveConversationEvent(event) || event.newValue === conversationId) return
      setConversationId(null)
      setInitialMessages([])
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [conversationId])

  // Load the conversation last opened on /chat (or else the most recently updated one) each time the
  // panel is opened, then hand it to FloatingConversation. The thread is shared with /chat and
  // persisted server-side, so re-reading it is what keeps the widget from showing a stale copy.
  useEffect(() => {
    if (isOnChatPage || !conversationId) loadStartedRef.current = false
    if (isOnChatPage || !isOpen || !session?.user?.id || conversationId || loadStartedRef.current) return
    loadStartedRef.current = true
    let cancelled = false
    ;(async () => {
      try {
        const listResponse = await fetch("/api/chat/conversations")
        const listJson = await listResponse.json()
        const conversations = (listJson?.conversations ?? []) as { id: string; updatedAt: string }[]
        const activeId = readActiveConversationId()
        const mostRecent = [...conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
        let id = conversations.some((conversation) => conversation.id === activeId) ? activeId : mostRecent?.id
        if (!id) {
          const createResponse = await fetch("/api/chat/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          })
          id = (await createResponse.json())?.conversation?.id
        }
        if (!id) throw new Error("Could not resolve a conversation")
        const conversationResponse = await fetch(`/api/chat/conversations/${id}`)
        const conversationJson = await conversationResponse.json()
        if (cancelled) return
        storeActiveConversationId(id)
        setInitialMessages((conversationJson?.conversation?.messages ?? []) as UIMessage[])
        setConversationId(id)
      } catch {
        // Allow a retry on the next open if resolution failed.
        loadStartedRef.current = false
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isOpen, isOnChatPage, session?.user?.id, conversationId])

  useEffect(() => {
    offsetRef.current = offset
  }, [offset])

  // A viewport that shrinks under the card would otherwise strand it outside the visible area.
  useEffect(() => {
    if (!isOpen) return
    const onViewportResize = () =>
      setOffset((current) =>
        clampOffset(
          current.right,
          current.bottom,
          cardRef.current?.offsetWidth ?? DEFAULT_WIDTH,
          cardRef.current?.offsetHeight ?? DEFAULT_HEIGHT,
        ),
      )
    window.addEventListener("resize", onViewportResize)
    return () => window.removeEventListener("resize", onViewportResize)
  }, [isOpen])

  // Closing drops the loaded thread so the next open refetches it instead of replaying a snapshot
  // that the /chat page may have moved on from. Minimizing deliberately keeps it mounted.
  const handleClose = useCallback(() => {
    setIsOpen(false)
    setConversationId(null)
    setInitialMessages([])
    loadStartedRef.current = false
  }, [])

  // --- Drag handlers ---
  // Dragging moves the card by adjusting its bottom-right offsets: a rightward
  // pointer move decreases the `right` offset, a downward move decreases `bottom`.
  const applyDrag = useCallback((clientX: number, clientY: number) => {
    if (!dragStartPointer.current || !dragStartOffset.current) return false
    const dx = clientX - dragStartPointer.current.x
    const dy = clientY - dragStartPointer.current.y

    if (!hasDragged.current && Math.abs(dx) < 4 && Math.abs(dy) < 4) return false
    hasDragged.current = true

    const w = cardRef.current?.offsetWidth ?? DEFAULT_WIDTH
    const h = cardRef.current?.offsetHeight ?? DEFAULT_HEIGHT
    setOffset(clampOffset(dragStartOffset.current.right - dx, dragStartOffset.current.bottom - dy, w, h))
    return true
  }, [])

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      applyDrag(e.clientX, e.clientY)
    },
    [applyDrag],
  )

  const onTouchMove = useCallback(
    (e: TouchEvent) => {
      const touch = e.touches[0]
      if (applyDrag(touch.clientX, touch.clientY)) e.preventDefault()
    },
    [applyDrag],
  )

  const startDrag = useCallback((clientX: number, clientY: number) => {
    hasDragged.current = false
    dragStartPointer.current = { x: clientX, y: clientY }
    dragStartOffset.current = { ...offsetRef.current }
    setIsDragging(true)
  }, [])

  const onHeaderMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest("button")) return
      e.preventDefault()
      startDrag(e.clientX, e.clientY)
      const handleMouseUp = () => {
        setIsDragging(false)
        dragStartPointer.current = null
        dragStartOffset.current = null
        window.removeEventListener("mousemove", onMouseMove)
        window.removeEventListener("mouseup", handleMouseUp)
      }
      window.addEventListener("mousemove", onMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
    },
    [startDrag, onMouseMove],
  )

  const onHeaderTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest("button")) return
      const touch = e.touches[0]
      startDrag(touch.clientX, touch.clientY)
      const handleTouchEnd = () => {
        setIsDragging(false)
        dragStartPointer.current = null
        dragStartOffset.current = null
        window.removeEventListener("touchmove", onTouchMove)
        window.removeEventListener("touchend", handleTouchEnd)
      }
      window.addEventListener("touchmove", onTouchMove, { passive: false })
      window.addEventListener("touchend", handleTouchEnd)
    },
    [startDrag, onTouchMove],
  )

  // Minimizing/expanding only toggles height. The bottom-right anchor keeps the bottom edge fixed,
  // so the card collapses straight down toward its origin and grows back up on expand. A card parked
  // near the top of the viewport would grow its header (the only drag and toggle affordance) off
  // screen, so the offset is re-clamped against the height it is about to have.
  const handleHeaderClick = useCallback(() => {
    if (hasDragged.current) return
    const nextHeight = isMinimized ? dimensions.height : CARD_HEIGHT_MINIMIZED
    setOffset((current) => clampOffset(current.right, current.bottom, dimensions.width, nextHeight))
    setIsMinimized(!isMinimized)
  }, [isMinimized, dimensions.height, dimensions.width])

  // --- Resize handlers (top-left corner) ---
  // The bottom-right anchor is fixed, so resizing is purely a dimension change:
  // dragging the top-left corner up/left grows the card up/left.
  const onResizeMove = useCallback((e: MouseEvent) => {
    if (!resizeStart.current) return
    const dx = resizeStart.current.x - e.clientX
    const dy = resizeStart.current.y - e.clientY

    const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, resizeStart.current.width + dx))
    const newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, resizeStart.current.height + dy))

    setDimensions({ width: newWidth, height: newHeight })
    setOffset((current) => clampOffset(current.right, current.bottom, newWidth, newHeight))
  }, [])

  const onResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      resizeStart.current = {
        x: e.clientX,
        y: e.clientY,
        width: dimensions.width,
        height: dimensions.height,
      }
      setIsResizing(true)
      const handleResizeUp = () => {
        setIsResizing(false)
        resizeStart.current = null
        window.removeEventListener("mousemove", onResizeMove)
        window.removeEventListener("mouseup", handleResizeUp)
      }
      window.addEventListener("mousemove", onResizeMove)
      window.addEventListener("mouseup", handleResizeUp)
    },
    [dimensions, onResizeMove],
  )

  // The /chat page already owns this conversation; a second live store over it would go stale.
  if (!session?.user || isOnChatPage) {
    return null
  }

  if (!isOpen) {
    return (
      <Button
        className="fixed right-4 bottom-4 z-50 h-12 gap-2 rounded-full pr-4 pl-3 shadow-lg"
        onClick={() => setIsOpen(true)}
      >
        <div className="rounded-full bg-primary-foreground/20 p-1">
          <Sparkles className="size-4" />
        </div>
        PanelMaker AI
      </Button>
    )
  }

  return (
    <Card
      ref={cardRef}
      className="fixed z-50 flex flex-col overflow-hidden border-border bg-background p-0 shadow-xl"
      style={{
        right: offset.right,
        bottom: offset.bottom,
        width: dimensions.width,
        height: isMinimized ? CARD_HEIGHT_MINIMIZED : dimensions.height,
        transition: isDragging || isResizing ? "none" : "height 200ms ease-in-out",
      }}
    >
      {/* Resize handle, top-left corner */}
      {!isMinimized && (
        <div
          className="absolute top-0 left-0 z-10 flex size-5 cursor-nw-resize items-center justify-center text-muted-foreground/40 transition-colors hover:text-muted-foreground"
          onMouseDown={onResizeMouseDown}
          title="Resize"
        >
          <GripHorizontal className="size-3 -rotate-45" />
        </div>
      )}

      {/* Header, doubles as the drag handle */}
      <div
        className={cn(
          "flex items-center justify-between border-b bg-muted/50 p-3 backdrop-blur-sm select-none",
          "transition-colors hover:bg-muted",
          isDragging ? "cursor-grabbing" : "cursor-grab",
        )}
        onMouseDown={onHeaderMouseDown}
        onTouchStart={onHeaderTouchStart}
        onClick={handleHeaderClick}
      >
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="size-4 text-primary" />
          PanelMaker AI
        </h3>
        <div className="flex items-center gap-1">
          {conversationId && (
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={(e) => e.stopPropagation()}
              title="Open in full page"
            >
              <Link href={`/chat/${conversationId}`} aria-label="Open in full page">
                <ExternalLink className="size-4" />
              </Link>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            aria-label={isMinimized ? "Expand assistant" : "Minimize assistant"}
            onClick={(e) => {
              e.stopPropagation()
              setIsMinimized((prev) => !prev)
            }}
          >
            {isMinimized ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            aria-label="Close assistant"
            onClick={(e) => {
              e.stopPropagation()
              handleClose()
            }}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* Content. Kept mounted while minimized so the live stream is not thrown away. */}
      <div className={cn("flex min-h-0 flex-1 flex-col", isMinimized && "hidden")}>
        {conversationId ? (
          <FloatingConversation
            key={conversationId}
            conversationId={conversationId}
            initialMessages={initialMessages}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center bg-background">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </Card>
  )
}
