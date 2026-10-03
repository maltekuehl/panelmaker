"use client"

import { AddToPanelButton } from "@/components/panel/add-to-panel-button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { X, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { createContext, useContext } from "react"

// The tool input (query) for the result currently being rendered, so ToolAccordion can offer a
// collapsible JSON view of it without every card having to thread the prop through.
export const ToolQueryContext = createContext<Record<string, unknown> | null>(null)

export function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`
}

export function joinPresent(values: (string | null | undefined)[]): string {
  return values.filter(Boolean).join(", ")
}

export function CompactAddToPanelButton(props: {
  proteinId?: string
  geneSymbol?: string
  antibodyId?: string
  label: string
}) {
  return (
    <AddToPanelButton {...props} variant="outline" size="sm" className="h-6 shrink-0 px-1.5 text-[10px]" iconOnly />
  )
}

// One presentation for every tool failure, so "not visible to you" never reads as "no results".
export function ToolErrorRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-2.5 py-2">
      <X className="size-3.5 shrink-0 text-destructive" />
      <span className="min-w-0 flex-1 text-xs text-destructive">{children}</span>
    </div>
  )
}

export function EmptyRow({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] text-muted-foreground">{children}</p>
}

export function ToolRow({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-md border bg-popover px-2 py-1.5", className)}>{children}</div>
}

export function RowStack({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1">{children}</div>
}

export function MetaLine({ children }: { children: React.ReactNode }) {
  return <p className="truncate text-[10px] text-muted-foreground">{children}</p>
}

export function EntityTitle({ href, children }: { href: string | null; children: React.ReactNode }) {
  if (!href) return <p className="truncate text-xs font-semibold">{children}</p>
  return (
    <Link href={href} className="block truncate text-xs font-semibold hover:text-primary">
      {children}
    </Link>
  )
}

export function OrEmpty({ count, empty, children }: { count: number; empty: string; children: React.ReactNode }) {
  return count === 0 ? <EmptyRow>{empty}</EmptyRow> : children
}

export function ToolAccordion({
  icon,
  title,
  count,
  mono = false,
  children,
}: {
  icon: LucideIcon
  title: string
  count?: number
  mono?: boolean
  children: React.ReactNode
}) {
  const Icon = icon
  const query = useContext(ToolQueryContext)
  const hasQuery = query !== null && Object.keys(query).length > 0
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="tool" className="border-b-0">
        <AccordionTrigger className="items-center gap-2 px-3 py-2.5">
          <span className="flex min-w-0 flex-1 items-center gap-1.5">
            <Icon className="size-3.5 shrink-0 text-primary" />
            <span className={cn("truncate text-xs font-medium text-foreground", mono && "font-mono")}>{title}</span>
            {count !== undefined && (
              <Badge variant="secondary" className="h-4 shrink-0 px-1 text-[10px]">
                {count}
              </Badge>
            )}
          </span>
        </AccordionTrigger>
        <AccordionContent className="h-auto! pt-0 pb-2">
          <div className="max-h-72 space-y-1 overflow-y-auto pr-1 pb-1">{children}</div>
          {hasQuery && (
            <details className="mt-1.5 border-t pt-1.5">
              <summary className="cursor-pointer list-none text-[10px] font-medium tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground">
                Query
              </summary>
              <pre className="mt-1 max-h-48 overflow-auto rounded-md border bg-popover p-2 text-xs whitespace-pre">
                {JSON.stringify(query, null, 2)}
              </pre>
            </details>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

export function ChipListCard({
  title,
  icon,
  items,
}: {
  title: string
  icon: LucideIcon
  items: { id: string; label: string }[]
}) {
  return (
    <ToolAccordion icon={icon} title={title} count={items.length}>
      <OrEmpty count={items.length} empty="No matches.">
        <div className="flex flex-wrap gap-1">
          {items.map((it) => (
            <Badge key={it.id} variant="secondary" className="h-5 px-1.5 text-[11px] font-normal">
              {it.label}
            </Badge>
          ))}
        </div>
      </OrEmpty>
    </ToolAccordion>
  )
}
