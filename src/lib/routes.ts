import { normalizeRrid } from "@/lib/utils"

export function antibodyHref(rrid: string | null | undefined): string | null {
  const normalized = normalizeRrid(rrid ?? "")
  return normalized ? `/antibody/${normalized.slice("RRID:".length)}` : null
}

export function markerHref(uniprotId: string): string {
  return `/marker/${uniprotId}`
}

export function cellTypeHref(id: string): string {
  return `/celltype/${id}`
}

export function conditionHref(id: string): string {
  return `/condition/${id}`
}

export function profileHref(userId: string): string {
  return `/profile/${userId}`
}

export function signInUrl(callbackPath: string): string {
  return `/signin?callbackUrl=${encodeURIComponent(callbackPath)}`
}
