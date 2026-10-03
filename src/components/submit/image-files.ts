import * as UTIF from "utif2"

export const MIN_DIMENSION = 256
export const MAX_DIMENSION = 4084

export function isSupportedImage(file: File): boolean {
  return /\.(png|jpe?g|webp|tiff?)$/i.test(file.name) || /^image\//.test(file.type)
}

export async function fileToPreviewUrl(file: File): Promise<string> {
  const isTiff = /\.tiff?$/i.test(file.name) || file.type === "image/tiff"
  if (!isTiff) return URL.createObjectURL(file)

  const buffer = await file.arrayBuffer()
  const ifds = UTIF.decode(buffer)
  if (!ifds.length) throw new Error("Empty TIFF")
  UTIF.decodeImage(buffer, ifds[0])
  const rgba = UTIF.toRGBA8(ifds[0])
  const { width, height } = ifds[0]

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("No canvas context")
  ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), width, height), 0, 0)
  return canvas.toDataURL("image/png")
}

export type PixelRegion = { x: number; y: number; width: number; height: number }

export function naturalRegion(img: HTMLImageElement, crop: PixelRegion): PixelRegion {
  const scaleX = img.naturalWidth / img.width
  const scaleY = img.naturalHeight / img.height
  return {
    x: Math.round(crop.x * scaleX),
    y: Math.round(crop.y * scaleY),
    width: Math.min(Math.round(crop.width * scaleX), MAX_DIMENSION),
    height: Math.min(Math.round(crop.height * scaleY), MAX_DIMENSION),
  }
}

export async function cropToPng(img: HTMLImageElement, region: PixelRegion): Promise<Blob> {
  const canvas = document.createElement("canvas")
  canvas.width = region.width
  canvas.height = region.height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("No canvas context")
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(img, region.x, region.y, region.width, region.height, 0, 0, region.width, region.height)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"))
  if (!blob) throw new Error("Encoding failed")
  return blob
}
