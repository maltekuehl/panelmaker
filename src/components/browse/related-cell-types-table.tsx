"use client"

import { cellTypeHref } from "@/lib/routes"
import { ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import { DetailsDataTable } from "./details-data-table"

export type RelatedCellType = {
  id: string
  name: string
  ontologyId: string | null
  description: string | null
}

const cellTypeColumns: ColumnDef<RelatedCellType>[] = [
  {
    accessorKey: "name",
    header: "Cell Type",
    cell: ({ row }) => (
      <Link href={cellTypeHref(row.original.id)} className="text-sm font-medium text-primary hover:underline">
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: "ontologyId",
    header: "Ontology ID",
    cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.ontologyId}</span>,
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => <div className="line-clamp-1 text-xs text-muted-foreground">{row.original.description}</div>,
  },
]

interface RelatedCellTypesTableProps {
  data: RelatedCellType[]
}

export function RelatedCellTypesTable({ data }: RelatedCellTypesTableProps) {
  return <DetailsDataTable columns={cellTypeColumns} data={data} />
}
