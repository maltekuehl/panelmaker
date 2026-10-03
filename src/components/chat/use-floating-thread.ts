"use client"

import {
  isActiveConversationEvent,
  readActiveConversationId,
  storeActiveConversationId,
} from "@/components/chat/active-conversation"
import { conversationUrl, createConversation } from "@/components/chat/conversation-api"
import type { UIMessage } from "ai"
import { useCallback, useEffect, useRef, useState } from "react"

async function resolveConversationId(): Promise<string | undefined> {
  const listResponse = await fetch("/api/chat/conversations")
  const listJson = await listResponse.json()
  const conversations = (listJson?.conversations ?? []) as { id: string; updatedAt: string }[]
  const activeId = readActiveConversationId()
  const mostRecent = [...conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
  const existing = conversations.some((conversation) => conversation.id === activeId) ? activeId : mostRecent?.id
  return existing ?? (await createConversation())
}

// The thread the floating widget shows: the conversation last opened on /chat, or else the most
// recently updated one, created on demand. The thread is shared with /chat and persisted server-side,
// so it is re-read on every open instead of replaying a stale snapshot.
export function useFloatingThread({
  isOpen,
  isOnChatPage,
  userId,
}: {
  isOpen: boolean
  isOnChatPage: boolean
  userId: string | undefined
}) {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([])
  const loadStartedRef = useRef(false)

  const reset = useCallback(() => {
    setConversationId(null)
    setInitialMessages([])
  }, [])

  // The /chat page owns the thread while it is shown and may switch, edit or delete it. Dropping the
  // loaded copy there makes the widget re-resolve and refetch once the user navigates away.
  const [wasOnChatPage, setWasOnChatPage] = useState(isOnChatPage)
  if (isOnChatPage !== wasOnChatPage) {
    setWasOnChatPage(isOnChatPage)
    if (isOnChatPage) reset()
  }

  // Another tab switching conversations on /chat makes this widget's thread the wrong one.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (!isActiveConversationEvent(event) || event.newValue === conversationId) return
      reset()
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [conversationId, reset])

  useEffect(() => {
    if (isOnChatPage || !conversationId) loadStartedRef.current = false
    if (isOnChatPage || !isOpen || !userId || conversationId || loadStartedRef.current) return
    loadStartedRef.current = true
    let cancelled = false
    ;(async () => {
      try {
        const id = await resolveConversationId()
        if (!id) throw new Error("Could not resolve a conversation")
        const conversationResponse = await fetch(conversationUrl(id))
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
  }, [isOpen, isOnChatPage, userId, conversationId])

  // Closing drops the loaded thread so the next open refetches it. Minimizing deliberately keeps it.
  const release = useCallback(() => {
    reset()
    loadStartedRef.current = false
  }, [reset])

  return { conversationId, initialMessages, release }
}
