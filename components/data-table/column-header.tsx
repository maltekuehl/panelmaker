"use client"

import { Button } from "@/components/ui/button"
import { sortParsers } from "@/lib/data-table"
import { cn } from "@/lib/utils"
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"
import { useQueryStates } from "nuqs"

interface DataTableColumnHeaderProps {
  field: string
  title: string
  className?: string
}

export function DataTableColumnHeader({ field, title, className }: DataTableColumnHeaderProps) {
  const [{ sort, order }, setParams] = useQueryStates(sortParsers, { shallow: false })
  const isActive = sort === field

  return (
    <Button
      variant="ghost"
      size="sm"
      data-active={isActive}
      onClick={() => setParams({ sort: field, order: isActive && order === "asc" ? "desc" : "asc", page: 1 })}
      className={cn(
        "-ml-3 h-8 font-medium text-muted-foreground hover:text-foreground data-[active=true]:text-foreground",
        className,
      )}
    >
      <span>{title}</span>
      {isActive ? (
        order === "asc" ? (
          <ArrowUp className="h-3.5 w-3.5" />
        ) : (
          <ArrowDown className="h-3.5 w-3.5" />
        )
      ) : (
        <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
      )}
    </Button>
  )
}
