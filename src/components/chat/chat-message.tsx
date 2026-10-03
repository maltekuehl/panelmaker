"use client"

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
import { Textarea } from "@/components/ui/textarea"
import clsx from "clsx"
import { ArrowUp, Check, Copy, Edit2, Trash2, X } from "lucide-react"
import { useEffect, useState, type ReactNode } from "react"

export function ChatMessage({
  role,
  author,
  message,
  rawContent,
  onDelete,
  onRegenerateFromHere,
  compact = false,
}: {
  role: "user" | "assistant"
  author?: string
  message: ReactNode
  rawContent?: string
  onDelete?: () => void
  onRegenerateFromHere?: (newContent: string) => void
  compact?: boolean
}) {
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
        <div
          className={clsx(
            "flex flex-row gap-1 opacity-0 transition-opacity group-hover:opacity-100",
            compact ? "pt-1" : "pt-7.5",
          )}
        >
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

      <div
        className={clsx(
          "flex min-w-0 flex-col",
          compact ? "mb-2" : "mb-4",
          isBot ? "w-full items-start" : "max-w-[85%] items-end",
        )}
      >
        {!compact && author && <span className="mb-1 px-1 text-xs font-medium text-muted-foreground">{author}</span>}
        <div
          className={clsx(
            "relative w-full max-w-full duration-300 animate-in fade-in",
            isBot
              ? "text-foreground"
              : isEditing
                ? "rounded-2xl bg-muted/40 p-2 text-foreground"
                : compact
                  ? "rounded-2xl rounded-br-sm bg-primary px-3 py-1.5 text-primary-foreground"
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
              <div className={compact ? "text-[13px] leading-5" : "text-sm leading-6"}>{message}</div>
            </div>
          )}
        </div>
        {rawContent && !isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className={clsx("px-2 text-xs", compact ? "h-5 text-muted-foreground" : "mt-1 h-6")}
            aria-label="Copy message to clipboard"
          >
            {copied ? <Check className="size-3!" /> : <Copy className="size-3!" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </Button>
        )}
      </div>

      {isBot && onDelete && (
        <div
          className={clsx(
            "flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100",
            compact ? "pt-1" : "pt-7.5",
          )}
        >
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
