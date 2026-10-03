import type { Prisma } from "@/lib/generated/prisma/client"
import { antibodyHref, markerHref } from "@/lib/routes"

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

const channelFluorophoreSelect = { select: { name: true } } as const

export const imageWithChannelsSelect = {
  id: true,
  url: true,
  caption: true,
  sortOrder: true,
  cellTypes: { select: { cellTypeId: true } },
  channels: {
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: {
      role: true,
      label: true,
      displayColor: true,
      reportId: true,
      fluorophore: channelFluorophoreSelect,
      report: {
        select: {
          metalTag: true,
          fluorophore: channelFluorophoreSelect,
          antibody: { select: { name: true, targetName: true, rrid: true, targetProteinId: true } },
        },
      },
    },
  },
} satisfies Prisma.ImageSelect

export type ImageWithChannels = Prisma.ImageGetPayload<{ select: typeof imageWithChannelsSelect }>

export const reportImagesSelect = {
  select: { image: { select: imageWithChannelsSelect } },
  orderBy: { image: { sortOrder: "asc" } },
} satisfies Prisma.ExperimentalReport$imageChannelsArgs

export function imagesOfReport(report: { imageChannels: { image: ImageWithChannels }[] }): ImageWithChannels[] {
  return report.imageChannels.map((link) => link.image)
}

type Channel = ImageWithChannels["channels"][number]

function channelLabel(channel: Channel): string {
  const antibody = channel.report?.antibody
  return antibody?.targetName ?? antibody?.name ?? channel.label ?? "Unnamed channel"
}

function channelDetail(channel: Channel): string | null {
  const fluorophore = channel.report ? channel.report.fluorophore : channel.fluorophore
  return fluorophore?.name ?? channel.report?.metalTag ?? null
}

// `highlightReportId` marks the channel of the report the viewer opened the image from.
export function toCarouselChannels(image: ImageWithChannels, highlightReportId?: string): CarouselChannel[] {
  return image.channels.map((channel) => ({
    label: channelLabel(channel),
    detail: channelDetail(channel),
    color: channel.displayColor,
    role: channel.role,
    highlighted: highlightReportId !== undefined && channel.reportId === highlightReportId,
  }))
}

// Marker and antibody rows for the stains of interest in one image.
export function targetDetails(image: ImageWithChannels): CarouselDetail[] {
  const markers: CarouselDetailValue[] = []
  const antibodies: CarouselDetailValue[] = []
  for (const channel of image.channels) {
    const antibody = channel.report?.antibody
    if (!antibody || channel.role !== "TARGET") continue
    const markerName = antibody.targetName ?? antibody.name
    markers.push({
      text: markerName,
      href: antibody.targetProteinId ? markerHref(antibody.targetProteinId) : undefined,
    })
    antibodies.push({ text: antibody.name, href: antibodyHref(antibody.rrid) ?? undefined })
  }
  return [
    { label: markers.length > 1 ? "Markers" : "Marker", values: markers },
    { label: antibodies.length > 1 ? "Antibodies" : "Antibody", values: antibodies },
  ].filter((detail) => detail.values.length > 0)
}

export function imageTitle(image: ImageWithChannels): string | undefined {
  const target = image.channels.find((channel) => channel.role === "TARGET" && channel.report?.antibody)
  return target?.report?.antibody?.targetName ?? target?.report?.antibody?.name ?? undefined
}
