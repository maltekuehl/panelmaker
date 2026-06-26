"use client"

import { OntologyCombobox } from "@/components/ontology-combobox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

type OntologyValue = { id: string; label: string }

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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [verificationError, setVerificationError] = useState(false)

  // On create, omit empty fields (the schema treats them as optional). On edit, send null to clear.
  const emptyValue = mode === "edit" ? null : undefined

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Name is required")
      return
    }
    setIsSubmitting(true)
    setVerificationError(false)
    try {
      const payload = {
        name: name.trim(),
        institution: institution?.label ?? emptyValue,
        institutionId: institution?.id ?? emptyValue,
        website: website.trim() || emptyValue,
        description: description.trim() || emptyValue,
        isPublicProfile,
      }
      const url = mode === "edit" && initial?.id ? `/api/labs/${initial.id}` : "/api/labs"
      const method = mode === "edit" ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 403 && data.code === "NOT_VERIFIED") {
          setVerificationError(true)
          return
        }
        throw new Error(data.error ?? `Failed to ${mode === "edit" ? "update" : "create"} lab`)
      }

      if (mode === "create") {
        toast.success("Lab created")
        router.push(`/labs/${data.lab.slug}`)
      } else {
        toast.success("Lab updated")
        router.refresh()
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {verificationError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Your account must be verified by an admin before you can create a lab. Contact an administrator to get access.
        </div>
      )}

      <div>
        <Label htmlFor="lab-name" className="text-sm font-medium">
          Name
        </Label>
        <Input
          id="lab-name"
          placeholder="e.g. Smith Imaging Lab"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="max-w-md"
        />
      </div>

      <div>
        <Label className="text-sm font-medium">Institution</Label>
        <p className="text-xs text-muted-foreground mb-1">
          Search by institution name. Powered by the{" "}
          <a href="https://ror.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Research Organization Registry
          </a>
          .
        </p>
        <div className="max-w-md">
          <OntologyCombobox
            ontologyType="ror"
            value={institution}
            onChange={setInstitution}
            placeholder="Search institution..."
          />
        </div>
      </div>

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
          placeholder="Describe your lab and its research focus..."
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

      <Button onClick={handleSave} disabled={isSubmitting} size="sm">
        {isSubmitting && <Loader2 className="size-4 animate-spin mr-2" />}
        {mode === "create" ? "Create lab" : "Save changes"}
      </Button>
    </div>
  )
}
