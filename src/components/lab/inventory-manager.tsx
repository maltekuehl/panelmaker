"use client"

import { DataTable } from "@/components/browse/data-table"
import { DataTableFacetedFilter } from "@/components/data-table/faceted-filter"
import { DataTablePagination } from "@/components/data-table/pagination"
import { DebouncedSearchInput } from "@/components/data-table/search-input"
import { clearedTableParams, ResetFiltersButton } from "@/components/filter-toolbar"
import { buildInventoryColumns, INVENTORY_STATUS_OPTIONS, type InventoryItem } from "@/components/lab/inventory-columns"
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
import { useApiRequest } from "@/hooks/use-api-request"
import { isInventoryParamsActive, labInventoryParsers } from "@/lib/data-table"
import { Package, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useQueryStates } from "nuqs"
import { useMemo, useState } from "react"
import { toast } from "sonner"

type FacetOption = { value: string; label: string; description?: string }

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

  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<InventoryItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null)
  const { pending, request } = useApiRequest()
  const deleting = pending !== null

  const isFiltered = isInventoryParamsActive(params)

  const filters: { key: "status" | "host" | "clonality"; title: string; options: FacetOption[] }[] = [
    { key: "status", title: "Status", options: INVENTORY_STATUS_OPTIONS },
    { key: "host", title: "Host species", options: facets.host },
    { key: "clonality", title: "Clonality", options: facets.clonality },
  ]

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
    const data = await request(true, {
      url: `/api/labs/${labId}/inventory/${deleteTarget.id}`,
      method: "DELETE",
      errorMessage: "Failed to remove antibody",
    })
    if (!data) return
    toast.success("Antibody removed from inventory")
    setDeleteTarget(null)
    router.refresh()
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
            <DebouncedSearchInput
              placeholder="Search by antibody, RRID, target, lot…"
              value={params.q}
              onCommit={(q) => setParams({ q: q || null, page: 1 })}
              className="h-8 w-[200px] lg:w-[280px]"
            />
            {filters.map(
              (filter) =>
                filter.options.length > 0 && (
                  <DataTableFacetedFilter
                    key={filter.key}
                    className="w-[180px] justify-start overflow-hidden"
                    title={filter.title}
                    options={filter.options}
                    value={params[filter.key]}
                    onChange={(value) => setParams({ [filter.key]: value.length ? value : null, page: 1 })}
                  />
                ),
            )}
            <ResetFiltersButton
              disabled={!isFiltered}
              onClick={() => setParams(clearedTableParams(filters.map((filter) => filter.key)))}
            />
          </div>

          <DataTable columns={columns} data={items} emptyMessage="No inventory items match these filters." />
          <DataTablePagination page={page} pageCount={pageCount} total={total} />
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
