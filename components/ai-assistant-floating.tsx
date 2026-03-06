"use client"

import { ToolResultCard } from "@/components/chat/tool-result-card"
import Markdown from "@/components/markdown"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Bot, ChevronDown, ChevronUp, GripHorizontal, Loader2, RotateCcw, Send, Sparkles, User, X } from "lucide-react"
import { useSession } from "next-auth/react"
import { useCallback, useEffect, useRef, useState } from "react"

const DEFAULT_WIDTH = 440
const DEFAULT_HEIGHT = 640
const MIN_WIDTH = 300
const MAX_WIDTH = 600
const MIN_HEIGHT = 350
const MAX_HEIGHT = 800
const CARD_HEIGHT_MINIMIZED = 48
const EDGE_MARGIN = 16

function getDefaultPosition(width: number, height: number) {
  if (typeof window === "undefined") return { x: 0, y: 0 }
  return {
    x: window.innerWidth - width - EDGE_MARGIN,
    y: window.innerHeight - height - EDGE_MARGIN,
  }
}

function clampPosition(x: number, y: number, width: number) {
  const maxX = Math.max(0, window.innerWidth - width)
  const maxY = Math.max(0, window.innerHeight - CARD_HEIGHT_MINIMIZED)
  return {
    x: Math.max(0, Math.min(x, maxX)),
    y: Math.max(0, Math.min(y, maxY)),
  }
}

type ToolPart = Parameters<typeof ToolResultCard>[0]["part"]

