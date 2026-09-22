import Orcid from "@/components/icons/orcid"
import { CustomBreadcrumbs } from "@/components/shared/custom-breadcrumbs"
import { NotAvailable } from "@/components/shared/not-available"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getSessionUser } from "@/lib/auth"
import { VALIDATION_STATUS_LABELS } from "@/lib/constants"
import { formatDate, getInitials } from "@/lib/format"
import type { ValidationStatus } from "@/lib/generated/prisma/enums"
import { antibodyHref, markerHref } from "@/lib/routes"
import {
  getContributionTier,
  getLeaderboard,
  getUserProfile,
  getUserRecentReports,
  getUserStats,
  toRecentReportSummary,
} from "@/models/user"
import { Building2, Calendar, FlaskConical } from "lucide-react"
import type { Metadata } from "next"
import { cacheLife, cacheTag } from "next/cache"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"

interface ProfilePageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { id } = await params
  const user = await getUserProfile(id)
  if (!user) return { title: "Profile Not Found | PanelMaker" }
  const name = user.name ?? "Unnamed User"
  return {
    title: `${name}: contributor profile | PanelMaker`,
    description: `View ${name}'s contributions to the PanelMaker spatial proteomics community.`,
  }
}

const STATUS_STYLES: Record<string, string> = {
  PUBLISHED: "bg-success/10 text-success",
  PENDING: "bg-warning/10 text-warning",
  REJECTED: "bg-destructive/10 text-destructive",
}

function ReportRridCell({ rrid }: { rrid: string | null }) {
  const href = antibodyHref(rrid)
  if (!href) return <NotAvailable />
  return (
    <Link href={href} className="text-primary hover:underline">
      {rrid}
    </Link>
  )
}

