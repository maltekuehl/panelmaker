"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

interface ApiKeyItem {
  id: string
  provider: string
  label: string | null
  last4: string | null
}

const PROVIDERS = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google (Gemini)" },
]

function providerLabel(value: string): string {
  return PROVIDERS.find((provider) => provider.value === value)?.label ?? value
}

interface ApiKeysSectionProps {
  endpoint: string
  title?: string
  description?: string
}

export function ApiKeysSection({ endpoint, title = "Model API keys", description }: ApiKeysSectionProps) {
  const [credentials, setCredentials] = useState<ApiKeyItem[]>([])
  const [encryptionConfigured, setEncryptionConfigured] = useState(true)
  const [provider, setProvider] = useState("openai")
  const [apiKey, setApiKey] = useState("")
  const [label, setLabel] = useState("")
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const response = await fetch(endpoint)
      const json = await response.json()
      setCredentials(json?.credentials ?? [])
      setEncryptionConfigured(json?.encryptionConfigured ?? true)
    } catch {
      setCredentials([])
    }
  }, [endpoint])

  useEffect(() => {
    load()
  }, [load])

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!apiKey.trim()) return
    setSaving(true)
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey: apiKey.trim(), label: label.trim() || undefined }),
      })
      if (!response.ok) {
        const json = await response.json().catch(() => ({}))
        throw new Error(json?.error ?? "Failed to save key")
      }
      toast.success("API key saved")
      setApiKey("")
      setLabel("")
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save key")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    await fetch(`${endpoint}/${id}`, { method: "DELETE" })
    toast.success("API key removed")
    await load()
  }

  return (
    <section className="space-y-4 border-t pt-6">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">
          {description ??
            "Add your own provider keys to unlock more models in the assistant. Keys are encrypted at rest and never shown again."}
        </p>
      </div>

      {!encryptionConfigured && (
        <p className="text-sm text-destructive">
          Server encryption is not configured yet, so keys cannot be saved. Contact an administrator.
        </p>
      )}

      {credentials.length > 0 && (
        <ul className="divide-y rounded-md border">
          {credentials.map((credential) => (
            <li key={credential.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0 text-sm">
                <span className="font-medium">{providerLabel(credential.provider)}</span>
                {credential.label && <span className="text-muted-foreground"> · {credential.label}</span>}
                <span className="ml-2 font-mono text-xs text-muted-foreground">••••{credential.last4 ?? ""}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(credential.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="size-4" />
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSave} className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Provider</Label>
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROVIDERS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[200px] flex-1 space-y-1">
          <Label className="text-xs">API key</Label>
          <Input
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="Paste a provider API key"
            autoComplete="off"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Label (optional)</Label>
          <Input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Personal"
            className="w-[140px]"
          />
        </div>
        <Button type="submit" disabled={saving || !apiKey.trim() || !encryptionConfigured}>
          <Plus className="size-4" />
          Save key
        </Button>
      </form>
    </section>
  )
}
