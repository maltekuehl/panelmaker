"use client"

import { DEFAULT_REASONING_EFFORT, isReasoningEffort, type ReasoningEffort } from "@/models/chat/schema"
import { useSyncExternalStore } from "react"

const STORAGE_KEY = "panelmaker:chat-reasoning-effort"
const CHANGE_EVENT = "panelmaker:chat-reasoning-effort-change"

let sessionEffort: ReasoningEffort = DEFAULT_REASONING_EFFORT

function readStoredEffort(): ReasoningEffort {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return isReasoningEffort(stored) ? stored : sessionEffort
  } catch {
    return sessionEffort
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange)
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener("storage", onChange)
    window.removeEventListener(CHANGE_EVENT, onChange)
  }
}

function storeEffort(next: ReasoningEffort): void {
  sessionEffort = next
  try {
    window.localStorage.setItem(STORAGE_KEY, next)
  } catch {}
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

// A per-browser preference shared by the full chat page and the floating widget.
export function useReasoningEffort(): [ReasoningEffort, (effort: ReasoningEffort) => void] {
  const effort = useSyncExternalStore(subscribe, readStoredEffort, () => DEFAULT_REASONING_EFFORT)

  return [effort, storeEffort]
}
