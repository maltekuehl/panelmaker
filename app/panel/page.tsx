import { auth } from "@/auth"
import { PanelWorkspace } from "@/components/panel/panel-workspace"
import { Button } from "@/components/ui/button"
import type { Metadata } from "next"
import Link from "next/link"

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

export default async function PanelPage() {
  const session = await auth()

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Panel Designer</h1>
          <p className="text-muted-foreground">Design and manage antibody panels for spatial proteomics experiments.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/browse?mode=panels">Browse public panels</Link>
        </Button>
      </div>

      {session?.user ? (
        <div className="h-[600px]">
          <PanelWorkspace />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          <Link href="/api/auth/signin?callbackUrl=/panel" className="text-primary underline underline-offset-4">
            Sign in
          </Link>{" "}
          to create and manage your own panels, or{" "}
          <Link href="/browse?mode=panels" className="text-primary underline underline-offset-4">
            browse panels shared by the community
          </Link>
          .
        </p>
      )}
    </div>
  )
}
