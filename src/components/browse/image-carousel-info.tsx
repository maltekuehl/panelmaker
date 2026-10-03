"use client"

import type { CarouselChannel, CarouselDetail, CarouselImage } from "@/components/browse/image-carousel-dialog"
import { cn } from "@/lib/utils"
import Link from "next/link"

const CHANNEL_SECTIONS: { role: CarouselChannel["role"]; title: string }[] = [
  { role: "TARGET", title: "Stains" },
  { role: "STRUCTURAL", title: "Structural reference" },
  { role: "NUCLEAR", title: "Nuclear counterstain" },
]

// A caption is free prose the submitter wrote about one image, so it only exists for some images. In a
// full-bleed lightbox there is no column to keep aligned, so a missing one renders nothing rather than a
// "Not available" plate that would sit over the picture on every image that never had a caption.
export function ImageCaption({ caption, raised }: { caption: string | null | undefined; raised: boolean }) {
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

export function ImageInfo({ item }: { item: CarouselImage }) {
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
