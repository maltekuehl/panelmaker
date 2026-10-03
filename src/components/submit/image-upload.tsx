"use client"

import { NotAvailable } from "@/components/shared/not-available"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { MAX_FOVS_PER_REPORT } from "@/models/experimental-report/schema"
import { ImagePlus, Loader2, Pencil, Trash2 } from "lucide-react"
import { useRef, useState } from "react"
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop"
import "react-image-crop/dist/ReactCrop.css"
import { toast } from "sonner"
import { displayColorName } from "./color-field"
import { FovDetails, type FovPeer } from "./fov-details"
import {
  cropToPng,
  fileToPreviewUrl,
  isSupportedImage,
  MAX_DIMENSION,
  MIN_DIMENSION,
  naturalRegion,
} from "./image-files"
import type { Fov, FovDraft, OntologyValue, RowImage } from "./types"

const ACCEPT = ".png,.jpg,.jpeg,.webp,.tiff,.tif"
const DEFAULT_MAX = MAX_FOVS_PER_REPORT

type DialogState = { stage: "crop"; preview: string } | { stage: "details"; isNew: boolean; draft: FovDraft } | null

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="min-w-0">
      <span className="text-muted-foreground">{label}: </span>
      {children}
    </span>
  )
}

export function ImageUpload({
  images,
  fovs,
  markerLabel,
  availableCellTypes,
  peers,
  invalid,
  max = DEFAULT_MAX,
  onSave,
  onRemove,
}: {
  images: RowImage[]
  fovs: Fov[]
  markerLabel: string
  availableCellTypes: OntologyValue[]
  peers: FovPeer[]
  invalid?: boolean
  max?: number
  onSave: (draft: FovDraft) => void
  onRemove: (url: string) => void
}) {
  const fovByUrl = new Map(fovs.map((f) => [f.url, f]))
  const cellTypeLabels = new Map(availableCellTypes.map((c) => [c.id, c.label]))
  const inputRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [dialog, setDialog] = useState<DialogState>(null)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [maxDisplay, setMaxDisplay] = useState<{ w: number; h: number }>()
  const [minDisplay, setMinDisplay] = useState<{ w: number; h: number }>()
  const [busy, setBusy] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const atMax = images.length >= max
  const preview = dialog?.stage === "crop" ? dialog.preview : null

  async function openFile(file: File) {
    if (!isSupportedImage(file)) {
      toast.error("Unsupported file. Supported formats: PNG, JPG, WebP, TIFF.")
      return
    }
    try {
      const url = await fileToPreviewUrl(file)
      setCrop(undefined)
      setCompletedCrop(undefined)
      setMaxDisplay(undefined)
      setMinDisplay(undefined)
      setDialog({ stage: "crop", preview: url })
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

  function releasePreview() {
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview)
  }

  function closeDialog() {
    releasePreview()
    setDialog(null)
    setBusy(false)
  }

  function peersShowing(url: string): FovPeer[] {
    return peers.filter((p) => p.images.some((im) => im.url === url))
  }

  function editImage(image: RowImage) {
    const fov = fovByUrl.get(image.url)
    if (!fov) return
    setDialog({
      stage: "details",
      isNew: false,
      draft: {
        url: fov.url,
        caption: fov.caption,
        references: fov.references,
        displayColor: image.displayColor,
        cellTypes: image.cellTypeIds.map((id) => ({ id, label: cellTypeLabels.get(id) ?? id })),
        sharedWith: peersShowing(fov.url).map((p) => p.key),
      },
    })
  }

  function saveDetails() {
    if (dialog?.stage !== "details") return
    onSave(dialog.draft)
    setDialog(null)
  }

  async function confirmCrop() {
    const img = imgRef.current
    if (!img || !completedCrop || completedCrop.width < 1 || completedCrop.height < 1) {
      toast.error("Select a region to crop.")
      return
    }
    setBusy(true)
    try {
      const region = naturalRegion(img, completedCrop)
      if (region.width < MIN_DIMENSION || region.height < MIN_DIMENSION) {
        toast.error(`The cropped region must be at least ${MIN_DIMENSION}x${MIN_DIMENSION}px.`)
        return
      }
      const blob = await cropToPng(img, region)

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
      releasePreview()
      setDialog({
        stage: "details",
        isNew: true,
        draft: {
          url,
          caption: "",
          references: [],
          displayColor: "",
          cellTypes: availableCellTypes,
          sharedWith: [],
        },
      })
    } catch {
      toast.error("Could not process the image. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={handleFile} />

      {images.length > 0 && (
        <ul className="divide-y rounded-md border">
          {images.map((image, index) => {
            const fov = fovByUrl.get(image.url)
            if (!fov) return null
            const colour = displayColorName(image.displayColor)
            const sharedWith = peersShowing(image.url).map((p) => p.label)
            const counterstains = fov.references.map((r) => r.label.trim()).filter(Boolean)
            const cellTypes = image.cellTypeIds.map((id) => cellTypeLabels.get(id)).filter(Boolean)
            return (
              <li key={image.url} className="flex items-center gap-4 p-3">
                <div className="size-16 shrink-0 overflow-hidden rounded-md border bg-muted/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={fov.url} alt={`Image ${index + 1}`} className="size-full object-cover" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-medium">Image {index + 1}</p>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
                    <Fact label="Colour">{colour ?? <NotAvailable />}</Fact>
                    <Fact label="Also shows">{sharedWith.length > 0 ? sharedWith.join(", ") : <NotAvailable />}</Fact>
                    <Fact label="Counterstains">
                      {counterstains.length > 0 ? counterstains.join(", ") : <NotAvailable />}
                    </Fact>
                    <Fact label="Cell types">{cellTypes.length > 0 ? cellTypes.join(", ") : <NotAvailable />}</Fact>
                  </div>
                  {fov.caption.trim() && <p className="truncate text-xs text-muted-foreground">{fov.caption}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button type="button" variant="outline" size="sm" onClick={() => editImage(image)}>
                    <Pencil className="size-4" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemove(image.url)}
                    title={sharedWith.length > 0 ? "Remove this image from every antibody" : "Remove image"}
                  >
                    <Trash2 className="size-4" />
                    <span className="sr-only">Remove image</span>
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
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
            {dragActive ? "Drop image to add" : `Add image${images.length > 0 ? ` (${images.length}/${max})` : ""}`}
          </span>
          <span className="text-xs">
            Drag and drop or click. PNG, JPG, WebP or TIFF. Crop to {MIN_DIMENSION} to {MAX_DIMENSION}px per side.
          </span>
        </button>
      )}

      <Dialog open={dialog != null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {dialog?.stage === "details" && !dialog.isNew
                ? `Edit image of ${markerLabel}`
                : `Add image of ${markerLabel}`}
            </DialogTitle>
            <DialogDescription>
              {dialog?.stage === "crop"
                ? "Step 1 of 2: crop the field of view."
                : dialog?.isNew
                  ? "Step 2 of 2: describe what the image shows."
                  : "Describe what the image shows."}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {dialog?.stage === "crop" && (
              <div className="flex justify-center">
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
                  <img
                    ref={imgRef}
                    src={dialog.preview}
                    alt="Crop preview"
                    onLoad={onImageLoad}
                    className="max-h-[60vh]"
                  />
                </ReactCrop>
              </div>
            )}
            {dialog?.stage === "details" && (
              <FovDetails
                draft={dialog.draft}
                onChange={(draft) => setDialog({ ...dialog, draft })}
                markerLabel={markerLabel}
                peers={peers}
              />
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog} disabled={busy}>
              Cancel
            </Button>
            {dialog?.stage === "crop" ? (
              <Button type="button" onClick={confirmCrop} disabled={busy} className="min-w-32">
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                {busy ? "Uploading…" : "Next"}
              </Button>
            ) : (
              <Button type="button" onClick={saveDetails} className="min-w-32">
                Save image
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
