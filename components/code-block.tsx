"use client"

import { cn } from "@/lib/utils"
import { toHtml } from "hast-util-to-html"
import "highlight.js/styles/github-dark.css"
import DOMPurify from "isomorphic-dompurify"
import { createLowlight } from "lowlight"
import { Check, Copy } from "lucide-react"
import React from "react"

// Import only essential languages to keep bundle size small
import bash from "highlight.js/lib/languages/bash"
import json from "highlight.js/lib/languages/json"
import python from "highlight.js/lib/languages/python"
import typescript from "highlight.js/lib/languages/typescript"

// DOMPurify configuration for syntax highlighting
// Only allow tags and attributes needed for code highlighting
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: ["span", "code", "pre", "br"],
  ALLOWED_ATTR: ["class"],
  KEEP_CONTENT: true,
  RETURN_TRUSTED_TYPE: false,
}

interface CodeBlockProps {
  value: string
  language?: string
  className?: string
}

// Create and configure lowlight instance once at module level
const lowlight = createLowlight()

// Register essential languages for README/documentation
lowlight.register("javascript", typescript)
lowlight.register("js", typescript)
lowlight.register("typescript", typescript)
lowlight.register("ts", typescript)
lowlight.register("python", python)
lowlight.register("py", python)
lowlight.register("bash", bash)
lowlight.register("sh", bash)
lowlight.register("shell", bash)
lowlight.register("json", json)
lowlight.register("jsonc", json)

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

const CodeBlock: React.FC<CodeBlockProps> = ({ value, language = "text", className }) => {
  const [isCopied, setIsCopied] = React.useState(false)

  // lowlight and DOMPurify are synchronous and SSR-safe, so the highlighted markup is derived
  // during render instead of through an effect that would flash unhighlighted code first.
  let highlightedCode: string
  try {
    if (lowlight.registered(language)) {
      const tree = lowlight.highlight(language, value)
      const html = toHtml(tree, { allowDangerousCharacters: true, closeSelfClosing: false })
      highlightedCode = DOMPurify.sanitize(html, SANITIZE_CONFIG)
    } else {
      highlightedCode = escapeHtml(value)
    }
  } catch (error) {
    console.error("Failed to highlight code:", error)
    highlightedCode = escapeHtml(value)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy code:", error)
    }
  }

  return (
    <div className={cn("group code-block relative", className)}>
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 z-10 rounded-md bg-muted p-2 opacity-0 transition-colors hover:bg-muted/80 group-hover:opacity-100"
        aria-label="Copy code"
      >
        {isCopied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
      </button>
      <pre
        className="hljs overflow-x-auto whitespace-pre rounded-lg p-4 font-mono text-sm leading-relaxed"
        dangerouslySetInnerHTML={{ __html: highlightedCode }}
      />
    </div>
  )
}

export default CodeBlock
