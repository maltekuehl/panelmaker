import { CustomBreadcrumbs } from "@/components/shared/custom-breadcrumbs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getInstitutionLeaderboard, getLeaderboard } from "@/models/user"
import { Award, Building2, Medal, Trophy, Users } from "lucide-react"
import type { Metadata } from "next"
import { cacheLife } from "next/cache"
import Link from "next/link"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "Community Leaderboard | PanelMaker",
  description:
    "Top contributors to the PanelMaker spatial proteomics community. See who is driving knowledge in multiplex imaging.",
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

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="h-4 w-4 text-amber-500" />
  if (rank === 2) return <Medal className="h-4 w-4 text-zinc-400" />
  if (rank === 3) return <Award className="h-4 w-4 text-amber-700" />
  return <span className="text-sm text-muted-foreground font-medium">{rank}</span>
}

function rankRowClass(rank: number): string {
  if (rank === 1) return "bg-amber-50/60 hover:bg-amber-50"
  if (rank === 2) return "bg-zinc-50/60 hover:bg-zinc-50"
  if (rank === 3) return "bg-amber-50/40 hover:bg-amber-50/60"
  return ""
}

async function LeaderboardContent() {
  "use cache"
  cacheLife("hours")

  const [contributors, institutions] = await Promise.all([getLeaderboard(50), getInstitutionLeaderboard(30)])

  return (
    <Tabs defaultValue="contributors">
      <TabsList className="mb-6">
        <TabsTrigger value="contributors" className="gap-2">
          <Users className="h-4 w-4" />
          Contributors
        </TabsTrigger>
        <TabsTrigger value="institutions" className="gap-2">
          <Building2 className="h-4 w-4" />
          Institutions
        </TabsTrigger>
      </TabsList>

      <TabsContent value="contributors">
        <Card>
          <CardHeader>
            <CardTitle>Top Contributors</CardTitle>
            <CardDescription>Ranked by total public experimental reports submitted.</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {contributors.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No contributors yet.</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-9 py-2 text-xs w-12">Rank</TableHead>
                      <TableHead className="h-9 py-2 text-xs">Contributor</TableHead>
                      <TableHead className="h-9 py-2 text-xs">Institution</TableHead>
                      <TableHead className="h-9 py-2 text-xs text-right">Reports</TableHead>
                      <TableHead className="h-9 py-2 text-xs text-right">Validated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contributors.map((entry, index) => {
                      const rank = index + 1
                      return (
                        <TableRow key={entry.userId} className={rankRowClass(rank)}>
                          <TableCell className="py-3 pl-4">
                            <div className="flex items-center justify-center w-6">
                              <RankIcon rank={rank} />
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <Link
                              href={`/profile/${entry.userId}`}
                              className="flex items-center gap-3 hover:underline group"
                            >
                              <Avatar className="h-8 w-8 text-xs">
                                <AvatarImage src={entry.image ?? undefined} alt={entry.name ?? "User"} />
                                <AvatarFallback>{getInitials(entry.name)}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium group-hover:text-primary text-sm">
                                {entry.name ?? "Anonymous"}
                              </span>
                            </Link>
                          </TableCell>
                          <TableCell className="py-3 text-sm text-muted-foreground">
                            {entry.institution ?? "—"}
                          </TableCell>
                          <TableCell className="py-3 text-right font-semibold">{entry.reportCount}</TableCell>
                          <TableCell className="py-3 text-right text-green-600 font-medium">
                            {entry.validatedCount}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="institutions">
        <Card>
          <CardHeader>
            <CardTitle>Top Institutions</CardTitle>
            <CardDescription>Institutions ranked by total public experimental reports.</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {institutions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No institutions with reports yet.</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-9 py-2 text-xs w-12">Rank</TableHead>
                      <TableHead className="h-9 py-2 text-xs">Institution</TableHead>
                      <TableHead className="h-9 py-2 text-xs text-right">Contributors</TableHead>
                      <TableHead className="h-9 py-2 text-xs text-right">Reports</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {institutions.map((entry, index) => {
                      const rank = index + 1
                      return (
                        <TableRow key={entry.institution} className={rankRowClass(rank)}>
                          <TableCell className="py-3 pl-4">
                            <div className="flex items-center justify-center w-6">
                              <RankIcon rank={rank} />
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="font-medium text-sm">{entry.institution}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 text-right text-muted-foreground">
                            {entry.contributorCount}
                          </TableCell>
                          <TableCell className="py-3 text-right font-semibold">{entry.reportCount}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

function LeaderboardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-96 w-full" />
    </div>
  )
}

export default function LeaderboardPage() {
  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <CustomBreadcrumbs items={[{ label: "Community Leaderboard" }]} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Community Leaderboard</h1>
        <p className="text-muted-foreground mt-1">
          Recognising the contributors building open spatial proteomics knowledge.
        </p>
      </div>
      <Suspense fallback={<LeaderboardSkeleton />}>
        <LeaderboardContent />
      </Suspense>
    </div>
  )
}
