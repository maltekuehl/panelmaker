"use client"

import { OntologyCombobox } from "@/components/ontology-combobox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useState, useTransition } from "react"

interface OntologyValue {
  id: string
  label: string
}

export default function SignUp() {
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()
  const [orcid, setOrcid] = useState("")
  const [institution, setInstitution] = useState<OntologyValue | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (isPending) return

    startTransition(async () => {
      setError(null)
      setFieldErrors({})

      const formData = new FormData(e.currentTarget)
      const name = formData.get("name") as string
      const email = formData.get("email") as string
      const password = formData.get("password") as string
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            password,
            orcid: orcid.trim() || undefined,
            institution: institution?.label || undefined,
            institutionId: institution?.id || undefined,
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          if (data.details) {
            const errors: Record<string, string> = {}
            for (const detail of data.details) {
              const field = detail.path?.[0]
              if (field) {
                errors[field] = detail.message
              }
            }
            setFieldErrors(errors)
          } else {
            setError(data.error || "Registration failed")
          }
          return
        }

        await signIn("credentials", {
          redirect: true,
          redirectTo: searchParams.get("callbackUrl") || "/",
          email,
          password,
        })
      } catch {
        setError("An unexpected error occurred. Please try again.")
      }
    })
  }

  return (
    <div className="flex py-12 flex-col gap-6 max-w-md mx-auto">
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
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          </div>
          <CardTitle className="text-xl">Create your account</CardTitle>
          <CardDescription>
            Join PanelMaker to design antibody panels, submit validation data, and collaborate with the spatial
            proteomics community.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <Alert variant="destructive" className="bg-destructive/50">
                <AlertDescription className="text-destructive-foreground">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input id="name" name="name" type="text" placeholder="Your full name" required />
              {fieldErrors.name && <p className="text-sm text-destructive">{fieldErrors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input id="email" name="email" type="email" placeholder="you@institution.edu" required />
              {fieldErrors.email && <p className="text-sm text-destructive">{fieldErrors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Password <span className="text-destructive">*</span>
              </Label>
              <Input id="password" name="password" type="password" placeholder="Min. 8 characters" required />
              <p className="text-xs text-muted-foreground">Must be at least 8 characters.</p>
              {fieldErrors.password && <p className="text-sm text-destructive">{fieldErrors.password}</p>}
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="orcid">ORCID</Label>
              <Input
                id="orcid"
                name="orcid"
                type="text"
                placeholder="0000-0002-1825-0097"
                value={orcid}
                onChange={(e) => setOrcid(e.target.value.replace(/^https?:\/\/orcid\.org\//, ""))}
              />
              <p className="text-xs text-muted-foreground">
                Optional. Your{" "}
                <a href="https://orcid.org" target="_blank" rel="noopener noreferrer" className="underline">
                  ORCID iD
                </a>{" "}
                helps link your contributions to your research identity.
              </p>
              {fieldErrors.orcid && <p className="text-sm text-destructive">{fieldErrors.orcid}</p>}
            </div>

            <div className="space-y-2">
              <Label>Institution</Label>
              <OntologyCombobox
                ontologyType="ror"
                value={institution}
                onChange={setInstitution}
                placeholder="Search for your institution..."
              />
              <p className="text-xs text-muted-foreground">Optional. Search by institution name.</p>
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Creating account..." : "Create account"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/signin" className="text-primary underline">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
