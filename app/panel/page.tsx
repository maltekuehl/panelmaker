import { auth } from "@/auth"
import { PanelWorkspace } from "@/components/panel/panel-workspace"
import { PublicPanelsList } from "@/components/panel/public-panels-list"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "Panel Designer | PanelMaker",
  description:
    "Design and optimize antibody panels for spatial proteomics experiments. Add markers, manage cycles, and check compatibility.",
  keywords: [
    "panel designer",
    "antibody panel",
    "spatial proteomics",
    "multiplexed imaging",
    "CODEX",
    "CyCIF",
    "IMC",
    "panel optimization",
  ],
}

function PublicPanelsLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full max-w-sm" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    </div>
  )
}

export default async function PanelPage() {
  const session = await auth()

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Panel Designer</h1>
        <p className="text-muted-foreground">Design and manage antibody panels for spatial proteomics experiments.</p>
      </div>

      {session?.user ? (
        <Tabs defaultValue="my-panels">
          <TabsList className="mb-4">
            <TabsTrigger value="my-panels">My Panels</TabsTrigger>
            <TabsTrigger value="public">Public Panels</TabsTrigger>
          </TabsList>
          <TabsContent value="my-panels">
            <div className="h-[600px]">
              <PanelWorkspace />
            </div>
          </TabsContent>
          <TabsContent value="public">
            <Suspense fallback={<PublicPanelsLoading />}>
              <PublicPanelsList />
            </Suspense>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Browse panels shared by the community.{" "}
            <Link href="/api/auth/signin?callbackUrl=/panel" className="text-primary underline underline-offset-4">
              Sign in
            </Link>{" "}
            to create and manage your own panels.
          </p>
          <Suspense fallback={<PublicPanelsLoading />}>
            <PublicPanelsList />
          </Suspense>
        </div>
      )}
    </div>
  )
}
