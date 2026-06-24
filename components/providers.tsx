"use client"

import { Toaster } from "@/components/ui/sonner"
import { SessionProvider } from "next-auth/react"
import { NuqsAdapter } from "nuqs/adapters/next/app"

interface ProvidersProps {
  children: React.ReactNode
  session?: any
}

export default function Providers({ children, session }: ProvidersProps) {
  return (
    <SessionProvider basePath={"/auth"} session={session}>
      <NuqsAdapter>{children}</NuqsAdapter>
      <Toaster />
    </SessionProvider>
  )
}
