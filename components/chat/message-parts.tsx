"use client"

import { ToolResultCard, type ToolPart } from "@/components/chat/tool-result-card"
import Markdown from "@/components/markdown"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { UIMessage } from "ai"
import { Check, Copy, Loader2 } from "lucide-react"
import { Fragment, useState } from "react"

function ReasoningCard({ text, isStreaming, index }: { text: string; isStreaming: boolean; index: number }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="reasoning-invocation relative border-border bg-card px-4 py-0 duration-300 animate-in fade-in">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value={`reasoning-${index}`} className="border-none">
          <div className="flex items-center">
            <AccordionTrigger className="flex-1 overflow-hidden text-start">
              <div className="flex min-w-0 items-center gap-2">
                {isStreaming ? (
                  <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
                ) : (
                  <Check className="size-4 shrink-0 text-primary" />
                )}
                <div className="truncate text-sm font-medium text-muted-foreground">Reasoning</div>
              </div>
            </AccordionTrigger>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              aria-label="Copy reasoning to clipboard"
              className="size-8 shrink-0 p-0 text-muted-foreground hover:text-foreground"
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied && <span className="sr-only">Copied</span>}
            </Button>
          </div>
          <AccordionContent className="pt-4 pb-4">
            <div className="prose prose-sm max-w-none">
              <Markdown>{text}</Markdown>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  )
}

export function hasVisibleParts(message: UIMessage): boolean {
  return (message.parts ?? []).some(
    (part) =>
      ((part.type === "text" || part.type === "reasoning") && part.text.trim() !== "") ||
      part.type === "dynamic-tool" ||
      part.type.startsWith("tool-"),
  )
}

export function isAwaitingFirstContent(messages: UIMessage[], isStreaming: boolean): boolean {
  if (!isStreaming) return false
  const last = messages[messages.length - 1]
  return !last || last.role !== "assistant" || !hasVisibleParts(last)
}

// Renders the parts of one message. Shared by the /chat page and the floating widget so reasoning,
// tool cards and Markdown text can never appear on one surface and silently go missing on the other.
export function MessageParts({
  message,
  isStreaming,
  compact = false,
}: {
  message: UIMessage
  isStreaming: boolean
  compact?: boolean
}) {
  const parts = message.parts ?? []
  return (
    <>
      {parts.map((part, index) => {
        if (part.type === "reasoning") {
          return (
            <div key={index} className={compact ? "py-1" : "py-1.5"}>
              <ReasoningCard text={part.text} isStreaming={isStreaming && index === parts.length - 1} index={index} />
            </div>
          )
        }
        if (part.type === "dynamic-tool" || part.type.startsWith("tool-")) {
          return (
            <div key={index} className={compact ? "py-1" : "py-1.5"}>
              <ToolResultCard part={part as ToolPart} />
            </div>
          )
        }
        if (part.type === "text") {
          if (!part.text) return null
          return (
            <div
              key={index}
              className={compact ? "prose prose-compact max-w-none" : "prose prose-sm duration-300 animate-in fade-in"}
            >
              <Markdown>{part.text}</Markdown>
            </div>
          )
        }
        return <Fragment key={index} />
      })}
    </>
  )
}
