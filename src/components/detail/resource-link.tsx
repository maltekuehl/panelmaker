import { ExternalLink } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

const LINK_CLASS = "flex items-center gap-2 text-sm text-primary hover:underline"

export function ExternalResourceLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
      <ExternalLink className="h-4 w-4" />
      {children}
    </a>
  )
}

export function RelatedPageLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={LINK_CLASS}>
      <ExternalLink className="h-4 w-4" />
      {children}
    </Link>
  )
}
