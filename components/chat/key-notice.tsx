"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import type { ChatErrorPayload } from "@/models/chat/errors"
import { PROVIDER_LABELS, type KeyInventory } from "@/models/chat/keys"
import type { ProviderId } from "@/models/chat/schema"
import { CircleAlert, KeyRound } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

const linkClass = "font-medium text-primary hover:underline"

interface KeyFixProps {
  inventory: KeyInventory
  labContextId: string | null
}

// The ways a viewer can get a key for a provider, most direct first: their own settings, the lab's
// settings when they may manage it (otherwise its admins), and the operator of the instance.
function KeyFixOptions({ inventory, labContextId }: KeyFixProps) {
  const lab = inventory.labs.find((entry) => entry.id === labContextId)
  return (
    <ul className="mt-1 list-disc space-y-0.5 pl-4">
      <li>
        <Link href="/settings#ai-keys" className={linkClass}>
          Add your own key
        </Link>{" "}
        in your settings.
      </li>
      {lab &&
        (lab.canManage ? (
          <li>
            <Link href={`/labs/${lab.slug}/settings#ai-keys`} className={linkClass}>
              Add a key for {lab.name}
            </Link>{" "}
            so every member can use it.
          </li>
        ) : (
          <li>Ask an admin of {lab.name} to add a lab key.</li>
        ))}
      <li>Ask the operator of this instance to configure an instance key.</li>
    </ul>
  )
}

export function MissingKeyNotice({
  provider,
  inventory,
  labContextId,
  compact,
  className,
}: KeyFixProps & { provider: ProviderId | null; compact?: boolean; className?: string }) {
  const anyKey =
    inventory.user.length > 0 || inventory.instance.length > 0 || inventory.labs.some((lab) => lab.providers.length)
  const title = anyKey
    ? `No API key for ${provider ? PROVIDER_LABELS[provider] : "this model"}`
    : "The assistant needs an API key"
  const body = anyKey
    ? "Pick a model that has a key, or make one available:"
    : "No AI provider key is configured for you yet. The assistant runs on your own key, a key shared by your lab, or a key configured by the operator of this instance:"

  return (
    <Alert className={cn(compact && "text-xs", className)}>
      <KeyRound />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{body}</p>
        <KeyFixOptions inventory={inventory} labContextId={labContextId} />
      </AlertDescription>
    </Alert>
  )
}

function errorAction(error: ChatErrorPayload, fix: KeyFixProps): ReactNode {
  const lab = fix.inventory.labs.find((entry) => entry.id === fix.labContextId)
  switch (error.code) {
    case "NO_KEY_CONFIGURED":
      return <KeyFixOptions {...fix} />
    case "KEY_UNREADABLE":
    case "INSTANCE_LIMIT_REACHED":
      return (
        <Link href="/settings#ai-keys" className={linkClass}>
          Open API key settings
        </Link>
      )
    case "PROVIDER_AUTH_FAILED":
    case "PROVIDER_RATE_LIMITED":
      if (error.source === "user") {
        return (
          <Link href="/settings#ai-keys" className={linkClass}>
            Manage your keys
          </Link>
        )
      }
      if (error.source === "lab" && lab?.canManage) {
        return (
          <Link href={`/labs/${lab.slug}/settings#ai-keys`} className={linkClass}>
            Manage {lab.name} keys
          </Link>
        )
      }
      return null
    default:
      return null
  }
}

export function ChatErrorNotice({ error, ...fix }: KeyFixProps & { error: ChatErrorPayload }) {
  const action = errorAction(error, fix)
  return (
    <Alert variant="destructive">
      <CircleAlert />
      <AlertTitle>The assistant could not answer</AlertTitle>
      <AlertDescription>
        <p>{error.message}</p>
        {action}
      </AlertDescription>
    </Alert>
  )
}
