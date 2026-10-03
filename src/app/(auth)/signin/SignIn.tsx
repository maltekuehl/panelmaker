"use client"

import GitHub from "@/components/icons/github"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { User } from "lucide-react"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useTransition } from "react"

type ProviderInfo = { id: string; name: string }

const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Invalid email or password.",
  AccessDenied: "This account is not allowed to sign in.",
  OAuthAccountNotLinked: "That email is already registered with a different sign-in method.",
  Configuration: "Sign in is unavailable right now. Please try again later.",
}

function errorMessage(code: string): string {
  return ERROR_MESSAGES[code] ?? "Something went wrong signing you in. Please try again."
}

export default function SignIn({ providerMap }: { providerMap: ProviderInfo[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleCredentialsSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (isPending) return

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    startTransition(async () => {
      setError(null)

      if (!email || !password) {
        setError("Email and password are required.")
        return
      }

      const result = await signIn("credentials", {
        redirect: false,
        redirectTo: searchParams.get("callbackUrl") || "/",
        email,
        password,
      })

      if (result?.error) {
        setError(errorMessage(result.error))
        return
      }

      router.push(result?.url ?? "/")
      router.refresh()
    })
  }

  function handleOAuthSubmit(providerId: string, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (isPending) return

    startTransition(async () => {
      setError(null)
      await signIn(providerId, {
        redirect: true,
        redirectTo: searchParams.get("callbackUrl") || "/",
      })
    })
  }

  const oauthProviders = providerMap.filter((provider) => provider.id !== "credentials")

  return (
    <div className="flex pt-12 flex-col gap-6 max-w-md mx-auto">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <User className="size-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Sign in to your account</CardTitle>
          <CardDescription className="text-center">
            Sign in to design antibody panels, submit validation data, and access personalized features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {searchParams.get("error") && (
              <Alert variant="destructive" className="bg-destructive/50">
                <AlertTitle className="text-destructive-foreground">Error</AlertTitle>
                <AlertDescription className="text-destructive-foreground">
                  {errorMessage(searchParams.get("error") ?? "")}
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive" className="bg-destructive/50">
                <AlertTitle className="text-destructive-foreground">Error</AlertTitle>
                <AlertDescription className="text-destructive-foreground">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleCredentialsSubmit} className="flex flex-col gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@institution.edu"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Your password"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-primary underline">
                Create one
              </Link>
            </p>

            {oauthProviders.length > 0 && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {oauthProviders.map((provider) => (
                    <form key={provider.id} onSubmit={handleOAuthSubmit.bind(null, provider.id)}>
                      <Button type="submit" variant="outline" className="w-full" disabled={isPending}>
                        {provider.name === "GitHub" && <GitHub className="size-4" />}
                        Sign in with {provider.name}
                      </Button>
                    </form>
                  ))}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
