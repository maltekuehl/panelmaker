"use client"

import { Button } from "@/components/ui/button"
import { sortParsers } from "@/lib/data-table"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useQueryStates } from "nuqs"

interface PaginationControlsProps {
  page: number
  pageCount: number
  total: number
  onPageChange: (page: number) => void
}

export function PaginationControls({ page, pageCount, total, onPageChange }: PaginationControlsProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-muted-foreground">
        {total} result{total === 1 ? "" : "s"}
      </div>
      <div className="flex items-center gap-4">
        <div className="text-sm text-muted-foreground">
          Page {page} of {pageCount}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
            <ChevronLeft className="size-4" />
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= pageCount}>
            Next
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

interface DataTablePaginationProps {
  page: number
  pageCount: number
  total: number
}

export function DataTablePagination({ page, pageCount, total }: DataTablePaginationProps) {
  const [, setParams] = useQueryStates(sortParsers, { shallow: false })

  return (
    <PaginationControls
      page={page}
      pageCount={pageCount}
      total={total}
      onPageChange={(next) => setParams({ page: next })}
    />
  )
}
