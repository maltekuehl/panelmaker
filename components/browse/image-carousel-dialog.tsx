"use client"

import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, ImageIcon, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch"

export interface CarouselDetailValue {
  text: string
  href?: string
}

// One labelled row of the info table, e.g. "Cell types" with a linked value per cell type.
export interface CarouselDetail {
  label: string
  values: CarouselDetailValue[]
}

export interface CarouselChannel {
  label: string
  detail: string | null
  color: string | null
  role: "TARGET" | "NUCLEAR" | "STRUCTURAL"
  highlighted: boolean
}

export interface CarouselImage {
  src: string
  title?: string
  caption?: string | null
  details?: CarouselDetail[]
  channels?: CarouselChannel[]
}

const CHANNEL_SECTIONS: { role: CarouselChannel["role"]; title: string }[] = [
  { role: "TARGET", title: "Stains" },
  { role: "STRUCTURAL", title: "Structural reference" },
  { role: "NUCLEAR", title: "Nuclear counterstain" },
]

interface ImageCarouselDialogProps {
  images: Array<string | CarouselImage>
  title: string
  /** Custom trigger element (e.g. a compact table-cell thumbnail). Falls back to the large preview block. */
  trigger?: React.ReactNode
}

function toItem(image: string | CarouselImage): CarouselImage {
  return typeof image === "string" ? { src: image } : image
}

function ControlButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className="flex size-9 items-center justify-center rounded-md bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20"
    >
      {children}
      <span className="sr-only">{label}</span>
    </button>
  )
}

