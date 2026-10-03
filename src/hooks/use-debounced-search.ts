import { useEffect, useState } from "react"

export type SearchParams = Record<string, string | undefined>

interface UseDebouncedSearchOptions {
  endpoint: string
  params?: SearchParams
  resultsKey: string
  query: string
  enabled: boolean
  minLength?: number
  debounceMs?: number
}

export function useDebouncedSearch<T>({
  endpoint,
  params,
  resultsKey,
  query,
  enabled,
  minLength = 2,
  debounceMs = 300,
}: UseDebouncedSearchOptions) {
  const [results, setResults] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const paramsKey = JSON.stringify(params ?? {})

  useEffect(() => {
    if (!enabled) return

    const term = query.trim()
    if (term.length < minLength) {
      setResults([])
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setIsLoading(true)
      try {
        const search = new URLSearchParams({ ...(JSON.parse(paramsKey) as Record<string, string>), q: term })
        const res = await fetch(`${endpoint}?${search}`, { signal: controller.signal })
        const data = res.ok ? ((await res.json()) as Record<string, T[] | undefined>) : null
        if (!controller.signal.aborted) setResults(data?.[resultsKey] ?? [])
      } catch {
        if (!controller.signal.aborted) setResults([])
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }, debounceMs)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [endpoint, paramsKey, resultsKey, query, enabled, minLength, debounceMs])

  return { results, isLoading }
}
