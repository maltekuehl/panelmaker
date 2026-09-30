"use client"

import GitHub from "@/components/icons/github"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { BookOpen, Boxes, FlaskConical, Layers, MessageSquare, Microscope, Search, Users } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import * as React from "react"

const navItems = [
  { href: "/browse", title: "Browse", icon: Search },
  { href: "/panel", title: "Panel Designer", icon: Layers },
  { href: "/chat", title: "AI Assistant", icon: MessageSquare },
  { href: "/labs", title: "Labs", icon: FlaskConical },
  { href: "/docs", title: "Documentation", icon: BookOpen },
  { href: "/leaderboard", title: "Community", icon: Users },
]

const resourceItems = [
  { href: "/docs/about", title: "About", icon: Users, external: false },
  { href: "https://scverse.org", title: "scverse", icon: Boxes, external: true },
  { href: "https://github.com/complextissue/panelmaker", title: "GitHub", icon: GitHub, external: true },
]

const legalLinks = [
  { href: "/docs/legal/notice", title: "Legal Notice" },
  { href: "/docs/legal/terms", title: "Terms" },
  { href: "/docs/legal/privacy", title: "Privacy" },
]

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  instanceName?: string
  institution?: string | null
}

export function AppSidebar({ instanceName = "PanelMaker", institution, ...props }: AppSidebarProps) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Microscope className="size-5" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">PanelMaker</span>
                  <span className="truncate text-xs text-muted-foreground">Validated spatial proteomics</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(pathname, item.href)} tooltip={item.title}>
                    <Link href={item.href} aria-current={isActive(pathname, item.href) ? "page" : undefined}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel>Resources</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {resourceItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    {item.external ? (
                      <a href={item.href} target="_blank" rel="noopener noreferrer">
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </a>
                    ) : (
                      <Link href={item.href}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex flex-col gap-2 px-2 pb-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {legalLinks.map((l) => (
              <Link key={l.href} href={l.href} className="transition-colors hover:text-foreground">
                {l.title}
              </Link>
            ))}
          </div>
          <div className="flex flex-col">
            <span>
              {instanceName}
              {institution ? <span> ({institution})</span> : null}
            </span>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
