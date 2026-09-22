// Shared JSON fetch for the external reference APIs (OLS4, NCBI, SciCrunch, UniProt, Ensembl, HPA).
//
// Every external call gets a hard timeout: report submission awaits several of them in series, and
// without one a slow upstream holds the request open until the proxy gives up.
//
// Deliberately NOT `server-only`: lib/integrations/scicrunch.ts is also used by the offline seed
// script (scripts/lookup-pathoplex-antibodies.ts).
export const EXTERNAL_FETCH_TIMEOUT_MS = 8000

export type FetchJsonInit = RequestInit & { next?: { revalidate?: number | false; tags?: string[] } }

export async function fetchJson<T>(
  url: string,
  init: FetchJsonInit = {},
  timeoutMs = EXTERNAL_FETCH_TIMEOUT_MS,
): Promise<T | null> {
  try {
    const response = await fetch(url, { ...init, signal: init.signal ?? AbortSignal.timeout(timeoutMs) })
    if (!response.ok) return null
    return (await response.json()) as T
  } catch {
    return null
  }
}
