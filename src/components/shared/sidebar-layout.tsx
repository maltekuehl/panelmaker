import { cn } from "@/lib/utils"

interface SidebarLayoutProps {
  sidebar: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function SidebarLayout({ sidebar, children, className }: SidebarLayoutProps) {
  return (
    <div className="container mx-auto flex gap-8 px-4">
      <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 flex-col self-start overflow-y-auto border-r py-8 pr-4 lg:flex">
        {sidebar}
      </aside>
      <div className={cn("min-w-0 flex-1", className)}>{children}</div>
    </div>
  )
}
