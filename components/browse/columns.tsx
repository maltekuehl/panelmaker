"use client"

import { AddToPanelButton } from "@/components/panel/add-to-panel-button"
import { Badge } from "@/components/ui/badge"
import { ColumnDef } from "@tanstack/react-table"
import Link from "next/link"

export type MarkerEntry = {
  id: string
  marker: string
  cellType: string
  cellTypeId?: string
  species: string
  tissue: string
  validatedMethods: string[]
  reportCount: number
}

export const columns: ColumnDef<MarkerEntry>[] = [
  {
    accessorKey: "marker",
    header: "Marker",
    cell: ({ row }) => (
      <Link href={`/marker/${row.original.id}`} className="font-semibold hover:underline text-primary">
        {row.getValue("marker")}
      </Link>
    ),
  },
  {
    accessorKey: "cellType",
    header: "Cell Type",
    cell: ({ row }) => {
      return (
        <Link href={`/celltype/${row.original.cellTypeId || "unknown"}`} className="hover:underline text-primary">
          {row.getValue("cellType")}
        </Link>
      )
    },
  },
  {
    accessorKey: "species",
    header: "Species",
    cell: ({ row }) => {
      const species = row.getValue("species") as string
      return <span>{species}</span>
    },
  },
  {
    accessorKey: "tissue",
    header: "Tissue",
    cell: ({ row }) => {
      const tissue = row.getValue("tissue") as string
      return <span className="text-muted-foreground">{tissue}</span>
    },
  },
  {
    accessorKey: "method",
    header: "Method",
    enableHiding: true,
    filterFn: (row, columnId, filterValue: string[]) => {
      const value = row.getValue(columnId) as string
      return filterValue.includes(value)
    },
  },
  {
    accessorKey: "validatedMethods",
    header: "Methods",
    cell: ({ row }) => {
      const methods = row.getValue("validatedMethods") as string[]
      return (
        <div className="flex flex-wrap gap-1 text-muted-foreground truncate max-w-[150px]">{methods.join(", ")}</div>
      )
    },
  },
  {
    accessorKey: "reportCount",
    header: "Reports",
    cell: ({ row }) => {
      const count = row.getValue("reportCount") as number
      return (
        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
          {count}
        </Badge>
      )
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      return (
        <div className="text-right">
          <AddToPanelButton
            proteinId={row.original.id}
            label={row.original.marker}
            variant="outline"
            size="sm"
            className="h-7 text-xs"
          />
        </div>
      )
    },
  },
]
