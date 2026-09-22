import { CustomBreadcrumbs } from "@/components/shared/custom-breadcrumbs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getAccessState, getSessionUser } from "@/lib/auth"
import { LAB_ROLE_LABELS } from "@/lib/constants"
import type { LabRole } from "@/lib/generated/prisma/enums"
import { signInUrl } from "@/lib/routes"
import { getLabsForUser } from "@/models/lab"
import { Building2, FlaskConical, Plus, Users } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

const ROLE_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  OWNER: "default",
  ADMIN: "secondary",
  MEMBER: "outline",
  VIEWER: "outline",
}

export default async function LabsPage() {
  const user = await getSessionUser()

  if (!user) {
    redirect(signInUrl("/labs"))
  }

  const [labsWithRoles, accessState] = await Promise.all([getLabsForUser(user.id), getAccessState(user.id)])

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <CustomBreadcrumbs items={[{ label: "Labs" }]} />

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Your labs</h1>
          <p className="text-muted-foreground">Labs you belong to and the panels and inventory they share.</p>
        </div>
        {accessState.verified && (
          <Button asChild>
            <Link href="/labs/new">
              <Plus className="size-4" />
              New lab
            </Link>
          </Button>
        )}
      </div>

      {!accessState.verified && (
        <div className="rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          Account verification is required before you can create a lab. You can request verification on the{" "}
          <Link href="/submit" className="font-medium underline underline-offset-4">
            submit page
          </Link>
          . You can still browse and join labs you have been invited to.
        </div>
      )}

      {labsWithRoles.length === 0 ? (
        <div className="rounded-md border py-16 text-center space-y-4">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
            <FlaskConical className="size-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">No labs yet</h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Labs let you share panels and antibody inventory with your research team. Create a lab or ask a colleague
              to invite you.
            </p>
          </div>
          {accessState.verified && (
            <Button asChild>
              <Link href="/labs/new">
                <Plus className="size-4" />
                Create a lab
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-md border divide-y">
          {labsWithRoles.map(({ lab, role }) => (
            <div key={lab.id} className="flex items-center justify-between gap-4 px-4 py-4">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/labs/${lab.slug}`}
                    className="font-semibold text-foreground hover:text-primary hover:underline truncate"
                  >
                    {lab.name}
                  </Link>
                  <Badge variant={ROLE_VARIANTS[role] ?? "outline"} className="shrink-0 text-xs">
                    {LAB_ROLE_LABELS[role as LabRole] ?? role}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {lab.institution && (
                    <span className="flex items-center gap-1.5">
                      <Building2 className="size-3.5" />
                      {lab.institution}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Users className="size-3.5" />
                    {lab._count.memberships} {lab._count.memberships === 1 ? "member" : "members"}
                  </span>
                </div>
                {lab.description && <p className="text-sm text-muted-foreground line-clamp-1">{lab.description}</p>}
              </div>
              <Button asChild variant="outline" size="sm" className="shrink-0">
                <Link href={`/labs/${lab.slug}`}>View</Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
