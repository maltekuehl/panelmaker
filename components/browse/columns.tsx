"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ColumnDef } from "@tanstack/react-table"
import { ChevronRight } from "lucide-react"
import Link from "next/link"

export type MarkerEntry = {
  id: string
  marker: string
  cellType: string
  cellTypeId?: string // Optional for now to avoid breaking existing usage immediately
  species: "Homo sapiens" | "Mus musculus" | "Rattus norvegicus"
  tissue: "FFPE" | "FF"
  validatedMethods: ("IF" | "PathoPlex" | "CODEX" | "MIBI-Tof")[]
  validationCategory: 0 | 1 | 2 | 3 | 4
}

export const columns: ColumnDef<MarkerEntry>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
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
      const cellTypeId = row.original.cellTypeId || row.getValue("cellType") // Fallback or use a slugifier
      // For now, let's assume we pass cellTypeId. If not, we might link to a search or something.
      // But since we are building the pages, let's try to link to /celltype/[id]
      // We'll need to ensure data has cellTypeId.
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
    accessorKey: "validationCategory",
    header: "Validation",
    cell: ({ row }) => {
      const category = row.getValue("validationCategory") as number
      const labels: Record<number, string> = {
        0: "Text Mining",
        1: "Submitted",
        2: "Community",
        3: "Systematic",
        4: "Expert Confirmed",
      }
      const styles: Record<number, string> = {
        0: "bg-zinc-100 text-zinc-800",
        1: "bg-yellow-100 text-yellow-800",
        2: "bg-green-100 text-green-800",
        3: "bg-blue-100 text-blue-800",
        4: "bg-purple-100 text-purple-800",
      }

      return (
        <div
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors border-transparent ${styles[category]}`}
        >
          {labels[category] || "Unknown"}
        </div>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      return (
        <div className="text-right">
          <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-zinc-200">
            <ChevronRight className="h-4 w-4 text-zinc-400" />
          </Button>
        </div>
      )
    },
  },
]
