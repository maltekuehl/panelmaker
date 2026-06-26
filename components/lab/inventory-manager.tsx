"use client"

import { DataTable } from "@/components/browse/data-table"
import { DataTableFacetedFilter } from "@/components/data-table/faceted-filter"
import { DataTablePagination } from "@/components/data-table/pagination"
import { buildInventoryColumns, type InventoryItem } from "@/components/lab/inventory-columns"
import { InventoryFormDialog } from "@/components/lab/inventory-form-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { labInventoryParsers } from "@/lib/data-table"
import { Package, Plus, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useQueryStates } from "nuqs"
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

const STATUS_OPTIONS = [
  { value: "IN_STOCK", label: "In stock" },
  { value: "LOW", label: "Low" },
  { value: "ORDERED", label: "Ordered" },
  { value: "OUT_OF_STOCK", label: "Out of stock" },
]

const SEARCH_DEBOUNCE_MS = 300

type FacetOption = { value: string; label: string; description: string }

interface InventoryManagerProps {
  labId: string
  canManage: boolean
  items: InventoryItem[]
  total: number
  page: number
  pageCount: number
  facets: { host: FacetOption[]; clonality: FacetOption[] }
}

export function InventoryManager({ labId, canManage, items, total, page, pageCount, facets }: InventoryManagerProps) {
  const router = useRouter()
  const [params, setParams] = useQueryStates(labInventoryParsers, { shallow: false })
  const [search, setSearch] = useState(params.q)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<InventoryItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setSearch(params.q)
  }, [params.q])

  const onSearchChange = (value: string) => {
    setSearch(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setParams({ q: value || null, page: 1 })
    }, SEARCH_DEBOUNCE_MS)
  }

  const isFiltered =
    params.q !== "" ||
    params.status.length > 0 ||
    params.host.length > 0 ||
    params.clonality.length > 0 ||
    params.sort !== null

  const columns = useMemo(
    () =>
      buildInventoryColumns({
        canManage,
        onEdit: (item) => setEditing(item),
        onDelete: (item) => setDeleteTarget(item),
      }),
    [canManage],
  )

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/labs/${labId}/inventory/${deleteTarget.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Failed to remove antibody")
        return
      }
      toast.success("Antibody removed from inventory")
      setDeleteTarget(null)
      router.refresh()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setDeleting(false)
    }
  }

  // Truly empty (no items and no active search/filter): show the empty state instead of the table.
  const showEmptyState = total === 0 && !isFiltered

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Package className="size-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">
            Inventory
            <span className="ml-2 text-sm font-normal text-muted-foreground">({total})</span>
          </h2>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" />
            Add antibody
          </Button>
        )}
      </div>

      {showEmptyState ? (
        <div className="rounded-md border border-dashed px-6 py-12 text-center">
          <Package className="mx-auto size-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium">No antibodies in inventory yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {canManage
              ? "Add the antibodies your lab keeps in stock so members can find and reuse them."
              : "This lab has not added any antibodies to its inventory yet."}
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Search by antibody, RRID, target, lot..."
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              className="h-8 w-[200px] lg:w-[280px]"
            />
            <DataTableFacetedFilter
              title="Status"
              options={STATUS_OPTIONS}
              value={params.status}
              onChange={(value) => setParams({ status: value.length ? value : null, page: 1 })}
            />
            {facets.host.length > 0 && (
              <DataTableFacetedFilter
                title="Host"
                options={facets.host}
                value={params.host}
                onChange={(value) => setParams({ host: value.length ? value : null, page: 1 })}
              />
            )}
            {facets.clonality.length > 0 && (
              <DataTableFacetedFilter
                title="Clonality"
                options={facets.clonality}
                value={params.clonality}
                onChange={(value) => setParams({ clonality: value.length ? value : null, page: 1 })}
              />
            )}
            {isFiltered && (
              <Button
                variant="secondary"
                size="sm"
                className="h-8 px-2 lg:px-3"
                onClick={() =>
                  setParams({ q: null, status: null, host: null, clonality: null, sort: null, order: null, page: null })
                }
              >
                <X className="h-4 w-4" />
                Reset
              </Button>
            )}
          </div>

          <DataTable
            columns={columns}
            data={items}
            pagination={<DataTablePagination page={page} pageCount={pageCount} total={total} />}
          />
        </>
      )}

      {canManage && (
        <>
          <InventoryFormDialog labId={labId} mode="add" open={addOpen} onOpenChange={setAddOpen} />
          <InventoryFormDialog
            labId={labId}
            mode="edit"
            open={editing !== null}
            onOpenChange={(open) => !open && setEditing(null)}
            item={editing}
          />
          <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <AlertDialogTitle>Remove antibody?</AlertDialogTitle>
                <AlertDialogDescription>
                  {deleteTarget
                    ? `Remove ${deleteTarget.antibody.name} from this lab's inventory? This does not delete any reports or the antibody record itself.`
                    : ""}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={confirmDelete} disabled={deleting}>
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  )
}
