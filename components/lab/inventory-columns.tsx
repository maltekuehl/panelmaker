"use client"

import { DataTableColumnHeader } from "@/components/data-table/column-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import Link from "next/link"

// Mirrors LabAntibodyResponse structurally. Declared locally so this client module never imports the
// server-only lab barrel (see the build-enforced client-import rule in docs/lab-structure).
export interface InventoryItem {
  id: string
  status: string
  storageLocation: string | null
  freezerLocation: string | null
  lotNumber: string | null
  vendorCatalog: string | null
  aliquotsRemaining: number | null
  notes: string | null
  lastValidatedAt: string | null
  addedAt: string
  addedBy: { id: string; name: string | null } | null
  antibody: {
    id: string
    rrid: string | null
    name: string
    clonality: string | null
    vendorName: string | null
    targetName: string | null
    hostTaxon: { id: string; label: string } | null
    targetProtein: { id: string; label: string; geneSymbol: string | null } | null
  }
}

const STATUS_META: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  IN_STOCK: { label: "In stock", variant: "default" },
  LOW: { label: "Low", variant: "secondary" },
  ORDERED: { label: "Ordered", variant: "outline" },
  OUT_OF_STOCK: { label: "Out of stock", variant: "destructive" },
}

const CLONALITY_LABELS: Record<string, string> = {
  MONOCLONAL: "Monoclonal",
  POLYCLONAL: "Polyclonal",
  RECOMBINANT: "Recombinant",
  OLIGOCLONAL: "Oligoclonal",
}

function antibodyHref(rrid: string): string {
  return `/antibody/${rrid.replace(/^RRID:/, "")}`
}

function NA() {
  return <span className="text-muted-foreground/50">N/A</span>
}

interface BuildColumnsOptions {
  canManage: boolean
  onEdit: (item: InventoryItem) => void
  onDelete: (item: InventoryItem) => void
}

export function buildInventoryColumns({
  canManage,
  onEdit,
  onDelete,
}: BuildColumnsOptions): ColumnDef<InventoryItem>[] {
  const columns: ColumnDef<InventoryItem>[] = [
    {
      id: "antibody",
      header: () => <DataTableColumnHeader field="antibody" title="Antibody" />,
      cell: ({ row }) => {
        const ab = row.original.antibody
        const clonality = ab.clonality ? (CLONALITY_LABELS[ab.clonality] ?? ab.clonality) : null
        return (
          <div className="min-w-0">
            <div className="font-medium">{ab.name}</div>
            <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              {ab.rrid ? (
                <Link href={antibodyHref(ab.rrid)} className="font-mono text-primary hover:underline">
                  {ab.rrid}
                </Link>
              ) : null}
              {clonality && <span>{clonality}</span>}
            </div>
          </div>
        )
      },
    },
    {
      id: "target",
      header: () => <DataTableColumnHeader field="target" title="Target" />,
      cell: ({ row }) => {
        const ab = row.original.antibody
        if (ab.targetProtein) {
          return (
            <Link href={`/marker/${ab.targetProtein.id}`} className="text-primary hover:underline">
              {ab.targetProtein.geneSymbol ?? ab.targetProtein.label}
            </Link>
          )
        }
        return ab.targetName ? <span>{ab.targetName}</span> : <NA />
      },
    },
    {
      id: "host",
      header: () => <DataTableColumnHeader field="host" title="Host" />,
      cell: ({ row }) => {
        const host = row.original.antibody.hostTaxon
        return host ? <span className="text-sm">{host.label}</span> : <NA />
      },
    },
    {
      id: "status",
      header: () => <DataTableColumnHeader field="status" title="Status" />,
      cell: ({ row }) => {
        const meta = STATUS_META[row.original.status] ?? { label: row.original.status, variant: "outline" as const }
        return <Badge variant={meta.variant}>{meta.label}</Badge>
      },
    },
    {
      id: "storage",
      header: "Storage",
      cell: ({ row }) => {
        const { storageLocation, freezerLocation } = row.original
        const parts = [storageLocation, freezerLocation].filter(Boolean)
        return parts.length > 0 ? <span className="text-sm">{parts.join(" · ")}</span> : <NA />
      },
    },
    {
      id: "aliquots",
      header: () => <DataTableColumnHeader field="aliquots" title="Aliquots" />,
      cell: ({ row }) =>
        row.original.aliquotsRemaining !== null ? (
          <span className="font-mono text-sm">{row.original.aliquotsRemaining}</span>
        ) : (
          <NA />
        ),
    },
    {
      id: "lot",
      header: "Lot #",
      cell: ({ row }) =>
        row.original.lotNumber ? <span className="font-mono text-sm">{row.original.lotNumber}</span> : <NA />,
    },
    {
      id: "addedBy",
      header: () => <DataTableColumnHeader field="added" title="Added by" />,
      cell: ({ row }) => {
        const addedBy = row.original.addedBy
        if (!addedBy) return <NA />
        return (
          <Link href={`/profile/${addedBy.id}`} className="text-sm text-primary hover:underline">
            {addedBy.name ?? "Unnamed user"}
          </Link>
        )
      },
    },
  ]

  if (canManage) {
    columns.push({
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="text-muted-foreground">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onEdit(row.original)}>
                <Pencil className="size-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => onDelete(row.original)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="size-4" />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    })
  }

  return columns
}
