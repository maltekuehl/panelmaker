import { useEffect, useRef, useState } from "react"

interface UseDebouncedSearchOptions {
  query: string
  enabled: boolean
  minLength?: number
  debounceMs?: number
  fetcher: (query: string) => Promise<Response>
  extractResults: (json: any) => any[]
}

export function useDebouncedSearch<T>({
  query,
  enabled,
  minLength = 2,
  debounceMs = 300,
  fetcher,
  extractResults,
}: UseDebouncedSearchOptions) {
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

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true)
      try {
        const res = await fetcher(query.trim())
        if (!res.ok) {
          setResults([])
          return
        }
        const data = await res.json()
        setResults(extractResults(data))
      } catch {
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, debounceMs)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query, enabled, minLength, debounceMs, fetcher, extractResults])

  return { results, isLoading, setResults }
}
