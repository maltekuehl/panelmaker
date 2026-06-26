"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import clsx from "clsx"
import { Check, Edit2, Menu, MessageSquarePlus, Trash2, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

// Local mirror of the server ConversationSummary shape (client components never import the model barrel).
export interface ConversationListItem {
  id: string
  title: string | null
  messageCount: number
  updatedAt: string
}

const formatDate = (dateString: string) => {
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
  conversation: ConversationListItem
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
        "group relative rounded-lg p-3 transition-colors w-full",
        isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        isActive ? "bg-primary/10" : !isDisabled && "hover:bg-muted/50",
      )}
      onClick={isDisabled ? undefined : onSelect}
    >
      {isEditing ? (
        <div className="flex items-center gap-1 w-full" onClick={(event) => event.stopPropagation()}>
          <Input
            value={editedTitle}
            onChange={(event) => setEditedTitle(event.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="h-7 text-sm flex-1"
          />
          <Button variant="ghost" size="sm" onClick={handleSaveTitle} className="h-7 w-7 p-0 shrink-0">
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleCancelEdit} className="h-7 w-7 p-0 shrink-0">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div className="w-full pr-16">
          <div className="font-medium text-sm wrap-break-word">{displayTitle}</div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
            <span>{formatDate(conversation.updatedAt)}</span>
            <span>•</span>
            <span>
              {conversation.messageCount} {conversation.messageCount === 1 ? "message" : "messages"}
            </span>
          </div>
          <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={(event) => {
                event.stopPropagation()
                setEditedTitle(conversation.title ?? "")
                setIsEditing(true)
              }}
              className="h-7 w-7 p-0"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(event) => {
                event.stopPropagation()
                onDelete()
              }}
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

interface ChatSidebarProps {
  conversations: ConversationListItem[]
  currentConversationId: string
  isStreaming?: boolean
}

const ChatSidebarContent = ({
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
      const response = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      })
      const json = await response.json()
      const id = json?.conversation?.id as string | undefined
      onClose?.()
      if (id) router.push(`/chat/${id}`)
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
    await fetch(`/api/chat/conversations/${id}`, { method: "DELETE" })
    if (id === currentConversationId) {
      const next = conversations.find((conversation) => conversation.id !== id)
      router.push(next ? `/chat/${next.id}` : "/chat")
    } else {
      router.refresh()
    }
  }

  const handleRename = async (id: string, title: string) => {
    await fetch(`/api/chat/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    })
    router.refresh()
  }

  return (
    <div className="flex h-full flex-col w-full">
      <div className="p-4 border-b">
        <Button onClick={handleCreateNew} className="w-full" size="sm" disabled={isStreaming || busy}>
          <MessageSquarePlus className="h-4 w-4" />
          New conversation
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-2 flex flex-col gap-1">
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

      <div className="pt-4 px-4 border-t">
        <div className="text-xs text-muted-foreground text-center">
          {conversations.length} {conversations.length === 1 ? "conversation" : "conversations"} saved to your account.
        </div>
      </div>
    </div>
  )
}

export const ChatSidebarMobile = (props: ChatSidebarProps) => {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm">
          <Menu className="h-5 w-5" />
          Conversations
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>Conversations</SheetTitle>
        </SheetHeader>
        <ChatSidebarContent {...props} onClose={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}

export const ChatSidebarDesktop = (props: ChatSidebarProps) => {
  return (
    <div className="hidden lg:flex w-80 border-r bg-background">
      <ChatSidebarContent {...props} />
    </div>
  )
}
