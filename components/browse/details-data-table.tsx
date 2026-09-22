"use client"

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table"
import { useQueryStates } from "nuqs"
import * as React from "react"

import { PaginationControls } from "@/components/data-table/pagination"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { sortParsers } from "@/lib/data-table"

// The sortable headers write the server-side sort keys into the URL, but this table sorts client-side by
// tanstack column id. These two column ids differ from their server field name, so they are mapped here.
const SORT_FIELD_TO_COLUMN_ID: Record<string, string> = {
  cellType: "cellTypes",
  methods: "validatedMethods",
}

interface DetailsDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  hiddenColumns?: string[]
}

export function DetailsDataTable<TData, TValue>({
  columns,
  data,
  hiddenColumns = [],
}: DetailsDataTableProps<TData, TValue>) {
  const [{ sort, order }] = useQueryStates(sortParsers, { shallow: false })

  const sorting: SortingState = React.useMemo(
    () => (sort ? [{ id: SORT_FIELD_TO_COLUMN_ID[sort] ?? sort, desc: order === "desc" }] : []),
    [sort, order],
  )

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
    initialState: {
      columnVisibility: Object.fromEntries(hiddenColumns.map((column) => [column, false])),
    },
  })

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="h-8 py-1 text-xs">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="text-xs">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-xs">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <PaginationControls
        page={table.getState().pagination.pageIndex + 1}
        pageCount={Math.max(table.getPageCount(), 1)}
        total={data.length}
        onPageChange={(page) => table.setPageIndex(page - 1)}
      />
    </div>
  )
}
