import { Button } from "@/components/ui/button"
import { signInUrl } from "@/lib/routes"
import { Lock } from "lucide-react"
import Link from "next/link"

export function SignInRequired({
  title,
  description,
  callbackPath,
  secondaryAction,
}: {
  title: string
  description: string
  callbackPath: string
  secondaryAction?: { label: string; href: string }
}) {
  return (
    <div className="space-y-4 rounded-md border px-6 py-16 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
        <Lock className="size-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button asChild>
          <Link href={signInUrl(callbackPath)}>Sign in</Link>
        </Button>
        {secondaryAction && (
          <Button asChild variant="outline">
            <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
          </Button>
        )}
      </div>
    </div>
  )
}
