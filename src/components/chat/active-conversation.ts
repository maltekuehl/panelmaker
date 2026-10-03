"use client"

const STORAGE_KEY = "panelmaker:active-conversation"

// The conversation last opened on the full chat page, so the floating widget follows it instead of
// guessing from the most recently updated thread.
export function readActiveConversationId(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function storeActiveConversationId(id: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, id)
  } catch {}
}

export function isActiveConversationEvent(event: StorageEvent): boolean {
  return event.key === STORAGE_KEY
}
