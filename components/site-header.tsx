"use client"

import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Plus, Search } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export function SiteHeader({ children }: { children?: React.ReactNode }) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = searchQuery.trim()
    if (trimmed) {
      router.push(`/browse?q=${encodeURIComponent(trimmed)}`)
      setSearchQuery("")
    }
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex w-full items-center gap-2 px-4 lg:gap-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-1 h-10" />

        <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search cell types, proteins..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9"
          />
        </form>

        <div className="ml-auto flex items-center gap-2">
          <Button asChild size="sm" className="h-9">
            <Link href="/submit">
              <Plus className="size-4" />
              <span className="hidden sm:inline">Submit</span>
            </Link>
          </Button>
          <ThemeToggle />
          {children}
        </div>
      </div>
    </header>
  )
}
