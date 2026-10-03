import type { CarouselChannel } from "@/components/browse/image-carousel-dialog"
import type { Prisma } from "@/lib/generated/prisma/client"

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
