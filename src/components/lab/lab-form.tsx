"use client"

import { InstitutionField } from "@/components/institution-field"
import type { OntologyValue } from "@/components/ontology-combobox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useApiRequest } from "@/hooks/use-api-request"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

interface LabFormProps {
  mode: "create" | "edit"
  initial?: {
    id?: string
    name?: string
    description?: string | null
    institution?: string | null
    institutionId?: string | null
    website?: string | null
    isPublicProfile?: boolean
  }
}

export function LabForm({ mode, initial }: LabFormProps) {
  const router = useRouter()
  const [name, setName] = useState(initial?.name ?? "")
  const [website, setWebsite] = useState(initial?.website ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [isPublicProfile, setIsPublicProfile] = useState(initial?.isPublicProfile ?? false)
  const [institution, setInstitution] = useState<OntologyValue | null>(
    initial?.institution && initial?.institutionId ? { id: initial.institutionId, label: initial.institution } : null,
  )
  const { pending, request } = useApiRequest()
  const [nameError, setNameError] = useState<string | null>(null)

  // On create, omit empty fields (the schema treats them as optional). On edit, send null to clear.
  const emptyValue = mode === "edit" ? null : undefined

  async function handleSave() {
    if (!name.trim()) {
      setNameError("Name is required")
      return
    }
    setNameError(null)
    const data = await request<{ lab: { slug: string } }>(true, {
      url: mode === "edit" && initial?.id ? `/api/labs/${initial.id}` : "/api/labs",
      method: mode === "edit" ? "PATCH" : "POST",
      errorMessage: `Failed to ${mode === "edit" ? "update" : "create"} lab`,
      body: {
        name: name.trim(),
        institution: institution?.label ?? emptyValue,
        institutionId: institution?.id ?? emptyValue,
        website: website.trim() || emptyValue,
        description: description.trim() || emptyValue,
        isPublicProfile,
      },
    })
    if (!data) return
    if (mode === "create") {
      toast.success("Lab created")
      router.push(`/labs/${data.lab.slug}`)
    } else {
      toast.success("Lab updated")
      router.refresh()
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        handleSave()
      }}
    >
      <div>
        <Label htmlFor="lab-name" className="text-sm font-medium">
          Name
        </Label>
        <Input
          id="lab-name"
          placeholder="e.g. Smith Imaging Lab"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={nameError !== null}
          aria-describedby={nameError ? "lab-name-error" : undefined}
          className="max-w-md"
        />
        {nameError && (
          <p id="lab-name-error" className="mt-1 text-sm text-destructive">
            {nameError}
          </p>
        )}
      </div>

      <InstitutionField id="lab-institution" value={institution} onChange={setInstitution} />

      <div>
        <Label htmlFor="lab-website" className="text-sm font-medium">
          Website
        </Label>
        <Input
          id="lab-website"
          type="url"
          placeholder="https://lab.example.com"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className="max-w-md"
        />
      </div>

      <div>
        <Label htmlFor="lab-description" className="text-sm font-medium">
          Description
        </Label>
        <Textarea
          id="lab-description"
          placeholder="Describe your lab and its research focus…"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="max-w-md"
        />
      </div>

      <div className="flex max-w-md items-center justify-between gap-4">
        <div className="space-y-0.5">
          <Label htmlFor="lab-public" className="text-sm font-medium">
            Public lab profile
          </Label>
          <p className="text-xs text-muted-foreground">Allow anyone to view this lab&apos;s profile page.</p>
        </div>
        <Switch id="lab-public" checked={isPublicProfile} onCheckedChange={setIsPublicProfile} />
      </div>

      <Button type="submit" disabled={pending !== null} size="sm">
        {pending !== null && <Loader2 className="size-4 animate-spin" />}
        {mode === "create" ? "Create lab" : "Save changes"}
      </Button>
    </form>
  )
}
