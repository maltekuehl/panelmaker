"use client"

import { ImageCarouselDialog, type CarouselImage } from "@/components/browse/image-carousel-dialog"
import { DataTableColumnHeader } from "@/components/data-table/column-header"
import type { OntologyValue as OntologyRef } from "@/components/ontology-combobox"
import { AddToPanelButton } from "@/components/panel/add-to-panel-button"
import { NotAvailable } from "@/components/shared/not-available"
import { TruncatedOrNotAvailable, TruncatedText } from "@/components/shared/truncated-text"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cellTypeHref } from "@/lib/routes"
import { ColumnDef } from "@tanstack/react-table"
import { ImageIcon } from "lucide-react"

type KeysOfType<T, V> = { [K in keyof T]-?: T[K] extends V ? K : never }[keyof T] & string

const VISIBLE_CELL_TYPES = 2

export function sortableHeader(field: string, title: string) {
  return function SortableHeader() {
    return <DataTableColumnHeader field={field} title={title} />
  }
}

function CellTypeLinks({ cellTypes }: { cellTypes: OntologyRef[] }) {
  if (cellTypes.length === 0) return <NotAvailable />
  const visible = cellTypes.slice(0, VISIBLE_CELL_TYPES)
  const hidden = cellTypes.slice(VISIBLE_CELL_TYPES)
  return (
    <div className="flex max-w-[240px] flex-col gap-0.5">
      {visible.map((ct) => (
        <TruncatedText key={ct.id} text={ct.label} href={cellTypeHref(ct.id)} />
      ))}
      {hidden.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="w-fit cursor-default text-xs text-muted-foreground">+{hidden.length} more</span>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm">{hidden.map((ct) => ct.label).join(", ")}</TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

function ImageCell({ images, title }: { images: CarouselImage[]; title: string }) {
  if (!images || images.length === 0) {
    return (
      <span className="flex size-10 items-center justify-center rounded border bg-muted/40 text-muted-foreground">
        <ImageIcon className="size-4" />
      </span>
    )
  }
  return (
    <ImageCarouselDialog
      images={images}
      title={title}
      trigger={
        <button
          type="button"
          title="Quick image look"
          className="group relative size-10 overflow-hidden rounded border bg-muted/40 transition-colors hover:border-primary/50"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[0].src} alt={`${title} image`} className="size-full object-cover" />
          {images.length > 1 && (
            <span className="absolute bottom-0 right-0 rounded-tl bg-black/70 px-1 text-[10px] leading-tight text-white">
              {images.length}
            </span>
          )}
        </button>
      }
    />
  )
}

function textColumn<T>(
  key: KeysOfType<T, string>,
  title: string,
  className: string,
  field: string = key,
): ColumnDef<T> {
  return {
    accessorKey: key,
    header: sortableHeader(field, title),
    cell: ({ row }) => <TruncatedText text={row.original[key] as string} className={className} />,
  } as ColumnDef<T>
}

export function optionalTextColumn<T>(
  key: KeysOfType<T, string | null>,
  title: string,
  className: string,
  meta?: { label: string; hiddenByDefault: boolean },
): ColumnDef<T> {
  return {
    accessorKey: key,
    meta,
    header: sortableHeader(key, title),
    cell: ({ row }) => <TruncatedOrNotAvailable value={row.original[key] as string | null} className={className} />,
  } as ColumnDef<T>
}

export function speciesColumn<T extends { species: string }>(): ColumnDef<T> {
  return textColumn<T>("species" as KeysOfType<T, string>, "Sample species", "max-w-[160px]")
}

export function tissueColumn<T extends { tissue: string }>(): ColumnDef<T> {
  return textColumn<T>("tissue" as KeysOfType<T, string>, "Tissue", "max-w-[160px] text-muted-foreground")
}

export function methodColumn<T extends { method: string }>(): ColumnDef<T> {
  return textColumn<T>("method" as KeysOfType<T, string>, "Method", "max-w-[140px] text-muted-foreground")
}

function cellTypeLabels(cellTypes: OntologyRef[]): string {
  return cellTypes.map((c) => c.label).join(", ")
}

export function cellTypesColumn<T extends { cellTypes: OntologyRef[] }>(): ColumnDef<T> {
  return {
    accessorKey: "cellTypes",
    header: sortableHeader("cellType", "Cell Types"),
    cell: ({ row }) => <CellTypeLinks cellTypes={row.original.cellTypes} />,
    sortingFn: (a, b) => cellTypeLabels(a.original.cellTypes).localeCompare(cellTypeLabels(b.original.cellTypes)),
  } as ColumnDef<T>
}

export function countBadgeColumn<T>(
  key: KeysOfType<T, number>,
  title: string,
  singular: string,
  plural: string,
): ColumnDef<T> {
  return {
    accessorKey: key,
    header: sortableHeader(key, title),
    cell: ({ row }) => {
      const count = row.original[key] as number
      return (
        <Badge variant="secondary">
          {count} {count === 1 ? singular : plural}
        </Badge>
      )
    },
  } as ColumnDef<T>
}

export function imagesColumn<T extends { images: CarouselImage[] }>(title: (row: T) => string): ColumnDef<T> {
  return {
    id: "images",
    header: "Images",
    cell: ({ row }) => <ImageCell images={row.original.images} title={title(row.original)} />,
  }
}

export type AddToPanelTarget = { proteinId: string; label: string } | { antibodyId: string; label: string }

export function addToPanelColumn<T>(target: (row: T) => AddToPanelTarget | null): ColumnDef<T> {
  return {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      const props = target(row.original)
      if (!props) return null
      return (
        <div className="text-right">
          <AddToPanelButton {...props} variant="outline" size="sm" className="h-7 text-xs" />
        </div>
      )
    },
  }
}
