"use client"

import { SidebarLayout } from "@/components/shared/sidebar-layout"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  Code2,
  FileText,
  FileUp,
  Home,
  Info,
  KeyRound,
  Lock,
  Palette,
  Scale,
  Search,
  Server,
  ShieldUser,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const sidebarItems = [
  {
    title: "Introduction",
    items: [{ title: "Start", href: "/docs", icon: Home }],
  },
  {
    title: "Getting Started",
    items: [
      { title: "Browse Markers", href: "/docs/getting-started/browse", icon: Search },
      { title: "Design Panels", href: "/docs/getting-started/panels", icon: Palette },
      { title: "Submit Reports", href: "/docs/getting-started/submit", icon: FileUp },
      { title: "AI Assistant", href: "/docs/getting-started/ai", icon: Bot },
      { title: "Running Your Own Instance", href: "/docs/getting-started/self-hosting", icon: Server },
    ],
  },
  {
    title: "API",
    items: [
      { title: "Public API", href: "/docs/api", icon: Code2 },
      { title: "Authentication", href: "/docs/api/auth", icon: KeyRound },
    ],
  },
  {
    title: "About",
    items: [
      { title: "About PanelMaker", href: "/docs/about", icon: Info },
      { title: "Code of Conduct", href: "/docs/community/conduct", icon: ShieldUser },
    ],
  },
  {
    title: "Legal",
    items: [
      { title: "Legal Notice", href: "/docs/legal/notice", icon: Scale },
      { title: "Privacy Policy", href: "/docs/legal/privacy", icon: Lock },
      { title: "Terms", href: "/docs/legal/terms", icon: FileText },
    ],
  },
]

const flattenSidebarItems = (items: typeof sidebarItems) => items.flatMap((group) => group.items)

function DocsNav({ pathname }: { pathname: string }) {
  return (
    <nav className="flex flex-col gap-5">
      {sidebarItems.map((group) => (
        <div key={group.title} className="flex flex-col gap-1">
          <span className="px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">{group.title}</span>
          {group.items.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {item.title}
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const allPages = flattenSidebarItems(sidebarItems)
  const currentPageIndex = allPages.findIndex((page) => page.href === pathname)
  const previousPage = currentPageIndex > 0 ? allPages[currentPageIndex - 1] : null
  const nextPage = currentPageIndex < allPages.length - 1 ? allPages[currentPageIndex + 1] : null

  return (
    <SidebarLayout sidebar={<DocsNav pathname={pathname} />} className="pt-8 pb-32">
      <details key={pathname} className="mb-6 rounded-lg border p-3 lg:hidden">
        <summary className="cursor-pointer text-sm font-medium">Documentation menu</summary>
        <div className="mt-4">
          <DocsNav pathname={pathname} />
        </div>
      </details>

      {children}

      <div className="mt-8 flex items-center justify-between border-t px-2 py-3">
        <div>
          {previousPage && (
            <Button variant="ghost" asChild className="flex h-auto items-center gap-2 p-3">
              <Link href={previousPage.href}>
                <ChevronLeft className="size-4" />
                <div className="text-left">
                  <div className="text-sm text-muted-foreground">Previous</div>
                  <div className="font-medium">{previousPage.title}</div>
                </div>
              </Link>
            </Button>
          )}
        </div>
        <div>
          {nextPage && (
            <Button variant="ghost" asChild className="flex h-auto items-center gap-2 p-3">
              <Link href={nextPage.href}>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Next</div>
                  <div className="font-medium">{nextPage.title}</div>
                </div>
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </SidebarLayout>
  )
}