export function ImageCarouselDialog({ images, title, trigger }: ImageCarouselDialogProps) {
  const items = (images ?? []).map(toItem)
  const hasImages = items.length > 0
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)

  const count = items.length
  const current = items[index]
  const go = useCallback((next: number) => setIndex(() => (count ? (next + count) % count : 0)), [count])

  const activeThumbRef = useRef<HTMLButtonElement | null>(null)
  const nextSrc = count > 1 ? items[(index + 1) % count].src : undefined
  const prevSrc = count > 1 ? items[(index - 1 + count) % count].src : undefined

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") go(index - 1)
      if (e.key === "ArrowRight") go(index + 1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, index, go])

  useEffect(() => {
    if (!open) return
    activeThumbRef.current?.scrollIntoView({ block: "nearest", inline: "center" })
  }, [open, index])

  useEffect(() => {
    if (!open) return
    for (const src of [nextSrc, prevSrc]) {
      if (!src) continue
      const img = new window.Image()
      img.src = src
    }
  }, [open, nextSrc, prevSrc])

  // With nothing to show, the placeholder stays inert: a trigger here would open an empty lightbox.
  if (!hasImages) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-md border bg-muted/40 text-muted-foreground">
        <span className="flex flex-col items-center">
          <ImageIcon className="mb-2 size-8" />
          <span className="text-xs">No images</span>
        </span>
      </div>
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) setIndex(0)
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            className="group relative block w-full cursor-pointer overflow-hidden rounded-md border bg-muted/40 transition-colors hover:border-primary/50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={items[0].src}
              alt={`${title} preview`}
              className="mx-auto max-h-[28rem] w-auto max-w-full object-contain"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
              <span className="rounded-full bg-black/75 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                View gallery{count > 1 ? ` (${count})` : ""}
              </span>
            </div>
          </button>
        )}
      </DialogTrigger>

      <DialogContent
        showCloseButton={false}
        className="fixed inset-0 z-50 block h-screen w-screen max-w-none translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none border-0 bg-transparent p-0 ring-0 sm:max-w-none"
      >
        <DialogTitle className="sr-only">{title} images</DialogTitle>

        <div className="absolute inset-0">
          <TransformWrapper
            key={index}
            minScale={1}
            maxScale={8}
            centerOnInit
            doubleClick={{ mode: "toggle", step: 1.2 }}
            wheel={{ step: 0.01 }}
            panning={{ velocityDisabled: true }}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                <TransformComponent
                  wrapperStyle={{ width: "100%", height: "100%" }}
                  contentStyle={{ width: "100%", height: "100%" }}
                >
                  <div className="flex size-full items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={current.src}
                      alt={`${title} image ${index + 1}`}
                      className="max-h-screen max-w-full object-contain select-none"
                      draggable={false}
                    />
                  </div>
                </TransformComponent>

                <ImageInfo item={current} />
                <ImageCaption caption={current.caption} raised={count > 1} />

                <div className="absolute right-3 top-3 z-20 flex gap-1.5">
                  <ControlButton onClick={() => zoomIn()} label="Zoom in">
                    <ZoomIn className="size-4" />
                  </ControlButton>
                  <ControlButton onClick={() => zoomOut()} label="Zoom out">
                    <ZoomOut className="size-4" />
                  </ControlButton>
                  <ControlButton onClick={() => resetTransform()} label="Reset zoom">
                    <RotateCcw className="size-4" />
                  </ControlButton>
                  <DialogClose asChild>
                    <button
                      type="button"
                      title="Close"
                      className="flex size-9 items-center justify-center rounded-md bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20"
                    >
                      <X className="size-4" />
                      <span className="sr-only">Close</span>
                    </button>
                  </DialogClose>
                </div>
              </>
            )}
          </TransformWrapper>
        </div>

        {count > 1 && (
          <>
            <ControlButtonNav side="left" onClick={() => go(index - 1)} />
            <ControlButtonNav side="right" onClick={() => go(index + 1)} />
            <div className="absolute bottom-24 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs text-white">
              {index + 1} / {count}
            </div>
            <div className="absolute bottom-3 left-1/2 z-20 flex max-w-[95vw] -translate-x-1/2 gap-2 overflow-x-auto rounded-lg bg-black/60 p-2 backdrop-blur">
              {items.map((item, i) => (
                <button
                  key={`${item.src}-${i}`}
                  ref={i === index ? activeThumbRef : null}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={cn(
                    "size-14 shrink-0 overflow-hidden rounded border-2 transition-colors",
                    i === index ? "border-primary" : "border-transparent opacity-60 hover:opacity-100",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.src}
                    alt={`${title} thumbnail ${i + 1}`}
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover"
                  />
                </button>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// A caption is free prose the submitter wrote about one image, so it only exists for some images. In a
// full-bleed lightbox there is no column to keep aligned, so a missing one renders nothing rather than a
// "Not available" plate that would sit over the picture on every image that never had a caption.
function ImageCaption({ caption, raised }: { caption: string | null | undefined; raised: boolean }) {
  if (!caption?.trim()) return null

  return (
    <div
      className={cn(
        "absolute left-1/2 z-20 max-h-[30vh] w-[min(92vw,44rem)] -translate-x-1/2 overflow-y-auto rounded-lg bg-black/70 px-3 py-2 text-sm leading-relaxed text-white backdrop-blur",
        raised ? "bottom-32" : "bottom-3",
      )}
    >
      <p className="break-words whitespace-pre-wrap">{caption}</p>
    </div>
  )
}

function ChannelRow({ channel }: { channel: CarouselChannel }) {
  return (
    <li className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className={cn("text-sm break-words", channel.highlighted && "font-semibold")}>{channel.label}</p>
        {channel.detail && <p className="text-xs text-white/75">{channel.detail}</p>}
      </div>
      {channel.color && (
        <span
          aria-label={`Shown as ${channel.color}`}
          className="mt-1 size-3 shrink-0 rounded-full border border-white/40"
          style={{ backgroundColor: channel.color }}
        />
      )}
    </li>
  )
}

function ChannelLegend({ channels }: { channels: CarouselChannel[] }) {
  return (
    <div className="space-y-3 border-t border-white/25 pt-3">
      {CHANNEL_SECTIONS.map(({ role, title }) => {
        const rows = channels.filter((channel) => channel.role === role)
        if (rows.length === 0) return null
        return (
          <section key={role} className="space-y-1.5">
            <h3 className="text-[11px] font-medium tracking-wide text-white/75 uppercase">{title}</h3>
            <ul className="space-y-1.5">
              {rows.map((channel, index) => (
                <ChannelRow key={`${channel.label}-${index}`} channel={channel} />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function DetailsTable({ details }: { details: CarouselDetail[] }) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {details.map((detail) => (
          <tr key={detail.label} className="align-top">
            <th scope="row" className="py-1 pr-4 text-left text-xs font-normal whitespace-nowrap text-white/75">
              {detail.label}
            </th>
            <td className="py-1">
              <ul className="space-y-0.5">
                {detail.values.map((value) => (
                  <li key={`${value.text}-${value.href ?? ""}`} className="break-words">
                    {value.href ? (
                      <Link
                        href={value.href}
                        className="text-white underline decoration-white/40 underline-offset-2 hover:decoration-white"
                      >
                        {value.text}
                      </Link>
                    ) : (
                      value.text
                    )}
                  </li>
                ))}
              </ul>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ImageInfo({ item }: { item: CarouselImage }) {
  const details = item.details ?? []
  const channels = item.channels ?? []
  if (!item.title && details.length === 0 && channels.length === 0) return null

  return (
    <aside
      aria-label="Image details"
      className="absolute left-3 top-3 z-20 max-h-[calc(100vh-12rem)] w-[min(88vw,22rem)] space-y-2 overflow-y-auto rounded-lg border border-white/15 bg-white/10 p-3 text-white backdrop-blur-md backdrop-brightness-50"
    >
      {item.title && <p className="font-medium">{item.title}</p>}
      {details.length > 0 && <DetailsTable details={details} />}
      {channels.length > 0 && <ChannelLegend channels={channels} />}
    </aside>
  )
}

function ControlButtonNav({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={side === "left" ? "Previous" : "Next"}
      className={cn(
        "absolute top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20",
        side === "left" ? "left-3" : "right-3",
      )}
    >
      {side === "left" ? <ChevronLeft className="size-5" /> : <ChevronRight className="size-5" />}
      <span className="sr-only">{side === "left" ? "Previous image" : "Next image"}</span>
    </button>
  )
}
