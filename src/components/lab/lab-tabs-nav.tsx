"use client"

import type { LabRole } from "@/lib/generated/prisma/enums"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface LabTabsNavProps {
  slug: string
  role: LabRole
}

export function LabTabsNav({ slug, role }: LabTabsNavProps) {
  const pathname = usePathname()

  const tabs = [
    { label: "Overview", href: `/labs/${slug}` },
    { label: "Inventory", href: `/labs/${slug}/inventory` },
    { label: "Members", href: `/labs/${slug}/members` },
    ...(role === "ADMIN" || role === "OWNER" ? [{ label: "Settings", href: `/labs/${slug}/settings` }] : []),
  ]

  return (
    <nav aria-label="Lab sections" className="flex gap-1 border-b">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              isActive
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground",
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
