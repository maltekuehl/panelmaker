"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { Badge } from "@/components/ui/badge"
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
import { Skeleton } from "@/components/ui/skeleton"
import { PROVIDER_LABELS, type LabKeyInventory } from "@/models/chat/keys"
import { PROVIDER_IDS, type ProviderId } from "@/models/chat/schema"
import { CircleAlert, ExternalLink, Loader2, Plus, RefreshCw, ShieldCheck, Trash2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

type CredentialStatus = "UNVERIFIED" | "VALID" | "INVALID"
type KeyCheck = "VALID" | "INVALID" | "RATE_LIMITED" | "UNREACHABLE"

interface ApiKeyItem {
  id: string
  provider: string
  label: string | null
  last4: string | null
  status: CredentialStatus
  checkedAt: string | null
  updatedAt: string
}

interface Fallbacks {
  labs: LabKeyInventory[]
  instance: ProviderId[]
}

const PROVIDER_CONSOLES: Record<ProviderId, string> = {
  google: "https://aistudio.google.com/apikey",
  openai: "https://platform.openai.com/api-keys",
  anthropic: "https://console.anthropic.com/settings/keys",
}

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" })

function StatusBadge({ credential }: { credential: ApiKeyItem }) {
  if (credential.status === "VALID") {
    return (
      <Badge variant="secondary">
        <ShieldCheck />
        Verified
      </Badge>
    )
  }
  if (credential.status === "INVALID") {
    return <Badge variant="destructive">Rejected by provider</Badge>
  }
  return <Badge variant="outline">Not verified</Badge>
}

function fallbackText(provider: ProviderId, scope: "user" | "lab", fallbacks: Fallbacks): string {
  const labs = fallbacks.labs.filter((lab) => lab.providers.includes(provider)).map((lab) => lab.name)
  const instance = fallbacks.instance.includes(provider)
  if (scope === "lab") {
    return instance
      ? "Not set. Members without their own key use the instance key."
      : "Not set. Members need their own key for this provider."
  }
  if (labs.length > 0 && instance) return `Not set. The assistant uses the ${labs.join(", ")} key or the instance key.`
  if (labs.length > 0) return `Not set. The assistant uses the ${labs.join(", ")} key when acting in that lab.`
  if (instance) return "Not set. The assistant uses the instance key."
  return "Not set. Models from this provider are unavailable to you."
}

interface KeyDialogState {
  provider: ProviderId
  replacing: boolean
}

interface ApiKeysSectionProps {
  endpoint: string
  scope: "user" | "lab"
  title: string
  description: string
}

export function ApiKeysSection({ endpoint, scope, title, description }: ApiKeysSectionProps) {
  const [credentials, setCredentials] = useState<ApiKeyItem[] | null>(null)
  const [fallbacks, setFallbacks] = useState<Fallbacks>({ labs: [], instance: [] })
  const [encryptionConfigured, setEncryptionConfigured] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<KeyDialogState | null>(null)
  const [removing, setRemoving] = useState<ApiKeyItem | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const response = await fetch(endpoint)
      const json = await response.json().catch(() => null)
      if (!response.ok) {
        setCredentials([])
        setLoadError(json?.error ?? "Could not load API keys")
        return
      }
      setCredentials(json?.credentials ?? [])
      setFallbacks(json?.fallbacks ?? { labs: [], instance: [] })
      setEncryptionConfigured(json?.encryptionConfigured ?? true)
      setLoadError(null)
    } catch {
      setCredentials([])
      setLoadError("Could not load API keys")
    }
  }, [endpoint])

  useEffect(() => {
    load()
  }, [load])

  const handleTest = async (credential: ApiKeyItem) => {
    setTestingId(credential.id)
    try {
      const response = await fetch(`${endpoint}/${credential.id}/test`, { method: "POST" })
      const json = await response.json().catch(() => null)
      if (!response.ok) {
        toast.error(json?.error ?? "Could not test the key")
        return
      }
      const provider = PROVIDER_LABELS[credential.provider as ProviderId] ?? credential.provider
      const check = json?.check as KeyCheck | undefined
      if (check === "VALID") toast.success(`${provider} accepted the key`)
      else if (check === "INVALID") toast.error(`${provider} rejected the key. Replace it with a new one.`)
      else if (check === "RATE_LIMITED") toast.warning(`${provider} is rate limiting this key. Try again later.`)
      else toast.error(`${provider} could not be reached. Try again later.`)
      await load()
    } catch {
      toast.error("Could not test the key")
    } finally {
      setTestingId(null)
    }
  }

  const handleRemove = async (credential: ApiKeyItem) => {
    try {
      const response = await fetch(`${endpoint}/${credential.id}`, { method: "DELETE" })
      if (!response.ok) {
        const json = await response.json().catch(() => null)
        toast.error(json?.error ?? "Could not remove the key")
        return
      }
      toast.success("API key removed")
      await load()
    } catch {
      toast.error("Could not remove the key")
    }
  }

  return (
    <section id="ai-keys" className="scroll-mt-24 space-y-4 border-t pt-6">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}

      {!encryptionConfigured && (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>Keys cannot be stored on this instance</AlertTitle>
          <AlertDescription>
            The server has no encryption key configured. Ask the operator of this instance to set ENCRYPTION_KEY.
          </AlertDescription>
        </Alert>
      )}

      {credentials === null ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <ul className="divide-y rounded-md border">
          {PROVIDER_IDS.map((provider) => {
            const credential = credentials.find((item) => item.provider === provider)
            return (
              <li
                key={provider}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium">{PROVIDER_LABELS[provider]}</p>
                  {credential ? (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="font-mono">••••{credential.last4 ?? ""}</span>
                      {credential.label && <span>{credential.label}</span>}
                      <StatusBadge credential={credential} />
                      <span>Updated {dateFormat.format(new Date(credential.updatedAt))}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">{fallbackText(provider, scope, fallbacks)}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {credential ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTest(credential)}
                        disabled={testingId === credential.id}
                      >
                        {testingId === credential.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <RefreshCw className="size-4" />
                        )}
                        Test
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDialog({ provider, replacing: true })}
                        disabled={!encryptionConfigured}
                      >
                        Replace
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRemoving(credential)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                        Remove
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDialog({ provider, replacing: false })}
                      disabled={!encryptionConfigured}
                    >
                      <Plus className="size-4" />
                      Add key
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <KeyDialog
        key={dialog ? `${dialog.provider}-${dialog.replacing}` : "closed"}
        endpoint={endpoint}
        state={dialog}
        onClose={() => setDialog(null)}
        onSaved={async () => {
          setDialog(null)
          await load()
        }}
      />

      <AlertDialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove the {removing ? (PROVIDER_LABELS[removing.provider as ProviderId] ?? removing.provider) : ""} key?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {scope === "lab"
                ? "Members who rely on this key will fall back to their own key or the instance key."
                : "The assistant will fall back to a lab key or the instance key for this provider, if one exists."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => removing && handleRemove(removing)}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

function KeyDialog({
  endpoint,
  state,
  onClose,
  onSaved,
}: {
  endpoint: string
  state: KeyDialogState | null
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [apiKey, setApiKey] = useState("")
  const [label, setLabel] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const provider = state?.provider
  const providerName = provider ? PROVIDER_LABELS[provider] : ""

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!provider || !apiKey.trim()) return
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey: apiKey.trim(), label: label.trim() || undefined }),
      })
      const json = await response.json().catch(() => null)
      if (!response.ok) {
        setError(json?.error ?? "Could not save the key")
        return
      }
      if (json?.check === "VALID") toast.success(`${providerName} key saved and verified`)
      else toast.warning(`${providerName} key saved, but it could not be verified right now`)
      await onSaved()
    } catch {
      setError("Could not save the key")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={state !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {state?.replacing ? "Replace" : "Add"} {providerName} key
            </DialogTitle>
            <DialogDescription>
              The key is checked with {providerName} before it is saved, then stored encrypted. It is never shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="api-key-value">API key</Label>
            <Input
              id="api-key-value"
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="Paste the key"
              autoComplete="off"
              autoFocus
              aria-invalid={error ? true : undefined}
            />
            {provider && (
              <a
                href={PROVIDER_CONSOLES[provider]}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Create a key in the {providerName} console
                <ExternalLink className="size-3" />
              </a>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="api-key-label">Label (optional)</Label>
            <Input
              id="api-key-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Personal"
              maxLength={120}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || apiKey.trim().length < 8}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {saving ? "Checking" : "Save key"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
