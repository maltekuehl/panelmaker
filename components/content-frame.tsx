"use client"

import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"

export function ContentFrame({ children }: React.PropsWithChildren) {
  const pathname = usePathname()
  const reservesAssistantSpace = !pathname.startsWith("/chat") && !pathname.startsWith("/docs")
  return <div className={cn("min-w-0 flex-1", reservesAssistantSpace && "pb-24")}>{children}</div>
}
