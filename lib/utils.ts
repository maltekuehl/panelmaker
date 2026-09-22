import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a URL-friendly slug from a string
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .trim()
    .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
}

/**
 * Canonical RRID form used across submissions, lab inventory and /antibody links:
 * "ab 123", "AB-123" and "RRID:AB_123" all normalize to "RRID:AB_123". Returns "" for empty input.
 */
export function normalizeRrid(value: string): string {
  const id = value
    .trim()
    .replace(/^rrid:/i, "")
    .replace(/[\s-]/g, "_")
    .toUpperCase()
  return id ? `RRID:${id}` : ""
}
