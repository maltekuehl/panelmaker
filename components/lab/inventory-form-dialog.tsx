"use client"

import { AntibodyRegistryCombobox, type AntibodyRegistryValue } from "@/components/antibody-registry-combobox"
import { OntologyCombobox } from "@/components/ontology-combobox"
import { ProteinCombobox } from "@/components/submit/protein-combobox"
import type { ProteinValue } from "@/components/submit/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import type { InventoryItem } from "./inventory-columns"

type OntologyValue = { id: string; label: string }

const STATUS_OPTIONS = [
  { value: "IN_STOCK", label: "In stock" },
  { value: "LOW", label: "Low" },
  { value: "ORDERED", label: "Ordered" },
  { value: "OUT_OF_STOCK", label: "Out of stock" },
]

interface InventoryFormDialogProps {
  labId: string
  mode: "add" | "edit"
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: InventoryItem | null
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium">{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  )
}

export function InventoryFormDialog({ labId, mode, open, onOpenChange, item }: InventoryFormDialogProps) {
  const router = useRouter()

  const [registry, setRegistry] = useState<AntibodyRegistryValue | null>(null)
  const [rrid, setRrid] = useState("")
  const [markerProtein, setMarkerProtein] = useState<ProteinValue | null>(null)
  const [markerName, setMarkerName] = useState("")
  const [hostSpecies, setHostSpecies] = useState<OntologyValue | null>(null)

  const [status, setStatus] = useState("IN_STOCK")
  const [storageLocation, setStorageLocation] = useState("")
  const [freezerLocation, setFreezerLocation] = useState("")
  const [lotNumber, setLotNumber] = useState("")
  const [vendorCatalog, setVendorCatalog] = useState("")
  const [aliquots, setAliquots] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  // Reset/prefill whenever the dialog opens.
  useEffect(() => {
    if (!open) return
    if (mode === "edit" && item) {
      setStatus(item.status)
      setStorageLocation(item.storageLocation ?? "")
      setFreezerLocation(item.freezerLocation ?? "")
      setLotNumber(item.lotNumber ?? "")
      setVendorCatalog(item.vendorCatalog ?? "")
      setAliquots(item.aliquotsRemaining !== null ? String(item.aliquotsRemaining) : "")
      setNotes(item.notes ?? "")
    } else {
      setRegistry(null)
      setRrid("")
      setMarkerProtein(null)
      setMarkerName("")
      setHostSpecies(null)
      setStatus("IN_STOCK")
      setStorageLocation("")
      setFreezerLocation("")
      setLotNumber("")
      setVendorCatalog("")
      setAliquots("")
      setNotes("")
    }
  }, [open, mode, item])

  // Auto-fill identity fields from the antibody registry, mirroring the submit form.
  async function handleRegistry(value: AntibodyRegistryValue | null) {
    setRegistry(value)
    if (!value) {
      setRrid("")
      setMarkerName("")
      setMarkerProtein(null)
      setHostSpecies(null)
      setVendorCatalog("")
      return
    }
    setRrid(value.citation || "")
    setMarkerName((prev) => value.target || prev)
    setVendorCatalog((prev) => value.catalogNumber || prev)
    // The registry record carries no UniProt id, and lab inventory has no experiment organism to
    // constrain a resolution by, so the user picks the target protein themselves rather than risk a
    // wrong-species accession.
    if (value.sourceOrganism) {
      try {
        const res = await fetch(
          `/api/ontology?type=ncbi_taxonomy&q=${encodeURIComponent(value.sourceOrganism)}&limit=1`,
        )
        if (res.ok) {
          const data = await res.json()
          const match = data.results?.[0]
          if (match) setHostSpecies({ id: match.id, label: match.label })
        }
      } catch {
        // best-effort; host species stays editable
      }
    }
  }

  function parsedAliquots(): number | null {
    const trimmed = aliquots.trim()
    if (!trimmed) return null
    const n = Number(trimmed)
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null
  }

  async function handleSave() {
    setSaving(true)
    try {
      let res: Response
      if (mode === "edit" && item) {
        res = await fetch(`/api/labs/${labId}/inventory/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            storageLocation: storageLocation.trim() || null,
            freezerLocation: freezerLocation.trim() || null,
            lotNumber: lotNumber.trim() || null,
            vendorCatalog: vendorCatalog.trim() || null,
            aliquotsRemaining: parsedAliquots(),
            notes: notes.trim() || null,
          }),
        })
      } else {
        const resolvedRrid = rrid.trim() || registry?.citation || ""
        if (!resolvedRrid) {
          toast.error("Pick an antibody with an RRID, or enter one manually")
          setSaving(false)
          return
        }
        res = await fetch(`/api/labs/${labId}/inventory`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rrid: resolvedRrid,
            markerName: markerName.trim() || undefined,
            proteinData: markerProtein
              ? { id: markerProtein.id, label: markerProtein.label, geneSymbol: markerProtein.geneSymbol ?? null }
              : undefined,
            hostSpecies: hostSpecies ?? undefined,
            status,
            storageLocation: storageLocation.trim() || undefined,
            freezerLocation: freezerLocation.trim() || undefined,
            lotNumber: lotNumber.trim() || undefined,
            vendorCatalog: vendorCatalog.trim() || undefined,
            aliquotsRemaining: parsedAliquots() ?? undefined,
            notes: notes.trim() || undefined,
          }),
        })
      }

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Failed to save antibody")
        return
      }
      toast.success(mode === "edit" ? "Inventory updated" : "Antibody added to inventory")
      onOpenChange(false)
      router.refresh()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit inventory item" : "Add antibody to inventory"}</DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Update stock and storage details for this antibody."
              : "Search the antibody registry to import its details, then record how your lab stocks it."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {mode === "edit" && item ? (
            <div className="rounded-md border bg-muted/30 px-3 py-2">
              <div className="font-medium">{item.antibody.name}</div>
              {item.antibody.rrid && (
                <div className="font-mono text-xs text-muted-foreground">{item.antibody.rrid}</div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Field label="Antibody">
                <AntibodyRegistryCombobox value={registry} onChange={handleRegistry} showDetails={false} />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="RRID">
                  <Input
                    value={rrid}
                    onChange={(e) => setRrid(e.target.value)}
                    placeholder="AB_302411"
                    className="font-mono"
                  />
                </Field>
                <Field label="Marker name">
                  <Input
                    value={markerName}
                    onChange={(e) => setMarkerName(e.target.value)}
                    placeholder="CD3e, Ki-67, PanCK"
                  />
                </Field>
                <Field label="Target protein">
                  <ProteinCombobox value={markerProtein} onChange={setMarkerProtein} />
                </Field>
                <Field label="Host species" hint="The species this antibody was raised in.">
                  <OntologyCombobox
                    ontologyType="ncbi_taxonomy"
                    value={hostSpecies}
                    onChange={setHostSpecies}
                    placeholder="Raised in..."
                  />
                </Field>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 border-t pt-5 sm:grid-cols-2">
            <Field label="Status">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Aliquots remaining">
              <Input type="number" min={0} value={aliquots} onChange={(e) => setAliquots(e.target.value)} />
            </Field>
            <Field label="Storage location">
              <Input
                value={storageLocation}
                onChange={(e) => setStorageLocation(e.target.value)}
                placeholder="Fridge A, shelf 2"
              />
            </Field>
            <Field label="Freezer location">
              <Input
                value={freezerLocation}
                onChange={(e) => setFreezerLocation(e.target.value)}
                placeholder="-20C, box 4"
              />
            </Field>
            <Field label="Lot number">
              <Input value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} className="font-mono" />
            </Field>
            <Field label="Vendor catalog #">
              <Input value={vendorCatalog} onChange={(e) => setVendorCatalog(e.target.value)} className="font-mono" />
            </Field>
          </div>

          <Field label="Notes">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Working dilution, troubleshooting, anything else worth noting..."
              className="min-h-[60px]"
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {mode === "edit" ? "Save changes" : "Add antibody"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
