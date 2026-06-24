"use client"

import { Button } from "@/components/ui/button"
import { sortParsers } from "@/lib/data-table"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useQueryStates } from "nuqs"

interface DataTablePaginationProps {
  page: number
  pageCount: number
  total: number
}

export function DataTablePagination({ page, pageCount, total }: DataTablePaginationProps) {
  const [, setParams] = useQueryStates(sortParsers, { shallow: false })

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
          <Button variant="outline" size="sm" onClick={() => setParams({ page: page - 1 })} disabled={page <= 1}>
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setParams({ page: page + 1 })}
            disabled={page >= pageCount}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
