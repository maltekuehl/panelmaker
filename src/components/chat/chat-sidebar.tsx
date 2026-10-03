"use client"

import { conversationUrl, createConversation, patchConversation } from "@/components/chat/conversation-api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import type { ConversationSummary } from "@/models/chat/transforms"
import clsx from "clsx"
import { Check, Edit2, Menu, MessageSquarePlus, Trash2, X } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

const formatRelativeDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  })
}

interface ConversationItemProps {
  conversation: ConversationSummary
  isActive: boolean
  isDisabled?: boolean
  onSelect: () => void
  onDelete: () => void
  onRename: (title: string) => void
}

const ConversationItem = ({
  conversation,
  isActive,
  isDisabled = false,
  onSelect,
  onDelete,
  onRename,
}: ConversationItemProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(conversation.title ?? "")
  const displayTitle = conversation.title?.trim() || "New conversation"

  const handleSaveTitle = () => {
    const next = editedTitle.trim()
    if (next && next !== conversation.title) {
      onRename(next)
    }
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditedTitle(conversation.title ?? "")
    setIsEditing(false)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") handleSaveTitle()
    else if (event.key === "Escape") handleCancelEdit()
  }

  return (
    <div
      className={clsx(
        "group relative w-full rounded-lg transition-colors",
        isDisabled && "opacity-50",
        isActive ? "bg-primary/10" : !isDisabled && "hover:bg-muted/50",
      )}
    >
      {isEditing ? (
        <div className="flex w-full items-center gap-1 p-3">
          <Input
            value={editedTitle}
            onChange={(event) => setEditedTitle(event.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            aria-label="Conversation title"
            className="h-7 flex-1 text-sm"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSaveTitle}
            aria-label="Save title"
            className="size-7 shrink-0 p-0"
          >
            <Check className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancelEdit}
            aria-label="Cancel renaming"
            className="size-7 shrink-0 p-0"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ) : (
        <>
          <Link
            href={`/chat/${conversation.id}`}
            aria-current={isActive ? "page" : undefined}
            aria-disabled={isDisabled || undefined}
            onClick={(event) => {
              event.preventDefault()
              if (isDisabled) return
              onSelect()
            }}
            className={clsx(
              "block w-full rounded-lg p-3 pr-16 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden",
              isDisabled && "cursor-not-allowed",
            )}
          >
            <div className="text-sm font-medium wrap-break-word">{displayTitle}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{formatRelativeDate(conversation.updatedAt)}</span>
              <span aria-hidden="true">|</span>
              <span>
                {conversation.messageCount} {conversation.messageCount === 1 ? "message" : "messages"}
              </span>
            </div>
          </Link>
          <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditedTitle(conversation.title ?? "")
                setIsEditing(true)
              }}
              aria-label={`Rename ${displayTitle}`}
              className="size-7 p-0"
            >
              <Edit2 className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              aria-label={`Delete ${displayTitle}`}
              className="size-7 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

interface ChatSidebarProps {
  conversations: ConversationSummary[]
  currentConversationId: string
  isStreaming?: boolean
}

export const ChatSidebarContent = ({
  conversations,
  currentConversationId,
  isStreaming = false,
  onClose,
}: ChatSidebarProps & { onClose?: () => void }) => {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const handleCreateNew = async () => {
    if (isStreaming || busy) return
    setBusy(true)
    try {
      const id = await createConversation()
      if (!id) {
        toast.error("Could not start a new conversation")
        return
      }
      onClose?.()
      router.push(`/chat/${id}`)
    } finally {
      setBusy(false)
    }
  }

  const handleSelect = (id: string) => {
    if (isStreaming || id === currentConversationId) {
      onClose?.()
      return
    }
    onClose?.()
    router.push(`/chat/${id}`)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this conversation? This cannot be undone.")) return
    const response = await fetch(conversationUrl(id), { method: "DELETE" })
    if (!response.ok) {
      toast.error("Could not delete conversation")
      return
    }
    if (id === currentConversationId) {
      const next = conversations.find((conversation) => conversation.id !== id)
      router.push(next ? `/chat/${next.id}` : "/chat")
    } else {
      router.refresh()
    }
  }

  const handleRename = async (id: string, title: string) => {
    const response = await patchConversation(id, { title })
    if (!response.ok) {
      toast.error("Could not rename conversation")
      return
    }
    router.refresh()
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-4">
      <Button onClick={handleCreateNew} className="w-full" size="sm" disabled={isStreaming || busy}>
        <MessageSquarePlus className="size-4" />
        New conversation
      </Button>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-1">
          {conversations.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No conversations yet. Start by sending a message.
            </p>
          ) : (
            conversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isActive={conversation.id === currentConversationId}
                isDisabled={isStreaming && conversation.id !== currentConversationId}
                onSelect={() => handleSelect(conversation.id)}
                onDelete={() => handleDelete(conversation.id)}
                onRename={(title) => handleRename(conversation.id, title)}
              />
            ))
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {conversations.length} {conversations.length === 1 ? "conversation" : "conversations"} saved to your account.
      </p>
    </div>
  )
}

export const ChatSidebarMobile = (props: ChatSidebarProps) => {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm">
          <Menu className="size-5" />
          Conversations
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0">
        <SheetHeader className="border-b p-4">
          <SheetTitle>Conversations</SheetTitle>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col p-4">
          <ChatSidebarContent {...props} onClose={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
