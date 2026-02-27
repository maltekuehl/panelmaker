"use client"

import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  Code2,
  FileUp,
  Home,
  KeyRound,
  Palette,
  Search,
  ShieldUser,
  TrainTrack,
  Users2,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const sidebarItems = [
  {
    title: "Introduction",
    items: [
      {
        title: "Start",
        href: "/docs",
        icon: Home,
      },
    ],
  },
  {
    title: "Getting Started",
    items: [
      {
        title: "Browse Markers",
        href: "/docs/getting-started/browse",
        icon: Search,
      },
      {
        title: "Design Panels",
        href: "/docs/getting-started/panels",
        icon: Palette,
      },
      {
        title: "Submit Reports",
        href: "/docs/getting-started/submit",
        icon: FileUp,
      },
      {
        title: "AI Assistant",
        href: "/docs/getting-started/ai",
        icon: Bot,
      },
    ],
  },
  {
    title: "API",
    items: [
      {
        title: "Public API",
        href: "/docs/api",
        icon: Code2,
      },
      {
        title: "Authentication",
        href: "/docs/api/auth",
        icon: KeyRound,
      },
    ],
  },
  {
    title: "Community",
    items: [
      {
        title: "Team",
        href: "/docs/community/team",
        icon: Users2,
      },
      {
        title: "Roadmap",
        href: "/docs/community/roadmap",
        icon: TrainTrack,
      },
      {
        title: "Code of Conduct",
        href: "/docs/community/conduct",
        icon: ShieldUser,
      },
    ],
  },
]

const flattenSidebarItems = (items: typeof sidebarItems) => {
  const flattened: Array<{ title: string; href: string; icon: any }> = []
  items.forEach((group) => {
    group.items.forEach((item) => {
      flattened.push(item)
    })
  })
  return flattened
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const allPages = flattenSidebarItems(sidebarItems)
  const currentPageIndex = allPages.findIndex((page) => page.href === pathname)
  const previousPage = currentPageIndex > 0 ? allPages[currentPageIndex - 1] : null
  const nextPage = currentPageIndex < allPages.length - 1 ? allPages[currentPageIndex + 1] : null

  return (
    <div className="sticky lg:container !ps-0 inset-0 top-[4.125rem] z-40">
      <SidebarProvider>
        <div className="left-0 right-0 flex h-full w-full">
          <Sidebar className="md:top-[4.125rem] border-r" side="left">
            <SidebarContent className="p-4">
              {sidebarItems.map((item) => (
                <SidebarGroup key={item.title}>
                  <SidebarGroupLabel>{item.title}</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {item.items.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href

                        return (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild isActive={isActive}>
                              <Link href={item.href}>
                                <Icon className="w-4 h-4 mr-2" />
                                {item.title}
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              ))}
            </SidebarContent>
          </Sidebar>
          <SidebarInset className="w-full flex-1 min-w-0 !bg-zinc-50 dark:!bg-zinc-950">
            <div className="flex flex-col h-full w-full min-w-0">
              <header className="flex h-12 shrink-0 items-center gap-2 px-4 bg-muted/30 border-b w-full">
                <SidebarTrigger className="-ml-1 lg:hidden" />
                <div className="h-4 w-px bg-border lg:hidden" />
                <div className="text-lg font-semibold">Documentation</div>
              </header>
              <div className="overflow-auto w-full min-w-0">
                {children}

                {/* Previous/Next Navigation */}
                <div className="flex justify-between items-center py-3 px-2 border-t mt-8">
                  <div>
                    {previousPage && (
                      <Button variant="ghost" asChild className="flex items-center gap-2 p-3 h-auto">
                        <Link href={previousPage.href}>
                          <ChevronLeft className="w-4 h-4" />
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
                      <Button variant="ghost" asChild className="flex items-center gap-2 p-3 h-auto">
                        <Link href={nextPage.href}>
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">Next</div>
                            <div className="font-medium">{nextPage.title}</div>
                          </div>
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  )
}
