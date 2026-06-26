"use client"

import { ToolResultCard } from "@/components/chat/tool-result-card"
import Markdown from "@/components/markdown"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import {
  Bot,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  GripHorizontal,
  Loader2,
  Send,
  Sparkles,
  User,
  X,
} from "lucide-react"
import { useSession } from "next-auth/react"
import Link from "next/link"
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
// collapses straight down and resizing from the top-left corner grows up/left —
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

type ToolPart = Parameters<typeof ToolResultCard>[0]["part"]

// The live conversation surface. Keyed by conversationId so a fresh useChat store and the loaded
// history mount together. Persists through the same /api/chat route as the full-screen page.
function FloatingConversation({
  conversationId,
  initialMessages,
}: {
  conversationId: string
  initialMessages: UIMessage[]
}) {
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: "/api/chat", body: { conversationId } }),
    experimental_throttle: 50,
  })

  const isLoading = status === "submitted" || status === "streaming"

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input.trim() }, { body: { conversationId } })
    setInput("")
  }

  return (
    <>
      <div className="flex-1 p-4 space-y-4 overflow-y-auto text-sm bg-background">
        {messages.length === 0 && (
          <div className="flex gap-3">
            <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="h-3 w-3 text-primary" />
            </div>
            <div className="bg-muted p-3 rounded-md rounded-tl-none">
              <p>
                Hello! I can help you design IF panels or find markers. Try asking: &quot;Design a 4-plex panel for
                human liver.&quot;
              </p>
            </div>
          </div>
        )}

        {messages.map((message) => {
          if (message.role === "user") {
            const textContent = message.parts
              .filter((part) => part.type === "text")
              .map((part) => (part as { type: "text"; text: string }).text)
              .join("")

            return (
              <div key={message.id} className="flex gap-3 flex-row-reverse">
                <div className="h-6 w-6 rounded bg-muted flex items-center justify-center shrink-0">
                  <User className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="bg-primary text-primary-foreground p-3 rounded-md rounded-tr-none">
                  <p>{textContent}</p>
                </div>
              </div>
            )
          }

          return (
            <div key={message.id} className="flex gap-3">
              <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="h-3 w-3 text-primary" />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                {message.parts.map((part, i) => {
                  if (part.type === "text") {
                    const text = (part as { type: "text"; text: string }).text
                    if (!text) return null
                    return (
                      <div key={i} className="bg-muted p-3 rounded-md rounded-tl-none prose prose-sm max-w-none">
                        <Markdown>{text}</Markdown>
                      </div>
                    )
                  }
                  if (
                    part.type === "dynamic-tool" ||
                    (typeof part.type === "string" && part.type.startsWith("tool-"))
                  ) {
                    return <ToolResultCard key={i} part={part as ToolPart} />
                  }
                  return null
                })}
              </div>
            </div>
          )
        })}

        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-3">
            <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="h-3 w-3 text-primary" />
            </div>
            <div className="bg-muted p-3 rounded-md rounded-tl-none">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t bg-background">
        <form className="flex w-full items-center space-x-2" onSubmit={handleSubmit}>
          <Input
            className="flex-1 h-9 text-sm"
            placeholder="Ask PanelMaker AI..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <Button type="submit" size="icon" className="h-9 w-9" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
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

  const [conversationId, setConversationId] = useState<string | null>(null)
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([])
  const loadStartedRef = useRef(false)

  // Load (or create) the user's most-recent conversation the first time the panel is opened, then
  // hand it to FloatingConversation. The thread is shared with /chat and persisted server-side.
  // A ref (not state) guards against a double-load so toggling it never re-runs and cancels the effect.
  useEffect(() => {
    if (!isOpen || !session?.user?.id || conversationId || loadStartedRef.current) return
    loadStartedRef.current = true
    let cancelled = false
    ;(async () => {
      try {
        const listResponse = await fetch("/api/chat/conversations")
        const listJson = await listResponse.json()
        let id = listJson?.conversations?.[0]?.id as string | undefined
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
  }, [isOpen, session?.user?.id, conversationId])

  useEffect(() => {
    offsetRef.current = offset
  }, [offset])

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

  // Minimizing/expanding only toggles height. The bottom-right anchor keeps the
  // bottom edge fixed, so the card collapses straight down toward its origin.
  const handleHeaderClick = useCallback(() => {
    if (hasDragged.current) return
    setIsMinimized((prev) => !prev)
  }, [])

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

  if (!session?.user) {
    return null
  }

  if (!isOpen) {
    return (
      <Button
        className="fixed bottom-4 right-4 h-12 rounded-full shadow-lg z-50 gap-2 pl-3 pr-4"
        onClick={() => setIsOpen(true)}
      >
        <div className="bg-primary-foreground/20 p-1 rounded-full">
          <Sparkles className="h-4 w-4" />
        </div>
        PanelMaker AI
      </Button>
    )
  }

  return (
    <Card
      ref={cardRef}
      className="fixed bg-background shadow-xl z-50 flex flex-col overflow-hidden border-border p-0"
      style={{
        right: offset.right,
        bottom: offset.bottom,
        width: dimensions.width,
        height: isMinimized ? CARD_HEIGHT_MINIMIZED : dimensions.height,
        transition: isDragging || isResizing ? "none" : "height 200ms ease-in-out",
      }}
    >
      {/* Resize handle — top-left corner */}
      {!isMinimized && (
        <div
          className="absolute top-0 left-0 z-10 flex items-center justify-center w-5 h-5 cursor-nw-resize text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          onMouseDown={onResizeMouseDown}
          title="Resize"
        >
          <GripHorizontal className="h-3 w-3 -rotate-45" />
        </div>
      )}

      {/* Header — drag handle */}
      <div
        className={cn(
          "p-3 border-b bg-muted/50 backdrop-blur-sm flex justify-between items-center select-none",
          "hover:bg-muted transition-colors",
          isDragging ? "cursor-grabbing" : "cursor-grab",
        )}
        onMouseDown={onHeaderMouseDown}
        onTouchStart={onHeaderTouchStart}
        onClick={handleHeaderClick}
      >
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          PanelMaker AI
        </h3>
        <div className="flex items-center gap-1">
          {conversationId && (
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => e.stopPropagation()}
              title="Open in full page"
            >
              <Link href={`/chat/${conversationId}`} aria-label="Open in full page">
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation()
              setIsMinimized((prev) => !prev)
            }}
          >
            {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation()
              setIsOpen(false)
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized &&
        (conversationId ? (
          <FloatingConversation
            key={conversationId}
            conversationId={conversationId}
            initialMessages={initialMessages}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-background">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ))}
    </Card>
  )
}
