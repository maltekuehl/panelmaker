import { getSessionUser } from "@/lib/auth"
import { signInUrl } from "@/lib/routes"
import { Loader2 } from "lucide-react"
import { redirect } from "next/navigation"
import { Suspense } from "react"

interface AdminPageProps {
  path: string
  title: string
  description: string
  children: React.ReactNode
}

export async function AdminPage({ path, title, description, children }: AdminPageProps) {
  const user = await getSessionUser()

  if (!user) {
    redirect(signInUrl(path))
  }

  if (!user.isAdmin) {
    redirect("/")
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-8">
            <Loader2 className="size-8 animate-spin" />
          </div>
        }
      >
        {children}
      </Suspense>
    </div>
  )
}
