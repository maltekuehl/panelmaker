"use client"

import { NotAvailable } from "@/components/shared/not-available"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useRef, useState } from "react"

type TruncatedTextProps = {
  text: string
  href?: string
  className?: string
}

export function TruncatedText({ text, href, className }: TruncatedTextProps) {
  const ref = useRef<HTMLElement>(null)
  const [open, setOpen] = useState(false)

  const handleOpenChange = (next: boolean) => {
    const el = ref.current
    setOpen(next && el !== null && el.scrollWidth > el.clientWidth)
  }

  const classes = cn("block truncate", href && "text-primary hover:underline", className)

  return (
    <Tooltip open={open} onOpenChange={handleOpenChange}>
      <TooltipTrigger asChild>
        {href ? (
          <Link ref={ref as React.Ref<HTMLAnchorElement>} href={href} className={classes}>
            {text}
          </Link>
        ) : (
          <span ref={ref as React.Ref<HTMLSpanElement>} className={classes}>
            {text}
          </span>
        )}
      </TooltipTrigger>
      <TooltipContent className="max-w-sm break-words">{text}</TooltipContent>
    </Tooltip>
  )
}

export function TruncatedOrNotAvailable({
  value,
  className,
}: {
  value: string | null | undefined
  className?: string
}) {
  if (!value || value.trim() === "") return <NotAvailable />
  return <TruncatedText text={value} className={className} />
}
