"use client"

import { useState } from "react"
import { toast } from "sonner"

interface ApiRequestOptions {
  url: string
  method: "POST" | "PATCH" | "PUT" | "DELETE"
  body?: unknown
  errorMessage: string
  holdPendingOnSuccess?: boolean
}

export function useApiRequest<K = true>() {
  const [pending, setPending] = useState<K | null>(null)

  async function request<T = Record<string, unknown>>(
    key: K,
    { url, method, body, errorMessage, holdPendingOnSuccess = false }: ApiRequestOptions,
  ): Promise<T | null> {
    setPending(key)
    let succeeded = false
    try {
      const res = await fetch(
        url,
        body === undefined
          ? { method }
          : { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || errorMessage)
        return null
      }
      succeeded = true
      return data as T
    } catch {
      toast.error("Something went wrong")
      return null
    } finally {
      if (!succeeded || !holdPendingOnSuccess) setPending(null)
    }
  }

  return { pending, request }
}