export function AIAssistantFloating() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [input, setInput] = useState("")
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dimensions, setDimensions] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT })
  const [isResizing, setIsResizing] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const dragStartPointer = useRef<{ x: number; y: number } | null>(null)
  const dragStartPosition = useRef<{ x: number; y: number } | null>(null)
  const hasDragged = useRef(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const resizeStart = useRef<{
    x: number
    y: number
    width: number
    height: number
    posX: number
    posY: number
  } | null>(null)

  const { data: session } = useSession()

  const { messages, sendMessage, status, setMessages } = useChat({
    id: "floating-assistant",
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    experimental_throttle: 50,
  })

  const isLoading = status === "submitted" || status === "streaming"

  useEffect(() => {
    if (position === null && typeof window !== "undefined") {
      const h = isMinimized ? CARD_HEIGHT_MINIMIZED : dimensions.height
      setPosition(getDefaultPosition(dimensions.width, h))
    }
  }, [position, isMinimized, dimensions])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  // --- Drag handlers ---
  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragStartPointer.current || !dragStartPosition.current) return

    const dx = e.clientX - dragStartPointer.current.x
    const dy = e.clientY - dragStartPointer.current.y

    if (!hasDragged.current && Math.abs(dx) < 4 && Math.abs(dy) < 4) return
    hasDragged.current = true

    const newX = dragStartPosition.current.x + dx
    const newY = dragStartPosition.current.y + dy

    setPosition((prev) => {
      const w = cardRef.current?.offsetWidth ?? DEFAULT_WIDTH
      return clampPosition(newX, newY, w)
    })
  }, [])

  const onHeaderMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest("button")) return
      e.preventDefault()
      hasDragged.current = false
      const h = isMinimized ? CARD_HEIGHT_MINIMIZED : dimensions.height
      dragStartPointer.current = { x: e.clientX, y: e.clientY }
      dragStartPosition.current = position ?? getDefaultPosition(dimensions.width, h)
      setIsDragging(true)
      const handleMouseUp = () => {
        setIsDragging(false)
        dragStartPointer.current = null
        dragStartPosition.current = null
        window.removeEventListener("mousemove", onMouseMove)
        window.removeEventListener("mouseup", handleMouseUp)
      }
      window.addEventListener("mousemove", onMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
    },
    [position, isMinimized, dimensions, onMouseMove],
  )

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!dragStartPointer.current || !dragStartPosition.current) return
    const touch = e.touches[0]
    const dx = touch.clientX - dragStartPointer.current.x
    const dy = touch.clientY - dragStartPointer.current.y

    if (!hasDragged.current && Math.abs(dx) < 4 && Math.abs(dy) < 4) return
    hasDragged.current = true
    e.preventDefault()

    const newX = dragStartPosition.current.x + dx
    const newY = dragStartPosition.current.y + dy

    setPosition((prev) => {
      const w = cardRef.current?.offsetWidth ?? DEFAULT_WIDTH
      return clampPosition(newX, newY, w)
    })
  }, [])

  const onHeaderTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest("button")) return
      hasDragged.current = false
      const touch = e.touches[0]
      const h = isMinimized ? CARD_HEIGHT_MINIMIZED : dimensions.height
      dragStartPointer.current = { x: touch.clientX, y: touch.clientY }
      dragStartPosition.current = position ?? getDefaultPosition(dimensions.width, h)
      setIsDragging(true)
      const handleTouchEnd = () => {
        setIsDragging(false)
        dragStartPointer.current = null
        dragStartPosition.current = null
        window.removeEventListener("touchmove", onTouchMove)
        window.removeEventListener("touchend", handleTouchEnd)
      }
      window.addEventListener("touchmove", onTouchMove, { passive: false })
      window.addEventListener("touchend", handleTouchEnd)
    },
    [position, isMinimized, dimensions, onTouchMove],
  )

  const handleHeaderClick = useCallback(() => {
    if (hasDragged.current) return
    setIsMinimized((prev) => !prev)
  }, [])

  // --- Resize handlers (top-left corner) ---
  const onResizeMove = useCallback((e: MouseEvent) => {
    if (!resizeStart.current) return
    const dx = resizeStart.current.x - e.clientX
    const dy = resizeStart.current.y - e.clientY

    const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, resizeStart.current.width + dx))
    const newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, resizeStart.current.height + dy))

    const actualDx = newWidth - resizeStart.current.width
    const actualDy = newHeight - resizeStart.current.height

    setDimensions({ width: newWidth, height: newHeight })
    setPosition(clampPosition(resizeStart.current.posX - actualDx, resizeStart.current.posY - actualDy, newWidth))
  }, [])

  const onResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const pos = position ?? getDefaultPosition(dimensions.width, dimensions.height)
      resizeStart.current = {
        x: e.clientX,
        y: e.clientY,
        width: dimensions.width,
        height: dimensions.height,
        posX: pos.x,
        posY: pos.y,
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
    [position, dimensions, onResizeMove],
  )

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput("")
  }

  if (!session?.user) {
    return null
  }

  if (!isOpen) {
    return (
      <Button
        className="fixed bottom-4 right-4 h-12 rounded-full shadow-lg z-50 gap-2 pl-3 pr-4"
        onClick={() => setIsOpen(true)}
      >
        <div className="bg-white/20 p-1 rounded-full">
          <Sparkles className="h-4 w-4" />
        </div>
        AI Assistant
      </Button>
    )
  }

  const posX = position?.x ?? 0
  const posY = position?.y ?? 0

  return (
    <Card
      ref={cardRef}
      className="fixed bg-white shadow-xl z-50 flex flex-col overflow-hidden border-zinc-200 p-0"
      style={{
        left: posX,
        top: posY,
        width: isMinimized ? DEFAULT_WIDTH : dimensions.width,
        height: isMinimized ? CARD_HEIGHT_MINIMIZED : dimensions.height,
        transition: isDragging || isResizing ? "none" : "width 200ms ease-in-out, height 200ms ease-in-out",
      }}
    >
      {/* Resize handle — top-left corner */}
      {!isMinimized && (
        <div
          className="absolute top-0 left-0 z-10 flex items-center justify-center w-5 h-5 cursor-nw-resize text-zinc-300 hover:text-zinc-500 transition-colors"
          onMouseDown={onResizeMouseDown}
          title="Resize"
        >
          <GripHorizontal className="h-3 w-3 rotate-[-45deg]" />
        </div>
      )}

      {/* Header — drag handle */}
      <div
        className={cn(
          "p-3 border-b bg-zinc-50/80 backdrop-blur flex justify-between items-center select-none",
          "hover:bg-zinc-100/80 transition-colors",
          isDragging ? "cursor-grabbing" : "cursor-grab",
        )}
        onMouseDown={onHeaderMouseDown}
        onTouchStart={onHeaderTouchStart}
        onClick={handleHeaderClick}
      >
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-600" />
          AI Assistant
          <div className="text-xs text-muted-foreground font-normal" style={{ marginLeft: 4 }}>
            powered by <strong className="font-semibold">BioContextAI</strong>
          </div>
        </h3>
        <div className="flex items-center gap-1">
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
      {!isMinimized && (
        <>
          <div className="flex-1 p-4 space-y-4 overflow-y-auto text-sm bg-white">
            {messages.length === 0 && (
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded bg-purple-100 flex items-center justify-center shrink-0">
                  <Bot className="h-3 w-3 text-purple-700" />
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
                    <div className="h-6 w-6 rounded bg-zinc-200 flex items-center justify-center shrink-0">
                      <User className="h-3 w-3 text-zinc-700" />
                    </div>
                    <div className="bg-primary text-primary-foreground p-3 rounded-md rounded-tr-none">
                      <p>{textContent}</p>
                    </div>
                  </div>
                )
              }

              return (
                <div key={message.id} className="flex gap-3">
                  <div className="h-6 w-6 rounded bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-3 w-3 text-purple-700" />
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
                <div className="h-6 w-6 rounded bg-purple-100 flex items-center justify-center shrink-0">
                  <Bot className="h-3 w-3 text-purple-700" />
                </div>
                <div className="bg-muted p-3 rounded-md rounded-tl-none">
                  <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {messages.length > 0 && (
            <div className="flex justify-center border-t py-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 gap-1.5"
                onClick={() => setMessages([])}
              >
                <RotateCcw className="h-3 w-3" />
                Clear conversation
              </Button>
            </div>
          )}

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
      )}
    </Card>
  )
}
