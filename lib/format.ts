const SHORT_DATE: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }
const LONG_DATE: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" }

export function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString("en-US", SHORT_DATE)
}

export function formatLongDate(value: string | Date): string {
  return new Date(value).toLocaleDateString("en-US", LONG_DATE)
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return "?"
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}
