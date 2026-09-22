// Minimal RFC 4180 reader for the committed IBEX tables. The upstream files quote any field that
// contains a comma (captions do) and escape a quote by doubling it.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let quoted = false
  let i = 0
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text

  const endField = (): void => {
    row.push(field)
    field = ""
  }
  const endRow = (): void => {
    endField()
    if (row.length > 1 || row[0] !== "") rows.push(row)
    row = []
  }

  while (i < input.length) {
    const char = input[i]
    if (quoted) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        quoted = false
        i += 1
        continue
      }
      field += char
      i += 1
      continue
    }
    if (char === '"') {
      quoted = true
      i += 1
      continue
    }
    if (char === ",") {
      endField()
      i += 1
      continue
    }
    if (char === "\r") {
      i += 1
      continue
    }
    if (char === "\n") {
      endRow()
      i += 1
      continue
    }
    field += char
    i += 1
  }
  if (field !== "" || row.length > 0) endRow()
  return rows
}

export function parseCsvRecords(text: string): Record<string, string>[] {
  const rows = parseCsv(text)
  if (rows.length === 0) return []
  const header = rows[0].map((h) => h.trim())
  return rows.slice(1).map((cells) => {
    const record: Record<string, string> = {}
    header.forEach((name, index) => {
      record[name] = (cells[index] ?? "").trim()
    })
    return record
  })
}
