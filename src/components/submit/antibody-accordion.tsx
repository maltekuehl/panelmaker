"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RECOMMENDATION_LABELS } from "@/lib/constants"
import { antibodyHref } from "@/lib/routes"
import { MAX_FOVS_PER_REPORT } from "@/models/experimental-report/schema"
import { Copy, ExternalLink, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { AntibodyEditor } from "./antibody-editor"
import type { AssessmentTerms } from "./assessment-fields"
import { ImageUpload } from "./image-upload"
import { duplicateRow, emptyRow, pruneFovs, type AntibodyRow, type Fov, type FovDraft, type RowImage } from "./types"

function AntibodyRridButton({ rrid }: { rrid: string }) {
  const href = antibodyHref(rrid)
  if (!href) return null
  return (
    <Button
      asChild
      variant="outline"
      size="sm"
      className="h-7 font-mono text-xs font-normal"
      title="View antibody in database"
    >
      <Link href={href} target="_blank" rel="noopener noreferrer">
        {rrid.trim()}
        <ExternalLink className="size-3" />
      </Link>
    </Button>
  )
}

function rowLabel(row: AntibodyRow, index: number): string {
  return row.markerName.trim() || `Antibody ${index + 1}`
}

function summaryDetection(row: AntibodyRow): string | null {
  return row.fluorophore?.name || row.metalTag || (row.cycleNumber ? `Cycle ${row.cycleNumber}` : null)
}

export function AntibodyAccordion({
  rows,
  fovs,
  onChange,
  organismId,
  invalid,
  hasLabs,
  terms,
}: {
  rows: AntibodyRow[]
  fovs: Fov[]
  onChange: (rows: AntibodyRow[], fovs: Fov[]) => void
  organismId?: number
  invalid: (key: string, field: keyof AntibodyRow) => boolean
  hasLabs?: boolean
  terms: AssessmentTerms
}) {
  const [open, setOpen] = useState<string[]>(() => rows.map((r) => r.key))

  function updateRow(key: string, patch: Partial<AntibodyRow> | ((r: AntibodyRow) => AntibodyRow)) {
    onChange(
      rows.map((r) => (r.key === key ? (typeof patch === "function" ? patch(r) : { ...r, ...patch }) : r)),
      fovs,
    )
  }

  function setRows(next: AntibodyRow[]) {
    onChange(next, pruneFovs(fovs, next))
  }

  function saveFov(key: string, draft: FovDraft) {
    const fov: Fov = { url: draft.url, caption: draft.caption, references: draft.references }
    const shared = new Set(draft.sharedWith)
    const nextRows = rows.map((r) => {
      const has = r.images.some((im) => im.url === draft.url)
      if (r.key === key) {
        const known = new Set(r.cellTypes.map((c) => c.id))
        const image: RowImage = {
          url: draft.url,
          displayColor: draft.displayColor,
          cellTypeIds: draft.cellTypes.map((c) => c.id),
        }
        return {
          ...r,
          cellTypes: [...r.cellTypes, ...draft.cellTypes.filter((c) => !known.has(c.id))],
          images: has ? r.images.map((im) => (im.url === draft.url ? image : im)) : [...r.images, image],
        }
      }
      if (shared.has(r.key) && !has && r.images.length < MAX_FOVS_PER_REPORT)
        return {
          ...r,
          images: [...r.images, { url: draft.url, displayColor: "", cellTypeIds: r.cellTypes.map((c) => c.id) }],
        }
      if (!shared.has(r.key) && has) return { ...r, images: r.images.filter((im) => im.url !== draft.url) }
      return r
    })
    const exists = fovs.some((f) => f.url === fov.url)
    onChange(nextRows, pruneFovs(exists ? fovs.map((f) => (f.url === fov.url ? fov : f)) : [...fovs, fov], nextRows))
  }

  function removeFov(url: string) {
    setRows(rows.map((r) => ({ ...r, images: r.images.filter((im) => im.url !== url) })))
  }

  function addRow() {
    const row = emptyRow()
    onChange([...rows, row], fovs)
    setOpen((prev) => [...prev, row.key])
  }

  function duplicate(key: string) {
    const source = rows.find((r) => r.key === key)
    if (!source) return
    const copy = duplicateRow(source)
    const next: AntibodyRow[] = []
    for (const r of rows) {
      next.push(r)
      if (r.key === key) next.push(copy)
    }
    onChange(next, fovs)
    setOpen((prev) => [...prev, copy.key])
  }

  function remove(key: string) {
    setRows(rows.filter((r) => r.key !== key))
    setOpen((prev) => prev.filter((k) => k !== key))
  }

  return (
    <div className="space-y-3">
      <Accordion type="multiple" value={open} onValueChange={setOpen}>
        {rows.map((row, index) => {
          const rowInvalid = invalid(row.key, "markerName") || invalid(row.key, "images")
          const detection = summaryDetection(row)
          return (
            <AccordionItem key={row.key} value={row.key}>
              <div className="flex items-center gap-1 pr-2">
                <div className="min-w-0 flex-1">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                      {rowInvalid && (
                        <span
                          className="size-2 shrink-0 rounded-full bg-destructive"
                          title="Incomplete required fields"
                        />
                      )}
                      <span className="font-medium">{rowLabel(row, index)}</span>
                      {row.cellTypes.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {row.cellTypes.length} cell type{row.cellTypes.length === 1 ? "" : "s"}
                        </span>
                      )}
                      {row.images.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {row.images.length} image{row.images.length === 1 ? "" : "s"}
                        </span>
                      )}
                      {row.dilution && <span className="text-xs text-muted-foreground">{row.dilution}</span>}
                      {detection && (
                        <Badge variant="secondary" className="text-xs font-normal">
                          {detection}
                        </Badge>
                      )}
                      {row.recommendation && (
                        <Badge variant="outline" className="text-xs font-normal">
                          {RECOMMENDATION_LABELS[row.recommendation]}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                </div>

                <div className="flex shrink-0 items-center gap-0.5">
                  <AntibodyRridButton rrid={row.rrid} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground"
                    title="Duplicate antibody"
                    onClick={() => duplicate(row.key)}
                  >
                    <Copy className="size-4" />
                    <span className="sr-only">Duplicate antibody</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    title="Remove antibody"
                    disabled={rows.length === 1}
                    onClick={() => remove(row.key)}
                  >
                    <Trash2 className="size-4" />
                    <span className="sr-only">Remove antibody</span>
                  </Button>
                </div>
              </div>

              <AccordionContent className="!h-auto">
                <AntibodyEditor
                  row={row}
                  onChange={(patch) => updateRow(row.key, patch)}
                  organismId={organismId}
                  invalid={(field) => invalid(row.key, field)}
                  hasLabs={hasLabs}
                  terms={terms}
                  images={
                    <ImageUpload
                      images={row.images}
                      fovs={fovs}
                      markerLabel={rowLabel(row, index)}
                      availableCellTypes={row.cellTypes}
                      peers={rows.flatMap((peer, peerIndex) =>
                        peer.key === row.key
                          ? []
                          : [{ key: peer.key, label: rowLabel(peer, peerIndex), images: peer.images }],
                      )}
                      invalid={invalid(row.key, "images")}
                      onSave={(draft) => saveFov(row.key, draft)}
                      onRemove={removeFov}
                    />
                  }
                />
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="size-4" />
          Add antibody
        </Button>
      </div>
    </div>
  )
}