async function ProfileContent({ id, isAdmin }: { id: string; isAdmin: boolean }) {
  "use cache"
  cacheLife("hours")
  cacheTag("browse")

  const [user, stats, recentReports, leaderboard] = await Promise.all([
    getUserProfile(id),
    getUserStats(id, isAdmin),
    getUserRecentReports(id, 10, isAdmin),
    getLeaderboard(50),
  ])

  if (!user) notFound()

  const rank = leaderboard.findIndex((e) => e.userId === id) + 1
  const displayRank = rank > 0 ? rank : null
  const tier = getContributionTier(stats.totalReports)
  const summaries = recentReports.map(toRecentReportSummary)

  return (
    <div className="space-y-8" itemScope itemType="https://schema.org/ProfilePage">
      <div
        className="flex flex-col sm:flex-row items-start sm:items-center gap-6"
        itemScope
        itemType="https://schema.org/Person"
        itemProp="mainEntity"
      >
        <Avatar className="h-20 w-20 text-2xl">
          <AvatarImage src={user.image ?? undefined} alt={user.name ?? "User"} itemProp="image" />
          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold" itemProp="name">
              {user.name ?? "Unnamed User"}
            </h1>
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${tier.color}`}>{tier.label}</span>
            {displayRank && (
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                #{displayRank} overall
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {user.institution && (
              <span
                className="flex items-center gap-1.5"
                itemProp="affiliation"
                itemScope
                itemType="https://schema.org/Organization"
              >
                <Building2 className="h-3.5 w-3.5" />
                {user.institutionId ? (
                  <a
                    href={`https://ror.org/${user.institutionId.replace(/^ror:/, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline hover:text-foreground"
                    itemProp="url"
                  >
                    <span itemProp="name">{user.institution}</span>
                  </a>
                ) : (
                  <span itemProp="name">{user.institution}</span>
                )}
                {user.institutionId && (
                  <meta itemProp="identifier" content={`https://ror.org/${user.institutionId.replace(/^ror:/, "")}`} />
                )}
              </span>
            )}
            {user.orcid && (
              <a
                href={`https://orcid.org/${user.orcid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:underline hover:text-foreground"
                itemProp="identifier"
              >
                <Orcid className="h-3.5 w-3.5 text-[#a6ce39]" />
                {user.orcid}
              </a>
            )}
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Member since {new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 border-t pt-4 text-sm">
        <span>
          <span className="text-lg font-semibold tabular-nums">{stats.totalReports}</span>{" "}
          <span className="text-muted-foreground">Total reports</span>
        </span>
        <span>
          <span className="text-lg font-semibold tabular-nums text-success">{stats.publishedReports}</span>{" "}
          <span className="text-muted-foreground">Published</span>
        </span>
        <span>
          <span className="text-lg font-semibold tabular-nums text-primary">{stats.publicPanels}</span>{" "}
          <span className="text-muted-foreground">Panels</span>
        </span>
        <span>
          <span className="text-lg font-semibold tabular-nums">{displayRank ? `#${displayRank}` : "Not ranked"}</span>{" "}
          <span className="text-muted-foreground">Rank</span>
        </span>
      </div>

      {(stats.methods.length > 0 || stats.species.length > 0) && (
        <div className="space-y-3 border-t pt-6">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <FlaskConical className="h-4 w-4" />
            Contributions
          </h2>
          <div className="flex flex-wrap gap-6">
            {stats.methods.length > 0 && (
              <div>
                <span className="mb-2 block text-xs font-medium text-muted-foreground">Methods</span>
                <div className="flex flex-wrap gap-2">
                  {stats.methods.map((method) => (
                    <Badge key={method} variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                      {method}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {stats.species.length > 0 && (
              <div>
                <span className="mb-2 block text-xs font-medium text-muted-foreground">Species</span>
                <div className="flex flex-wrap gap-2">
                  {stats.species.map((sp) => (
                    <Badge key={sp} variant="outline">
                      {sp}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4 border-t pt-6">
        <div>
          <h2 className="text-base font-semibold">Recent Submissions</h2>
          <p className="text-sm text-muted-foreground">Latest public experimental reports from this contributor.</p>
        </div>
        {summaries.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No public reports yet.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-8 py-1 text-xs">Marker</TableHead>
                  <TableHead className="h-8 py-1 text-xs">Antibody</TableHead>
                  <TableHead className="h-8 py-1 text-xs">Cell Type</TableHead>
                  <TableHead className="h-8 py-1 text-xs">Method</TableHead>
                  <TableHead className="h-8 py-1 text-xs">Species</TableHead>
                  <TableHead className="h-8 py-1 text-xs">Status</TableHead>
                  <TableHead className="h-8 py-1 text-xs">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaries.map((report) => (
                  <TableRow key={report.id} className="text-xs">
                    <TableCell className="py-2 font-medium">
                      {report.proteinId ? (
                        <Link href={markerHref(report.proteinId)} className="text-primary hover:underline">
                          {report.markerName}
                        </Link>
                      ) : (
                        report.markerName
                      )}
                    </TableCell>
                    <TableCell className="py-2 font-mono text-muted-foreground">
                      <ReportRridCell rrid={report.antibodyRrid} />
                    </TableCell>
                    <TableCell className="py-2 text-muted-foreground">{report.cellType ?? "Not available"}</TableCell>
                    <TableCell className="py-2">{report.method ?? "Not available"}</TableCell>
                    <TableCell className="py-2">{report.species ?? "Not available"}</TableCell>
                    <TableCell className="py-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_STYLES[report.status] ?? "bg-muted text-muted-foreground"}`}
                      >
                        {VALIDATION_STATUS_LABELS[report.status as ValidationStatus] ?? report.status}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 text-muted-foreground">{formatDate(report.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}

function ProfileContentSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-6">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 border-t pt-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-6 w-28" />
        ))}
      </div>
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { id } = await params
  const user = await getSessionUser()
  const isAdmin = user?.isAdmin ?? false

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <CustomBreadcrumbs items={[{ label: "Community", href: "/leaderboard" }, { label: "Profile" }]} />
      <Suspense fallback={<ProfileContentSkeleton />}>
        <ProfileContent id={id} isAdmin={isAdmin} />
      </Suspense>
    </div>
  )
}
