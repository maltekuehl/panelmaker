"use client"

import { FloatingConversation } from "@/components/chat/floating-conversation"
import { useFloatingCard } from "@/components/chat/use-floating-card"
import { useFloatingThread } from "@/components/chat/use-floating-thread"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronUp, ExternalLink, GripHorizontal, Loader2, Sparkles, X } from "lucide-react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

export function AIAssistantFloating() {
  const [isOpen, setIsOpen] = useState(false)
  const { data: session } = useSession()
  const pathname = usePathname()
  const isOnChatPage = pathname.startsWith("/chat")

  const { conversationId, initialMessages, release } = useFloatingThread({
    isOpen,
    isOnChatPage,
    userId: session?.user?.id,
  })
  const {
    cardRef,
    style,
    isMinimized,
    isDragging,
    toggleMinimized,
    handleHeaderClick,
    onHeaderMouseDown,
    onHeaderTouchStart,
    onResizeMouseDown,
  } = useFloatingCard(isOpen)

  const handleClose = () => {
    setIsOpen(false)
    release()
  }

  // The /chat page already owns this conversation; a second live store over it would go stale.
  if (!session?.user || isOnChatPage || pathname.startsWith("/submit")) {
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
      style={style}
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
              toggleMinimized()
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
