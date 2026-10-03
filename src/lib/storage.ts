import "server-only"

import { randomBytes } from "node:crypto"
import { mkdir, unlink, writeFile } from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"
import { env } from "./env"
import { UnprocessableError } from "./error-handling"

export const MIN_DIMENSION = 256
export const MAX_DIMENSION = 4084
export const MAX_UPLOAD_BYTES = 80 * 1024 * 1024
export const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/tiff"] as const

class InvalidImageError extends UnprocessableError {
  constructor(message = "The uploaded file is not a valid image.") {
    super(message)
    this.name = "InvalidImageError"
  }
}

export function getUploadsDir(): string {
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), env.UPLOADS_DIR)
}

async function ensureUploadsDir(): Promise<string> {
  const dir = getUploadsDir()
  await mkdir(dir, { recursive: true })
  return dir
}

export function resolveUploadPath(filename: string): string {
  const base = path.basename(filename)
  if (base !== filename || base.includes("..") || base.includes("/") || base.includes("\\")) {
    throw new InvalidImageError("Invalid file name.")
  }
  return path.join(/*turbopackIgnore: true*/ getUploadsDir(), base)
}

export async function saveUploadedImage(buffer: Buffer): Promise<{ url: string; filename: string }> {
  let pipeline: sharp.Sharp
  let width: number | undefined
  let height: number | undefined

  try {
    pipeline = sharp(buffer, { failOn: "error" }).rotate()
    const metadata = await pipeline.metadata()
    width = metadata.width
    height = metadata.height
  } catch {
    throw new InvalidImageError()
  }

  if (!width || !height) {
    throw new InvalidImageError()
  }
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    throw new InvalidImageError(
      `Image is ${width}x${height}px. Each side must be at most ${MAX_DIMENSION}px. Crop the image before uploading.`,
    )
  }
  if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
    throw new InvalidImageError(`Image is ${width}x${height}px. Each side must be at least ${MIN_DIMENSION}px.`)
  }

  const output = await pipeline.webp({ lossless: true }).toBuffer()

  const filename = `${randomBytes(16).toString("hex")}.webp`
  const dir = await ensureUploadsDir()
  await writeFile(path.join(/*turbopackIgnore: true*/ dir, filename), output)

  return { url: `/uploads/${filename}`, filename }
}

// Accepts either the stored filename or the public `/uploads/<name>` url. Missing files are ignored
// so callers can delete a record whose file was already swept.
export async function deleteUploadedImage(filenameOrUrl: string): Promise<void> {
  const filename = filenameOrUrl.startsWith("/uploads/") ? filenameOrUrl.slice("/uploads/".length) : filenameOrUrl
  try {
    await unlink(resolveUploadPath(filename))
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") throw error
  }
}
