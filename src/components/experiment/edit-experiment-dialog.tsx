"use client"

import { SpecimenSection } from "@/components/submit/specimen-section"
import {
  PRESERVATION_OPTIONS,
  specimenPayload,
  type OntologyValue,
  type SpecimenContext,
} from "@/components/submit/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Pencil } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

export type EditableExperiment = {
  id: string
  name: string | null
  description: string | null
  citation: string | null
  pmid: string | null
  doi: string | null
  species: OntologyValue | null
  preservation: string | null
  specimen: SpecimenContext
}

export function EditExperimentDialog({ experiment, canEdit }: { experiment: EditableExperiment; canEdit: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState(experiment.name ?? "")
  const [description, setDescription] = useState(experiment.description ?? "")
  const [citation, setCitation] = useState(experiment.citation ?? "")
  const [pmid, setPmid] = useState(experiment.pmid ?? "")
  const [doi, setDoi] = useState(experiment.doi ?? "")
  const [preservation, setPreservation] = useState(experiment.preservation ?? "")
  const [specimen, setSpecimen] = useState<SpecimenContext>(experiment.specimen)

  if (!canEdit) return null

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Experiment name is required.")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/experiments/${experiment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          citation: citation.trim() || undefined,
          pmid: pmid.trim() || undefined,
          doi: doi.trim() || undefined,
          preservation: preservation || undefined,
          ...specimenPayload(specimen),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const details = data?.details ? `: ${JSON.stringify(data.details)}` : ""
        toast.error((data?.error ?? "Failed to update experiment.") + details)
        return
      }
      toast.success("Experiment updated.")
      setOpen(false)
      router.refresh()
    } catch {
      toast.error("An unexpected error occurred. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="size-4" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit experiment</DialogTitle>
          <DialogDescription>Update the name, publication details and specimen metadata.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="exp-name">Experiment name</Label>
            <Input
              id="exp-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Tonsil CODEX immune panel"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exp-description">Description (optional)</Label>
            <Textarea
              id="exp-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exp-citation">Citation, APA format (optional)</Label>
            <Textarea
              id="exp-citation"
              value={citation}
              onChange={(event) => setCitation(event.target.value)}
              placeholder="Author, A. A. (Year). Title of work. Journal, Volume(Issue), pages."
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exp-preservation">Preservation (optional)</Label>
            <Select value={preservation} onValueChange={setPreservation}>
              <SelectTrigger id="exp-preservation">
                <SelectValue placeholder="Select preservation" />
              </SelectTrigger>
              <SelectContent>
                {PRESERVATION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <SpecimenSection specimen={specimen} species={experiment.species} onChange={setSpecimen} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="exp-pmid">PMID (optional)</Label>
              <Input
                id="exp-pmid"
                value={pmid}
                onChange={(event) => setPmid(event.target.value)}
                placeholder="e.g. 38000000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-doi">DOI (optional)</Label>
              <Input
                id="exp-doi"
                value={doi}
                onChange={(event) => setDoi(event.target.value)}
                placeholder="e.g. 10.1038/s41586-024-00000-0"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
