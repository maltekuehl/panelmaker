import { auth } from "@/auth"
import { AIAssistantFloating } from "@/components/ai-assistant-floating"
import { AppSidebar } from "@/components/app-sidebar"
import { ContentFrame } from "@/components/content-frame"
import { PanelDrawer } from "@/components/panel/panel-drawer"
import Providers from "@/components/providers"
import { SiteHeader } from "@/components/site-header"
import { ThemeProvider } from "@/components/theme-provider"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import UserButton from "@/components/user-button"
import { env } from "@/lib/env"
import { getInstanceConfig } from "@/lib/instance"
import { cn } from "@/lib/utils"
import type { Metadata, Viewport } from "next"
import { Outfit } from "next/font/google"
import localFont from "next/font/local"
import { cookies } from "next/headers"
import { connection } from "next/server"
import { Suspense } from "react"
import "./globals.css"

const outfitHeading = Outfit({ subsets: ["latin"], variable: "--font-heading" })

const inter = localFont({
  src: [
    {
      path: "../public/assets/fonts/Inter-VariableFont_opsz,wght.ttf",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "../public/assets/fonts/Inter-Italic-VariableFont_opsz,wght.ttf",
      weight: "100 900",
      style: "italic",
    },
  ],
  variable: "--font-sans",
  display: "swap",
})

export async function generateMetadata(): Promise<Metadata> {
  await connection()
  const instanceConfig = getInstanceConfig()
  return {
    metadataBase: new URL(env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"),
    title: instanceConfig.name,
    description:
      "Antibody panel design and validation data for multiplexed tissue imaging, including PathoPlex, CyCIF, CODEX, IBEX, MIBI and IMC.",
    robots: {
      index: instanceConfig.allowIndexing,
      follow: instanceConfig.allowIndexing,
    },
    openGraph: {
      title: instanceConfig.name,
      description: "Antibody panel design and validation data for multiplexed tissue imaging.",
      type: "website",
      url: "/",
      siteName: instanceConfig.name,
      images: [
        {
          url: "/icon-512.png",
          width: 512,
          height: 512,
          alt: "PanelMaker",
        },
      ],
    },
  }
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
}

export default async function RootLayout({ children }: React.PropsWithChildren) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", inter.variable, outfitHeading.variable)}>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <Suspense fallback={null}>
            <SessionProvider>{children}</SessionProvider>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  )
}

async function SessionProvider({ children }: React.PropsWithChildren) {
  const [session, cookieStore] = await Promise.all([auth(), cookies()])
  const sidebarOpen = cookieStore.get("sidebar_state")?.value !== "false"

  const instanceConfig = getInstanceConfig()

  let clientSession = null
  if (session?.user) {
    clientSession = {
      expires: session.expires,
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      },
    }
  }

  return (
    <Providers session={clientSession}>
      <SidebarProvider defaultOpen={sidebarOpen}>
        <AppSidebar instanceName={instanceConfig.name} institution={instanceConfig.institution} />
        <SidebarInset className="min-w-0">
          <SiteHeader>
            <UserButton />
          </SiteHeader>
          <ContentFrame>{children}</ContentFrame>
        </SidebarInset>
        <PanelDrawer />
        <AIAssistantFloating />
      </SidebarProvider>
    </Providers>
  )
}
