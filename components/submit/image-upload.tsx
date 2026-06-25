"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { Check, ImagePlus, Loader2, Plus, X } from "lucide-react"
import { useRef, useState } from "react"
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop"
import "react-image-crop/dist/ReactCrop.css"
import { toast } from "sonner"
import * as UTIF from "utif2"
import type { OntologyValue, ReportImageInput } from "./types"

const MIN_DIMENSION = 256
const MAX_DIMENSION = 4084
const ACCEPT = ".png,.jpg,.jpeg,.webp,.tiff,.tif"
const DEFAULT_MAX = 6

async function fileToPreviewUrl(file: File): Promise<string> {
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

export function ImageUpload({
  value,
  onChange,
  availableCellTypes,
  invalid,
  max = DEFAULT_MAX,
}: {
  value: ReportImageInput[]
  onChange: (images: ReportImageInput[]) => void
  availableCellTypes: OntologyValue[]
  invalid?: boolean
  max?: number
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [maxDisplay, setMaxDisplay] = useState<{ w: number; h: number }>()
  const [minDisplay, setMinDisplay] = useState<{ w: number; h: number }>()
  const [busy, setBusy] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const atMax = value.length >= max

  async function openFile(file: File) {
    if (!/\.(png|jpe?g|webp|tiff?)$/i.test(file.name) && !/^image\//.test(file.type)) {
      toast.error("Unsupported file. Supported formats: PNG, JPG, WebP, TIFF.")
      return
    }
    try {
      const url = await fileToPreviewUrl(file)
      setCrop(undefined)
      setCompletedCrop(undefined)
      setMaxDisplay(undefined)
      setMinDisplay(undefined)
      setPreview(url)
    } catch {
      toast.error("Could not read that image. Supported formats: PNG, JPG, WebP, TIFF.")
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (file) await openFile(file)
  }

  async function handleDrop(e: React.DragEvent<HTMLButtonElement>) {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) await openFile(file)
  }

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget

    if (img.naturalWidth < MIN_DIMENSION || img.naturalHeight < MIN_DIMENSION) {
      toast.error(
        `Image must be at least ${MIN_DIMENSION}x${MIN_DIMENSION}px (this one is ${img.naturalWidth}x${img.naturalHeight}px).`,
      )
      closeDialog()
      return
    }

    const scaleX = img.naturalWidth / img.width
    const scaleY = img.naturalHeight / img.height
    const maxW = MAX_DIMENSION / scaleX
    const maxH = MAX_DIMENSION / scaleY
    setMaxDisplay({ w: maxW, h: maxH })
    setMinDisplay({ w: MIN_DIMENSION / scaleX, h: MIN_DIMENSION / scaleY })

    const w = Math.min(img.width, maxW)
    const h = Math.min(img.height, maxH)
    const initial: PixelCrop = {
      unit: "px",
      x: (img.width - w) / 2,
      y: (img.height - h) / 2,
      width: w,
      height: h,
    }
    setCrop(initial)
    setCompletedCrop(initial)
  }

  function closeDialog() {
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview)
    setPreview(null)
    setBusy(false)
  }

  async function confirmCrop() {
    const img = imgRef.current
    if (!img || !completedCrop || completedCrop.width < 1 || completedCrop.height < 1) {
      toast.error("Select a region to crop.")
      return
    }
    setBusy(true)
    try {
      const scaleX = img.naturalWidth / img.width
      const scaleY = img.naturalHeight / img.height
      const sx = Math.round(completedCrop.x * scaleX)
      const sy = Math.round(completedCrop.y * scaleY)
      const sw = Math.min(Math.round(completedCrop.width * scaleX), MAX_DIMENSION)
      const sh = Math.min(Math.round(completedCrop.height * scaleY), MAX_DIMENSION)

      if (sw < MIN_DIMENSION || sh < MIN_DIMENSION) {
        toast.error(`The cropped region must be at least ${MIN_DIMENSION}x${MIN_DIMENSION}px.`)
        return
      }

      const canvas = document.createElement("canvas")
      canvas.width = sw
      canvas.height = sh
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("No canvas context")
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"))
      if (!blob) throw new Error("Encoding failed")

      const formData = new FormData()
      formData.append("file", blob, "crop.png")
      const res = await fetch("/api/uploads", { method: "POST", body: formData })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error(body?.error ?? "Upload failed. Please try again.")
        return
      }
      const body = await res.json()
      const url: string | undefined = body?.url
      if (!url) {
        toast.error("Upload failed. Please try again.")
        return
      }
      onChange([...value, { url, cellTypeIds: availableCellTypes.map((c) => c.id) }])
      closeDialog()
    } catch {
      toast.error("Could not process the image. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  function setCellTypes(index: number, ids: string[]) {
    onChange(value.map((im, i) => (i === index ? { ...im, cellTypeIds: ids } : im)))
  }

  return (
    <div className="space-y-3">
      <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={handleFile} />

      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((image, index) => {
            const selected = new Set(image.cellTypeIds)
            function toggle(id: string) {
              const next = new Set(selected)
              if (next.has(id)) next.delete(id)
              else next.add(id)
              setCellTypes(index, [...next])
            }
            return (
              <div key={image.url} className="flex gap-3 rounded-lg border bg-card p-2.5">
                <div className="size-24 shrink-0 overflow-hidden rounded-md border bg-muted/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt={`Staining image ${index + 1}`} className="size-full object-cover" />
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium">Cell types shown in this image</p>
                    <div className="flex shrink-0 items-center gap-1">
                      {availableCellTypes.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setCellTypes(
                                index,
                                availableCellTypes.map((c) => c.id),
                              )
                            }
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            All
                          </button>
                          <span className="text-xs text-muted-foreground">/</span>
                          <button
                            type="button"
                            onClick={() => setCellTypes(index, [])}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            None
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => onChange(value.filter((_, i) => i !== index))}
                        className="ml-1 rounded-full p-0.5 text-muted-foreground transition-colors hover:text-destructive"
                        title="Remove image"
                      >
                        <X className="size-4" />
                        <span className="sr-only">Remove image</span>
                      </button>
                    </div>
                  </div>

                  {availableCellTypes.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {availableCellTypes.map((ct) => {
                        const on = selected.has(ct.id)
                        return (
                          <button
                            key={ct.id}
                            type="button"
                            onClick={() => toggle(ct.id)}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
                              on
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground",
                            )}
                          >
                            {on ? <Check className="size-3" /> : <Plus className="size-3" />}
                            <span className="max-w-[14rem] truncate">{ct.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Add cell types for this antibody above to tag which ones this image shows. Untagged images still
                      appear on the antibody page.
                    </p>
                  )}

                  {availableCellTypes.length > 0 && selected.size === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Untagged. This image will not appear on any cell type page.
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!atMax && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed py-5 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground",
            dragActive && "border-primary bg-primary/5 text-foreground",
            invalid && "border-destructive text-destructive",
          )}
        >
          <ImagePlus className="size-5" />
          <span>
            {dragActive ? "Drop image to add" : `Add image${value.length > 0 ? ` (${value.length}/${max})` : ""}`}
          </span>
          <span className="text-xs">
            Drag and drop or click. PNG, JPG, WebP or TIFF. Crop to {MIN_DIMENSION} to {MAX_DIMENSION}px per side.
          </span>
        </button>
      )}

      <Dialog open={preview != null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Crop image</DialogTitle>
          </DialogHeader>
          <div className="flex max-h-[60vh] justify-center overflow-auto">
            {preview && (
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                minWidth={minDisplay?.w}
                minHeight={minDisplay?.h}
                maxWidth={maxDisplay?.w}
                maxHeight={maxDisplay?.h}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img ref={imgRef} src={preview} alt="Crop preview" onLoad={onImageLoad} />
              </ReactCrop>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" onClick={confirmCrop} disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Add image"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
