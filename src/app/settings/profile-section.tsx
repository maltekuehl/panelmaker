"use client"

import { InstitutionField } from "@/components/institution-field"
import type { OntologyValue } from "@/components/ontology-combobox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

type OriginalState = {
  name: string
  orcid: string
  institutionId: string | null
  institutionLabel: string | null
}

interface ProfileSectionProps {
  email: string | null
  name: string | null
  orcid: string | null
  institution: string | null
  institutionId: string | null
}

export default function ProfileSection({
  email,
  name,
  orcid: initialOrcid,
  institution,
  institutionId,
}: ProfileSectionProps) {
  const [displayName, setDisplayName] = useState(name ?? "")
  const [orcid, setOrcid] = useState(initialOrcid ?? "")
  const [institutionValue, setInstitutionValue] = useState<OntologyValue | null>(
    institutionId && institution ? { id: institutionId, label: institution } : null,
  )
  const [isSaving, setIsSaving] = useState(false)
  const [original, setOriginal] = useState<OriginalState>({
    name: name ?? "",
    orcid: initialOrcid ?? "",
    institutionId: institutionId,
    institutionLabel: institution,
  })

  const hasChanges =
    displayName !== original.name ||
    orcid !== original.orcid ||
    institutionValue?.id !== original.institutionId ||
    institutionValue?.label !== original.institutionLabel

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: displayName.trim() || null,
          orcid: orcid.trim() || null,
          institution: institutionValue?.label ?? null,
          institutionId: institutionValue?.id ?? null,
        }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        const detail = json.details?.[0]?.message ?? json.error ?? "Failed to save"
        toast.error(detail)
        return
      }

      setOriginal({
        name: displayName.trim(),
        orcid: orcid.trim(),
        institutionId: institutionValue?.id ?? null,
        institutionLabel: institutionValue?.label ?? null,
      })
      toast.success("Profile updated")
    } catch {
      toast.error("Failed to save profile")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="space-y-4 border-t pt-6">
      <div>
        <h2 className="text-lg font-semibold">Profile</h2>
        <p className="text-sm text-muted-foreground">Your public researcher profile</p>
      </div>
      <div>
        <Label className="text-sm font-medium">Email</Label>
        <p className="text-sm text-muted-foreground mt-1">{email || "Not set"}</p>
      </div>

      <div>
        <Label htmlFor="display-name" className="text-sm font-medium">
          Name
        </Label>
        <Input
          id="display-name"
          placeholder="Your display name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <div>
        <Label htmlFor="orcid" className="text-sm font-medium">
          ORCID
        </Label>
        <p className="text-xs text-muted-foreground mb-1">
          Your{" "}
          <a
            href="https://orcid.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            ORCID iD
          </a>{" "}
          links your PanelMaker contributions to your research identity.
        </p>
        <Input
          id="orcid"
          placeholder="0000-0002-1234-5678"
          value={orcid}
          onChange={(e) => setOrcid(e.target.value.replace(/^https?:\/\/orcid\.org\//, ""))}
          className="max-w-xs font-mono"
        />
      </div>

      <InstitutionField id="profile-institution" value={institutionValue} onChange={setInstitutionValue} />

      <Button onClick={handleSave} disabled={isSaving || !hasChanges} size="sm">
        {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
        Save Profile
      </Button>
    </section>
  )
}
