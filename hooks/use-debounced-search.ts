import { useEffect, useRef, useState } from "react"

interface UseDebouncedSearchOptions<T> {
  query: string
  enabled: boolean
  minLength?: number
  debounceMs?: number
  fetcher: (query: string, signal: AbortSignal) => Promise<Response>
  extractResults: (json: unknown) => T[]
}

export function useDebouncedSearch<T>({
  query,
  enabled,
  minLength = 2,
  debounceMs = 300,
  fetcher,
  extractResults,
}: UseDebouncedSearchOptions<T>) {
  const [results, setResults] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!enabled) return

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (query.trim().length < minLength) {
      setResults([])
      return
    }

    const controller = new AbortController()

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true)
      try {
        const res = await fetcher(query.trim(), controller.signal)
        if (controller.signal.aborted) return
        if (!res.ok) {
          setResults([])
          return
        }
        const data = await res.json()
        if (controller.signal.aborted) return
        setResults(extractResults(data))
      } catch {
        if (controller.signal.aborted) return
        setResults([])
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }, debounceMs)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      controller.abort()
    }
  }, [query, enabled, minLength, debounceMs, fetcher, extractResults])

  return { results, isLoading, setResults }
}
