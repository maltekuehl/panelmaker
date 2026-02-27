import "server-only"

type HPASearchEntry = {
  "Gene": string
  "Reliability (IH)": string
  "Tissue expression": string
  "Subcellular location": string
  "Antibody": string
}

export type HPATissueExpression = {
  tissue: string
  level: "Not detected" | "Low" | "Medium" | "High"
  cellType?: string
}

export type HPAResult = {
  gene: string
  reliability: string
  tissueExpression: HPATissueExpression[]
  subcellularLocation?: string[]
  antibodies?: string[]
}

const VALID_LEVELS = new Set(["Not detected", "Low", "Medium", "High"])

function parseLevel(raw: string): "Not detected" | "Low" | "Medium" | "High" {
  const trimmed = raw.trim()
  if (VALID_LEVELS.has(trimmed)) {
    return trimmed as "Not detected" | "Low" | "Medium" | "High"
  }
  return "Not detected"
}

function parseTissueExpression(raw: string): HPATissueExpression[] {
  if (!raw) return []

  return raw
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const colonIdx = entry.indexOf(":")
      if (colonIdx === -1) {
        return { tissue: entry, level: parseLevel("Not detected") }
      }
      const tissue = entry.slice(0, colonIdx).trim()
      const levelPart = entry.slice(colonIdx + 1).trim()
      return { tissue, level: parseLevel(levelPart) }
    })
}

function parseDelimitedList(raw: string): string[] {
  if (!raw) return []
  return raw
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
}

export async function lookupHPA(geneSymbol: string): Promise<HPAResult | null> {
  try {
    const columns = encodeURIComponent("g,ie,sl,ab")
    const response = await fetch(
      `https://www.proteinatlas.org/api/search_download.php?search=${encodeURIComponent(geneSymbol)}&format=json&columns=${columns}&compress=no`,
      {
        next: { revalidate: 86400 },
      },
    )

    if (!response.ok) {
      return null
    }

    const results: HPASearchEntry[] = await response.json()

    if (!Array.isArray(results) || results.length === 0) {
      return null
    }

    const entry = results.find((r) => r.Gene?.toUpperCase() === geneSymbol.toUpperCase()) ?? results[0]

    return {
      gene: entry.Gene,
      reliability: entry["Reliability (IH)"] ?? "",
      tissueExpression: parseTissueExpression(entry["Tissue expression"] ?? ""),
      subcellularLocation: parseDelimitedList(entry["Subcellular location"] ?? ""),
      antibodies: parseDelimitedList(entry.Antibody ?? ""),
    }
  } catch {
    return null
  }
}
