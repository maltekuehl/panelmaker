import { LabTabsNav } from "@/components/lab/lab-tabs-nav"
import { CustomBreadcrumbs } from "@/components/shared/custom-breadcrumbs"
import type { LabRole } from "@/lib/generated/prisma/enums"
import { Building2, ExternalLink, Package, Users } from "lucide-react"

interface LabPageHeaderProps {
  lab: {
    name: string
    slug: string
    institution: string | null
    website: string | null
    _count: { memberships: number; inventory: number }
  }
  role: LabRole | null
  crumb?: string
}

// Single source of truth for the lab page chrome: breadcrumb, title, inline metadata, and the tab
// nav. Shared by every /labs/[slug] page so the header is identical across overview/members/settings.
export function LabPageHeader({ lab, role, crumb }: LabPageHeaderProps) {
  const breadcrumbs = crumb
    ? [{ label: "Labs", href: "/labs" }, { label: lab.name, href: `/labs/${lab.slug}` }, { label: crumb }]
    : [{ label: "Labs", href: "/labs" }, { label: lab.name }]

  const memberCount = lab._count.memberships
  const inventoryCount = lab._count.inventory

  return (
    <div className="space-y-4">
      <CustomBreadcrumbs items={breadcrumbs} />
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{lab.name}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
          {lab.institution && (
            <span className="flex items-center gap-1.5">
              <Building2 className="size-3.5" />
              {lab.institution}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Users className="size-3.5" />
            {memberCount} {memberCount === 1 ? "member" : "members"}
          </span>
          <span className="flex items-center gap-1.5">
            <Package className="size-3.5" />
            {inventoryCount} inventory {inventoryCount === 1 ? "item" : "items"}
          </span>
          {lab.website && (
            <a
              href={lab.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <ExternalLink className="size-3.5" />
              Website
            </a>
          )}
        </div>
      </div>
      {role && <LabTabsNav slug={lab.slug} role={role} />}
    </div>
  )
}
