"use client"

import { OntologyCombobox } from "@/components/ontology-combobox"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

type ProfileData = {
  name: string | null
  email: string | null
  orcid: string | null
  institution: string | null
  institutionId: string | null
}

type OntologyValue = {
  id: string
  label: string
}

type OriginalState = {
  name: string
  orcid: string
  institutionId: string | null
  institutionLabel: string | null
}

export default function ProfileSection({ name, email }: { name: string | null; email: string | null }) {
  const [displayName, setDisplayName] = useState(name ?? "")
  const [orcid, setOrcid] = useState("")
  const [institutionValue, setInstitutionValue] = useState<OntologyValue | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [original, setOriginal] = useState<OriginalState>({
    name: name ?? "",
    orcid: "",
    institutionId: null,
    institutionLabel: null,
  })

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/user/me")
      if (!res.ok) return
      const json = await res.json()
      const data = (json.data ?? json) as ProfileData
      const n = data.name ?? ""
      const o = data.orcid ?? ""
      const instId = data.institutionId ?? null
      const label = data.institution ?? null
      setDisplayName(n)
      setOrcid(o)
      setInstitutionValue(instId && label ? { id: instId, label } : null)
      setOriginal({ name: n, orcid: o, institutionId: instId, institutionLabel: label })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

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
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Your public researcher profile</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-sm font-medium">Email</Label>
          <p className="text-sm text-muted-foreground mt-1">{email || "Not set"}</p>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading profile...</span>
          </div>
        ) : (
          <>
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

            <div>
              <Label className="text-sm font-medium">Institution</Label>
              <p className="text-xs text-muted-foreground mb-1">
                Search by institution name. Powered by the{" "}
                <a
                  href="https://ror.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Research Organization Registry
                </a>
                .
              </p>
              <div className="max-w-md">
                <OntologyCombobox
                  ontologyType="ror"
                  value={institutionValue}
                  onChange={setInstitutionValue}
                  placeholder="Search institution..."
                />
              </div>
            </div>

            <Button onClick={handleSave} disabled={isSaving || !hasChanges} size="sm">
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Profile
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
