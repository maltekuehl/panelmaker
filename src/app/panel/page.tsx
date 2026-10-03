import { PanelWorkspace } from "@/components/panel/panel-workspace"
import { SignInRequired } from "@/components/shared/sign-in-required"
import { Button } from "@/components/ui/button"
import { getSessionUser } from "@/lib/auth"
import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Panel Designer | PanelMaker",
  description:
    "Design and optimize antibody panels for spatial proteomics experiments. Add markers, manage cycles, and check compatibility.",
}

export default async function PanelPage() {
  const user = await getSessionUser()

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Panel Designer</h1>
          <p className="text-muted-foreground">Design and manage antibody panels for spatial proteomics experiments.</p>
        </div>
        {user && (
          <Button asChild variant="outline">
            <Link href="/browse?mode=panels">Browse public panels</Link>
          </Button>
        )}
      </div>

      {user ? (
        <div className="h-[calc(100dvh-14rem)] min-h-[480px] rounded-md border">
          <PanelWorkspace />
        </div>
      ) : (
        <SignInRequired
          title="Sign in to design a panel"
          description="Panels are saved to your account, so you can come back to them and share them with your lab. Panels the community has already published stay open to everyone."
          callbackPath="/panel"
          secondaryAction={{ label: "Browse public panels", href: "/browse?mode=panels" }}
        />
      )}
    </div>
  )
}
