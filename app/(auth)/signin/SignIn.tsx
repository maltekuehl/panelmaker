"use client"

import { providerMap } from "@/auth"
import GitHub from "@/components/icons/github"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Linkedin } from "lucide-react"
import { AuthError } from "next-auth"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useState, useTransition } from "react"

export default function SignIn() {
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleCredentialsSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (isPending) return

    startTransition(async () => {
      try {
        setError(null)
        const formData = new FormData(e.currentTarget)
        const email = formData.get("email") as string
        const password = formData.get("password") as string

        if (!email || !password) {
          setError("Email and password are required.")
          return
        }

        await signIn("credentials", {
          redirect: true,
          redirectTo: searchParams.get("callbackUrl") || "/",
          email,
          password,
        })
      } catch (error) {
        if (error instanceof AuthError) {
          setError(error.message)
          return
        }
        setError("Invalid email or password. Please try again.")
      }
    })
  }

  function handleOAuthSubmit(providerId: string, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (isPending) return

    startTransition(async () => {
      try {
        setError(null)
        await signIn(providerId, {
          redirect: true,
          redirectTo: searchParams.get("callbackUrl") || "/",
        })
      } catch (error) {
        if (error instanceof AuthError) {
          setError(error.message)
          return
        }
        setError("An unexpected error occurred. Please try again.")
      }
    })
  }

  const oauthProviders = Object.values(providerMap).filter((provider) => provider.id !== "credentials")

  return (
    <div className="flex pt-12 flex-col gap-6 max-w-md mx-auto">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-primary"
            >
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
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
                  {searchParams.get("error") === "CredentialsSignin"
                    ? "Invalid email or password."
                    : searchParams.get("error")}
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
                <Input id="email" name="email" type="email" placeholder="you@institution.edu" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" placeholder="Your password" required />
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Signing in..." : "Sign in"}
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
                    <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {oauthProviders.map((provider) => (
                    <form key={provider.id} onSubmit={handleOAuthSubmit.bind(null, provider.id)}>
                      <Button type="submit" variant="outline" className="w-full" disabled={isPending}>
                        {provider.name === "GitHub" && <GitHub className="w-4 h-4 mr-2" />}
                        {provider.name === "LinkedIn" && <Linkedin className="w-4 h-4 mr-2" />}
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
