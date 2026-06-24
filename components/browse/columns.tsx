"use client"

import { ReportsDialog } from "@/components/browse/reports-dialog"
import { DataTableColumnHeader } from "@/components/data-table/column-header"
import { AddToPanelButton } from "@/components/panel/add-to-panel-button"
import { ColumnDef } from "@tanstack/react-table"
import Link from "next/link"

export type MarkerReport = {
  id: string
  submitter: string
  submitterId: string | null
  method: string
  species: string
  works: boolean | null
}

export type MarkerEntry = {
  id: string
  marker: string
  cellType: string
  cellTypeId?: string
  species: string
  tissue: string
  validatedMethods: string[]
  reportCount: number
  reports: MarkerReport[]
}

export const columns: ColumnDef<MarkerEntry>[] = [
  {
    accessorKey: "marker",
    header: () => <DataTableColumnHeader field="marker" title="Marker" />,
    cell: ({ row }) => (
      <Link href={`/marker/${row.original.id}`} className="font-semibold hover:underline text-primary">
        {row.getValue("marker")}
      </Link>
    ),
  },
  {
    accessorKey: "cellType",
    header: () => <DataTableColumnHeader field="cellType" title="Cell Type" />,
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
    header: () => <DataTableColumnHeader field="species" title="Species" />,
    cell: ({ row }) => {
      const species = row.getValue("species") as string
      return <span>{species}</span>
    },
  },
  {
    accessorKey: "tissue",
    header: () => <DataTableColumnHeader field="tissue" title="Tissue" />,
    cell: ({ row }) => {
      const tissue = row.getValue("tissue") as string
      return <span className="text-muted-foreground">{tissue}</span>
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
    header: () => <DataTableColumnHeader field="reportCount" title="Reports" />,
    cell: ({ row }) => (
      <ReportsDialog marker={row.original.marker} cellType={row.original.cellType} reports={row.original.reports} />
    ),
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
