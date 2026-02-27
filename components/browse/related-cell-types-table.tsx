"use client"

import { ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import { DetailsDataTable } from "./details-data-table"

// Define columns for the related cell types table
const cellTypeColumns: ColumnDef<any>[] = [
  {
    accessorKey: "name",
    header: "Cell Type",
    cell: ({ row }) => (
      <Link href={`/celltype/${row.original.id}`} className="font-medium hover:underline text-primary text-sm">
        {row.getValue("name")}
      </Link>
    ),
  },
  {
    accessorKey: "ontologyId",
    header: "Ontology ID",
    cell: ({ row }) => (
      <span className="font-mono text-[10px] text-muted-foreground">{row.getValue("ontologyId")}</span>
    ),
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => <div className="line-clamp-1 text-xs text-muted-foreground">{row.getValue("description")}</div>,
  },
]

interface RelatedCellTypesTableProps {
  data: any[]
}

export function RelatedCellTypesTable({ data }: RelatedCellTypesTableProps) {
  return <DetailsDataTable columns={cellTypeColumns} data={data} />
}
