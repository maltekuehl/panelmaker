"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type RowData,
  type VisibilityState,
} from "@tanstack/react-table"
import { Columns3 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    label?: string
    hiddenByDefault?: boolean
  }
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  emptyMessage?: string
}

function columnId<TData, TValue>(column: ColumnDef<TData, TValue>): string | undefined {
  return column.id ?? ("accessorKey" in column ? String(column.accessorKey) : undefined)
}

function readVisibility(key: string): VisibilityState | null {
  try {
    const stored = window.localStorage.getItem(key)
    return stored ? (JSON.parse(stored) as VisibilityState) : null
  } catch {
    return null
  }
}

function writeVisibility(key: string, value: VisibilityState) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

export function DataTable<TData, TValue>({
  columns,
  data,
  emptyMessage = "No results.",
}: DataTableProps<TData, TValue>) {
  const optional = useMemo(
    () =>
      columns.flatMap((column) => {
        const id = columnId(column)
        return id && column.meta?.hiddenByDefault ? [{ id, label: column.meta.label ?? id }] : []
      }),
    [columns],
  )
  const storageKey = `table-columns:${optional.map((column) => column.id).join(",")}`
  const defaults = useMemo(
    () => Object.fromEntries(optional.map((column) => [column.id, false])) as VisibilityState,
    [optional],
  )
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(defaults)

  useEffect(() => {
    if (optional.length === 0) return
    const stored = readVisibility(storageKey)
    if (stored) setColumnVisibility({ ...defaults, ...stored })
  }, [defaults, optional.length, storageKey])

  const table = useReactTable({
    data,
    columns,
    state: { columnVisibility },
    onColumnVisibilityChange: (updater) =>
      setColumnVisibility((previous) => {
        const next = typeof updater === "function" ? updater(previous) : updater
        writeVisibility(storageKey, next)
        return next
      }),
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualFiltering: true,
    manualPagination: true,
  })

  const visibleColumnCount = table.getVisibleLeafColumns().length + (optional.length > 0 ? 1 : 0)

  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader className="bg-muted/40">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="border-b hover:bg-transparent">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  scope="col"
                  className="h-10 px-4 align-middle font-medium text-muted-foreground"
                >
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
              {optional.length > 0 && (
                <TableHead className="h-10 w-10 px-2 text-right align-middle">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-7" aria-label="Show more columns">
                        <Columns3 className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>More columns</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {optional.map((column) => (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          checked={table.getColumn(column.id)?.getIsVisible() ?? false}
                          onCheckedChange={(checked) => table.getColumn(column.id)?.toggleVisibility(checked)}
                          onSelect={(event) => event.preventDefault()}
                        >
                          {column.label}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableHead>
              )}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="border-b transition-colors hover:bg-muted/50">
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="px-4 py-1.5 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
                {optional.length > 0 && <TableCell />}
              </TableRow>
            ))
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={visibleColumnCount} className="h-24 px-4 text-center text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
