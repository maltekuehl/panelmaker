import Orcid from "@/components/icons/orcid"
import { CustomBreadcrumbs } from "@/components/shared/custom-breadcrumbs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SPECIES_LABELS } from "@/lib/constants"
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
import { cacheLife } from "next/cache"
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
    title: `${name} — Contributor Profile | PanelMaker`,
    description: `View ${name}&apos;s contributions to the PanelMaker spatial proteomics community.`,
  }
}

function getInitials(name: string | null): string {
  if (!name) return "?"
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

const STATUS_STYLES: Record<string, string> = {
  PUBLISHED: "bg-green-100 text-green-700",
  PENDING: "bg-amber-100 text-amber-700",
  REJECTED: "bg-red-100 text-red-700",
}

async function ProfileContent({ id }: { id: string }) {
  "use cache"
  cacheLife("hours")

  const user = await getUserProfile(id)
  if (!user) notFound()

  const [stats, recentReports, leaderboard] = await Promise.all([
    getUserStats(id),
    getUserRecentReports(id, 10),
    getLeaderboard(50),
  ])

  const rank = leaderboard.findIndex((e) => e.userId === id) + 1
  const displayRank = rank > 0 ? rank : null
  const tier = getContributionTier(stats.totalReports)
  const summaries = recentReports.map(toRecentReportSummary)

  return (
    <div className="space-y-8" itemScope itemType="https://schema.org/ProfilePage">
      <Card>
        <CardContent className="pt-6">
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
                  <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
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
                      <meta
                        itemProp="identifier"
                        content={`https://ror.org/${user.institutionId.replace(/^ror:/, "")}`}
                      />
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
                  Member since{" "}
                  {new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold">{stats.totalReports}</div>
            <div className="text-sm text-muted-foreground mt-1">Total Reports</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-green-600">{stats.publishedReports}</div>
            <div className="text-sm text-muted-foreground mt-1">Published</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-blue-600">{stats.publicPanels}</div>
            <div className="text-sm text-muted-foreground mt-1">Panels</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-zinc-600">{displayRank ? `#${displayRank}` : "—"}</div>
            <div className="text-sm text-muted-foreground mt-1">Rank</div>
          </CardContent>
        </Card>
      </div>

      {(stats.methods.length > 0 || stats.species.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FlaskConical className="h-4 w-4" />
              Contributions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.methods.length > 0 && (
              <div>
                <span className="text-xs font-medium text-muted-foreground block mb-2">Methods</span>
                <div className="flex flex-wrap gap-2">
                  {stats.methods.map((method) => (
                    <Badge key={method} variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                      {method}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {stats.species.length > 0 && (
              <div>
                <span className="text-xs font-medium text-muted-foreground block mb-2">Species</span>
                <div className="flex flex-wrap gap-2">
                  {stats.species.map((sp) => (
                    <Badge key={sp} variant="outline">
                      {SPECIES_LABELS[sp] ?? sp}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Submissions</CardTitle>
          <CardDescription>Latest public experimental reports from this contributor.</CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          {summaries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No public reports yet.</p>
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
                          <Link href={`/marker/${report.proteinId}`} className="text-primary hover:underline">
                            {report.markerName}
                          </Link>
                        ) : (
                          report.markerName
                        )}
                      </TableCell>
                      <TableCell className="py-2 font-mono text-muted-foreground">
                        {report.antibodyRrid ? (
                          <Link
                            href={`/antibody/${report.antibodyRrid.replace(/^RRID:/i, "")}`}
                            className="text-primary hover:underline"
                          >
                            {report.antibodyRrid}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="py-2 text-muted-foreground">{report.cellType ?? "—"}</TableCell>
                      <TableCell className="py-2">{report.method ?? "—"}</TableCell>
                      <TableCell className="py-2">{report.species ?? "—"}</TableCell>
                      <TableCell className="py-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_STYLES[report.status] ?? "bg-zinc-100 text-zinc-700"}`}
                        >
                          {report.status}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 text-muted-foreground">
                        {new Date(report.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ProfileContentSkeleton() {
  return (
    <div className="space-y-8">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { id } = await params

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <CustomBreadcrumbs items={[{ label: "Community", href: "/leaderboard" }, { label: "Profile" }]} />
      <Suspense fallback={<ProfileContentSkeleton />}>
        <ProfileContent id={id} />
      </Suspense>
    </div>
  )
}
