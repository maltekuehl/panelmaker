"use client"

import { Badge } from "@/components/ui/badge"
import { antibodyHref, markerHref } from "@/lib/routes"
import { Building2, FlaskConical } from "lucide-react"
import Link from "next/link"
import {
  EntityTitle,
  joinPresent,
  MetaLine,
  OrEmpty,
  RowStack,
  ToolAccordion,
  ToolErrorRow,
  ToolRow,
} from "./primitives"

interface ListMyLabsOutput {
  labs?: {
    id: string
    name: string
    slug: string
    role: string
    memberCount: number
    inventoryCount: number
  }[]
}

interface InventoryItem {
  id: string
  status: string
  aliquotsRemaining: number | null
  storageLocation: string | null
  markerId: string | null
  marker: string | null
  antibody: string
  rrid: string | null
  clonality: string | null
  host: string | null
  addedBy: string | null
}

interface GetLabInventoryOutput {
  count?: number
  items?: InventoryItem[]
}

interface GetLabPanelsOutput {
  panels?: {
    id: string
    name: string
    owner: string | null
    visibility: string
    species: string | null
    markerCount: number
    markers: { marker: string | null }[]
  }[]
  error?: string
}

export function ListMyLabsCard({ output }: { output: ListMyLabsOutput }) {
  const labs = output.labs ?? []
  return (
    <ToolAccordion icon={Building2} title="Labs" count={labs.length}>
      <OrEmpty count={labs.length} empty="You are not a member of any lab.">
        <RowStack>
          {labs.map((lab) => (
            <ToolRow key={lab.id} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <EntityTitle href={`/labs/${lab.slug}`}>{lab.name}</EntityTitle>
                <p className="text-[10px] text-muted-foreground">
                  {[lab.role, `${lab.memberCount} members`, `${lab.inventoryCount} stocked`].join(", ")}
                </p>
              </div>
            </ToolRow>
          ))}
        </RowStack>
      </OrEmpty>
    </ToolAccordion>
  )
}

function InventoryRow({ item }: { item: InventoryItem }) {
  const href = antibodyHref(item.rrid)
  return (
    <ToolRow className="flex items-center gap-2 text-[11px]">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {item.markerId ? (
            <Link href={markerHref(item.markerId)} className="shrink-0 font-semibold text-primary hover:underline">
              {item.marker ?? "Marker"}
            </Link>
          ) : (
            item.marker && <span className="shrink-0 font-semibold">{item.marker}</span>
          )}
          {href ? (
            <Link href={href} className="truncate text-primary hover:underline">
              {item.antibody}
            </Link>
          ) : (
            <span className="truncate text-muted-foreground">{item.antibody}</span>
          )}
        </div>
        <MetaLine>{joinPresent([item.rrid, item.storageLocation, item.host])}</MetaLine>
      </div>
      <Badge variant="secondary" className="h-4 shrink-0 px-1 text-[10px] font-normal">
        {item.status}
      </Badge>
      {item.aliquotsRemaining !== null && (
        <span className="shrink-0 text-[10px] text-muted-foreground">{item.aliquotsRemaining} left</span>
      )}
    </ToolRow>
  )
}

export function GetLabInventoryCard({ output }: { output: GetLabInventoryOutput }) {
  const items = output.items ?? []
  return (
    <ToolAccordion icon={FlaskConical} title="Inventory" count={output.count ?? items.length}>
      <OrEmpty count={items.length} empty="No matching inventory.">
        <RowStack>
          {items.map((it) => (
            <InventoryRow key={it.id} item={it} />
          ))}
        </RowStack>
      </OrEmpty>
    </ToolAccordion>
  )
}

export function GetLabPanelsCard({ output }: { output: GetLabPanelsOutput }) {
  if (output.error) {
    return <ToolErrorRow>{output.error}</ToolErrorRow>
  }
  const panels = output.panels ?? []
  return (
    <ToolAccordion icon={FlaskConical} title="Panels" count={panels.length}>
      <OrEmpty count={panels.length} empty="No panels visible.">
        <RowStack>
          {panels.map((p) => {
            const preview = p.markers
              .map((m) => m.marker)
              .filter(Boolean)
              .slice(0, 6)
              .join(", ")
            return (
              <ToolRow key={p.id}>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/panel/${p.id}`}
                    className="min-w-0 flex-1 truncate text-xs font-semibold hover:text-primary"
                  >
                    {p.name}
                  </Link>
                  <Badge variant="secondary" className="h-4 shrink-0 px-1 text-[10px] font-normal">
                    {p.markerCount} markers
                  </Badge>
                </div>
                <MetaLine>{joinPresent([p.species, p.visibility.toLowerCase(), p.owner])}</MetaLine>
                {preview && <MetaLine>{preview}</MetaLine>}
              </ToolRow>
            )
          })}
        </RowStack>
      </OrEmpty>
    </ToolAccordion>
  )
}
