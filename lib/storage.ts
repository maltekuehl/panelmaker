import "server-only"

import { randomBytes } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"
import { env } from "./env"

export const MIN_DIMENSION = 256
export const MAX_DIMENSION = 4084
export const MAX_UPLOAD_BYTES = 80 * 1024 * 1024
export const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/tiff"] as const

export class ImageTooLargeError extends Error {
  constructor(width: number, height: number) {
    super(
      `Image is ${width}x${height}px. Each side must be at most ${MAX_DIMENSION}px. Crop the image before uploading.`,
    )
    this.name = "ImageTooLargeError"
  }
}

export class ImageTooSmallError extends Error {
  constructor(width: number, height: number) {
    super(`Image is ${width}x${height}px. Each side must be at least ${MIN_DIMENSION}px.`)
    this.name = "ImageTooSmallError"
  }
}

export class InvalidImageError extends Error {
  constructor(message = "The uploaded file is not a valid image.") {
    super(message)
    this.name = "InvalidImageError"
  }
}

export function getUploadsDir(): string {
  return path.resolve(process.cwd(), env.UPLOADS_DIR ?? "./data/uploads")
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
  return path.join(getUploadsDir(), base)
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
    throw new ImageTooLargeError(width, height)
  }
  if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
    throw new ImageTooSmallError(width, height)
  }

  const output = await pipeline.webp({ lossless: true }).toBuffer()

  const filename = `${randomBytes(16).toString("hex")}.webp`
  const dir = await ensureUploadsDir()
  await writeFile(path.join(dir, filename), output)

  return { url: `/uploads/${filename}`, filename }
}
