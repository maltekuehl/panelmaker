"use client"

import { useCallback, useEffect, useRef } from "react"

const PINNED_THRESHOLD_PX = 48

function scrollToBottom() {
  window.scrollTo({ top: document.documentElement.scrollHeight })
}

export function useStickToWindowBottom(content: unknown): () => void {
  const pinned = useRef(true)

  useEffect(() => {
    const updatePinned = () => {
      const { scrollHeight } = document.documentElement
      pinned.current = scrollHeight - window.scrollY - window.innerHeight < PINNED_THRESHOLD_PX
    }
    window.addEventListener("scroll", updatePinned, { passive: true })
    return () => window.removeEventListener("scroll", updatePinned)
  }, [])

  useEffect(() => {
    if (pinned.current) scrollToBottom()
  }, [content])

  return useCallback(() => {
    pinned.current = true
  }, [])
}
