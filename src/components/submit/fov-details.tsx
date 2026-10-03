"use client"

import { FluorophoreCombobox } from "@/components/fluorophore-combobox"
import { OntologyMultiCombobox } from "@/components/ontology-multi-combobox"
import { Field } from "@/components/shared/field"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  IMAGE_CAPTION_MAX_LENGTH,
  MAX_FOVS_PER_REPORT,
  MAX_REFERENCES_PER_FOV,
  REFERENCE_LABEL_MAX_LENGTH,
} from "@/models/experimental-report/schema"
import { Plus, Trash2 } from "lucide-react"
import { ColorField } from "./color-field"
import { emptyReference, type FovDraft, type FovReference, type ReferenceRole, type RowImage } from "./types"

const CAPTION_PLACEHOLDER =
  "Human tonsil: CD3 (green), CD20 (red) and DAPI (blue). Germinal centre at the centre of the field."

const ROLE_OPTIONS: { value: ReferenceRole; label: string }[] = [
  { value: "NUCLEAR", label: "Nuclear" },
  { value: "STRUCTURAL", label: "Structural" },
]

export type FovPeer = { key: string; label: string; images: RowImage[] }

export function FovDetails({
  draft,
  onChange,
  markerLabel,
  peers,
}: {
  draft: FovDraft
  onChange: (draft: FovDraft) => void
  markerLabel: string
  peers: FovPeer[]
}) {
  const shared = new Set(draft.sharedWith)

  function setShared(peerKey: string, on: boolean) {
    const next = new Set(shared)
    if (on) next.add(peerKey)
    else next.delete(peerKey)
    onChange({ ...draft, sharedWith: [...next] })
  }

  function updateReference(key: string, patch: Partial<FovReference>) {
    onChange({ ...draft, references: draft.references.map((r) => (r.key === key ? { ...r, ...patch } : r)) })
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[14rem_minmax(0,1fr)]">
        <div className="aspect-square w-full max-w-56 overflow-hidden rounded-md border bg-muted/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={draft.url} alt="Field of view" className="size-full object-contain" />
        </div>

        <div className="space-y-5">
          <Field label="Cell types shown in this image">
            <OntologyMultiCombobox
              ontologyType="cl"
              values={draft.cellTypes}
              onChange={(cellTypes) => onChange({ ...draft, cellTypes })}
              placeholder="Search Cell Ontology…"
            />
          </Field>

          <Field label={`Colour of ${markerLabel} in this image`}>
            <ColorField
              value={draft.displayColor}
              onChange={(displayColor) => onChange({ ...draft, displayColor })}
              label={`Colour of ${markerLabel} in this image`}
            />
          </Field>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Also shows</p>
            {peers.length > 0 ? (
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {peers.map((peer) => {
                  const checked = shared.has(peer.key)
                  const alreadyHas = peer.images.some((im) => im.url === draft.url)
                  const full = !checked && !alreadyHas && peer.images.length >= MAX_FOVS_PER_REPORT
                  return (
                    <label
                      key={peer.key}
                      className={cn("flex items-center gap-2 text-sm", full && "text-muted-foreground")}
                      title={full ? `${peer.label} already has ${MAX_FOVS_PER_REPORT} images` : undefined}
                    >
                      <Checkbox
                        checked={checked}
                        disabled={full}
                        onCheckedChange={(next) => setShared(peer.key, next === true)}
                      />
                      <span className="max-w-[12rem] truncate">{peer.label}</span>
                    </label>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Add the other antibodies of this run to mark which of them are visible in this image.
              </p>
            )}
          </div>

          <Field label="Caption" hint="What is visible and how it is coloured. Shared by every antibody in this image.">
            <Textarea
              value={draft.caption}
              onChange={(e) => onChange({ ...draft, caption: e.target.value.slice(0, IMAGE_CAPTION_MAX_LENGTH) })}
              maxLength={IMAGE_CAPTION_MAX_LENGTH}
              rows={3}
              placeholder={CAPTION_PLACEHOLDER}
            />
          </Field>
        </div>
      </div>

      <div className="space-y-3 border-t pt-5">
        <div className="flex items-center justify-between gap-3">
          <Label className="text-sm font-semibold">Counterstains in this image</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={draft.references.length >= MAX_REFERENCES_PER_FOV}
            onClick={() => onChange({ ...draft, references: [...draft.references, emptyReference()] })}
          >
            <Plus className="size-4" />
            Add counterstain
          </Button>
        </div>
        {draft.references.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nuclear or structural stains such as DAPI or phalloidin, up to {MAX_REFERENCES_PER_FOV}.
          </p>
        ) : (
          <div className="divide-y rounded-md border">
            {draft.references.map((reference) => (
              <div
                key={reference.key}
                className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-[8rem_minmax(0,1fr)_12rem_9rem_auto] sm:items-center"
              >
                <Select
                  value={reference.role || undefined}
                  onValueChange={(role) => updateReference(reference.key, { role: role as ReferenceRole })}
                >
                  <SelectTrigger className="w-full" aria-label="Counterstain role">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={reference.label}
                  onChange={(e) => updateReference(reference.key, { label: e.target.value })}
                  maxLength={REFERENCE_LABEL_MAX_LENGTH}
                  placeholder="Name, e.g. DAPI"
                  aria-label="Counterstain name"
                />
                <FluorophoreCombobox
                  value={reference.fluorophore}
                  onChange={(fluorophore) => updateReference(reference.key, { fluorophore })}
                />
                <ColorField
                  value={reference.displayColor}
                  onChange={(displayColor) => updateReference(reference.key, { displayColor })}
                  label={`Colour of ${reference.label.trim() || "this counterstain"} in this image`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="justify-self-end text-muted-foreground hover:text-destructive"
                  onClick={() =>
                    onChange({ ...draft, references: draft.references.filter((r) => r.key !== reference.key) })
                  }
                  title="Remove counterstain"
                >
                  <Trash2 className="size-4" />
                  <span className="sr-only">Remove counterstain</span>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
