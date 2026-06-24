import { auth } from "@/auth"
import { AIAssistantFloating } from "@/components/ai-assistant-floating"
import { AppSidebar } from "@/components/app-sidebar"
import { CookieNotice } from "@/components/cookie/cookie-notice"
import { PanelDrawer } from "@/components/panel/panel-drawer"
import Providers from "@/components/providers"
import { SiteHeader } from "@/components/site-header"
import { ThemeProvider } from "@/components/theme-provider"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import UserButton from "@/components/user-button"
import { env } from "@/lib/env"
import { cn } from "@/lib/utils"
import type { Metadata, Viewport } from "next"
import { DM_Sans, Outfit } from "next/font/google"
import localFont from "next/font/local"
import { Suspense } from "react"
import "./globals.css"

const outfitHeading = Outfit({ subsets: ["latin"], variable: "--font-heading" })

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" })

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
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  title: "PanelMaker",
  description:
    "A community-driven database of validated antibodies and cell type markers for spatial proteomics, including PathoPlex, MIBI-ToF, CODEX, and IMC.",
  keywords: [
    "PanelMaker",
    "spatial proteomics",
    "antibody panel",
    "cell type markers",
    "immunofluorescence",
    "MIBI-ToF",
    "CODEX",
    "IMC",
    "multiplex imaging",
    "antibody validation",
    "panel design",
    "spatial biology",
  ],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "PanelMaker",
    description:
      "Community-driven database of validated antibodies and cell type markers for spatial proteomics panel design.",
    type: "website",
    url: "https://panelmaker.ai",
    siteName: "PanelMaker",
    images: [
      {
        url: "https://panelmaker.ai/ms-icon-310x310.png",
        width: 310,
        height: 310,
        alt: "PanelMaker - Validated Spatial Proteomics Marker Database",
      },
    ],
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#000000",
  colorScheme: "light",
}

export default async function RootLayout({ children }: React.PropsWithChildren) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", dmSans.variable, outfitHeading.variable)}>
      <head>
        <link rel="apple-touch-icon" sizes="57x57" href="/apple-icon-57x57.png" />
        <link rel="apple-touch-icon" sizes="60x60" href="/apple-icon-60x60.png" />
        <link rel="apple-touch-icon" sizes="72x72" href="/apple-icon-72x72.png" />
        <link rel="apple-touch-icon" sizes="76x76" href="/apple-icon-76x76.png" />
        <link rel="apple-touch-icon" sizes="114x114" href="/apple-icon-114x114.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/apple-icon-120x120.png" />
        <link rel="apple-touch-icon" sizes="144x144" href="/apple-icon-144x144.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/apple-icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-icon-180x180.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/android-icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="msapplication-TileColor" content="#ffffff" />
        <meta name="msapplication-TileImage" content="/ms-icon-144x144.png" />
        <meta name="theme-color" content="#ffffff" />

        <base href={env.NEXT_PUBLIC_BASE_URL || "https://panelmaker.ai"} />
      </head>
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
  const session = await auth()

  // Filter out sensitive data before passing to client
  let clientSession = null
  if (session?.user) {
    clientSession = {
      ...session,
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
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <SiteHeader>
            <UserButton />
          </SiteHeader>
          <div className="flex-1">{children}</div>
        </SidebarInset>
        <PanelDrawer />
        <AIAssistantFloating />
        <CookieNotice />
      </SidebarProvider>
    </Providers>
  )
}
