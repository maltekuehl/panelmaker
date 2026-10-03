"use client"

import type { ChatSetupState } from "@/components/chat/use-chat-setup"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import {
  describeKeySource,
  groupModelsByProvider,
  modelLabel,
  PROVIDER_LABELS,
  type KeySource,
} from "@/models/chat/keys"
import {
  isReasoningEffort,
  REASONING_EFFORT_LABELS,
  REASONING_EFFORTS,
  type ReasoningEffort,
} from "@/models/chat/schema"
import { Bot, Brain, ChevronDown, KeyRound } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

function shortSource(source: KeySource | null): string {
  if (!source) return "No key"
  switch (source.kind) {
    case "user":
      return "Your key"
    case "lab":
      return source.labName ?? "Lab key"
    case "instance":
      return "Instance key"
  }
}

export function KeySourceLabel({ setup, className }: { setup: ChatSetupState; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex gap-1 min-w-0 items-center text-xs",
        setup.source ? "text-muted-foreground" : "text-destructive",
        className,
      )}
    >
      <KeyRound className="size-3 shrink-0" />
      <span className="truncate">{setup.source ? describeKeySource(setup.source) : "No key available"}</span>
    </span>
  )
}

export function ModelPicker({
  setup,
  disabled,
  children,
}: {
  setup: ChatSetupState
  disabled?: boolean
  children?: ReactNode
}) {
  const groups = groupModelsByProvider(setup.models)
  const labs = setup.inventory.labs

  return (
    <div className="flex min-w-0 items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            aria-label="Choose model"
            className="-ml-2 h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Bot className="size-3.5" />
            {modelLabel(setup.selectedModel, setup.models)}
            <ChevronDown className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuRadioGroup value={setup.selectedModel} onValueChange={setup.changeModel}>
            {groups.map((group, index) => (
              <DropdownMenuGroup key={group.provider}>
                {index > 0 && <DropdownMenuSeparator />}
                <DropdownMenuLabel>{PROVIDER_LABELS[group.provider]}</DropdownMenuLabel>
                {group.models.map((model) => (
                  <DropdownMenuRadioItem key={model.id} value={model.id} disabled={!model.source}>
                    <span className="flex-1 truncate">{model.label}</span>
                    <span className="max-w-24 truncate text-xs text-muted-foreground">{shortSource(model.source)}</span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuGroup>
            ))}
          </DropdownMenuRadioGroup>

          {labs.length > 1 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Use lab keys from</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={setup.labContextId ?? ""} onValueChange={setup.changeLab}>
                {labs.map((lab) => (
                  <DropdownMenuRadioItem key={lab.id} value={lab.id}>
                    <span className="flex-1 truncate">{lab.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {lab.providers.length === 1 ? "1 key" : `${lab.providers.length} keys`}
                    </span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings#ai-keys">
              <KeyRound />
              Manage API keys
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {children}
      <KeySourceLabel setup={setup} className="hidden sm:inline-flex" />
    </div>
  )
}

export function ReasoningPicker({
  value,
  onChange,
  disabled,
}: {
  value: ReasoningEffort
  onChange: (effort: ReasoningEffort) => void
  disabled?: boolean
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          aria-label={`Reasoning effort: ${REASONING_EFFORT_LABELS[value]}`}
          className="-ml-1 h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <Brain className="size-3.5" />
          {REASONING_EFFORT_LABELS[value]}
          <ChevronDown className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Reasoning effort</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => {
            if (isReasoningEffort(next)) onChange(next)
          }}
        >
          {REASONING_EFFORTS.map((effort) => (
            <DropdownMenuRadioItem key={effort} value={effort}>
              {REASONING_EFFORT_LABELS[effort]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <p className="px-2 py-1.5 text-xs text-muted-foreground">
          Higher effort can give better answers on complex panels, but is slower and uses more tokens.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
