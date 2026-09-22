import { NotAvailable } from "@/components/shared/not-available"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LAB_ROLE_LABELS } from "@/lib/constants"
import { getInitials } from "@/lib/format"
import { profileHref } from "@/lib/routes"
import type { LabLeaderboardEntry, LeaderboardEntry } from "@/models/user"
import { Award, Medal, Trophy } from "lucide-react"
import Link from "next/link"

function RankCell({ rank, scoring }: { rank: number; scoring: boolean }) {
  return (
    <TableCell className="py-3 pl-4">
      <div className="flex w-6 items-center justify-center">
        {scoring && rank === 1 ? (
          <Trophy className="size-4 text-amber-500" />
        ) : scoring && rank === 2 ? (
          <Medal className="size-4 text-muted-foreground" />
        ) : scoring && rank === 3 ? (
          <Award className="size-4 text-amber-700" />
        ) : (
          <span className="text-sm font-medium text-muted-foreground">{rank}</span>
        )}
      </div>
    </TableCell>
  )
}

function ContributorCell({ entry }: { entry: LeaderboardEntry }) {
  return (
    <TableCell className="py-3">
      <Link href={profileHref(entry.userId)} className="group flex items-center gap-3 hover:underline">
        <Avatar className="size-8 text-xs">
          <AvatarImage src={entry.image ?? undefined} alt={entry.name ?? "User"} />
          <AvatarFallback>{getInitials(entry.name)}</AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium group-hover:text-primary">{entry.name ?? "Anonymous"}</span>
      </Link>
    </TableCell>
  )
}

function rowClass(rank: number, scoring: boolean): string {
  return scoring && rank <= 3 ? "bg-muted/40" : ""
}

export function LeaderboardTable({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-9 w-12 py-2 text-xs">Rank</TableHead>
            <TableHead className="h-9 py-2 text-xs">Contributor</TableHead>
            <TableHead className="h-9 py-2 text-xs">Institution</TableHead>
            <TableHead className="h-9 py-2 text-right text-xs">Reports</TableHead>
            <TableHead className="h-9 py-2 text-right text-xs">Published</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry, index) => {
            const rank = index + 1
            const scoring = entry.reportCount > 0
            return (
              <TableRow key={entry.userId} className={rowClass(rank, scoring)}>
                <RankCell rank={rank} scoring={scoring} />
                <ContributorCell entry={entry} />
                <TableCell className="py-3 text-sm text-muted-foreground">
                  {entry.institution ?? <NotAvailable />}
                </TableCell>
                <TableCell className="py-3 text-right font-semibold">{entry.reportCount}</TableCell>
                <TableCell className="py-3 text-right font-medium text-success">{entry.publishedCount}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

// The lab board trades the institution column (the same for nearly every member) for the member's lab
// role and for how much of their work is lab-visible rather than public.
export function LabLeaderboardTable({ entries }: { entries: LabLeaderboardEntry[] }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-9 w-12 py-2 text-xs">Rank</TableHead>
            <TableHead className="h-9 py-2 text-xs">Member</TableHead>
            <TableHead className="h-9 py-2 text-xs">Role</TableHead>
            <TableHead className="h-9 py-2 text-right text-xs">Reports</TableHead>
            <TableHead className="h-9 py-2 text-right text-xs">Lab only</TableHead>
            <TableHead className="h-9 py-2 text-right text-xs">Published</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry, index) => {
            const rank = index + 1
            const scoring = entry.reportCount > 0
            return (
              <TableRow key={entry.userId} className={rowClass(rank, scoring)}>
                <RankCell rank={rank} scoring={scoring} />
                <ContributorCell entry={entry} />
                <TableCell className="py-3 text-sm">
                  {entry.role ? <Badge variant="outline">{LAB_ROLE_LABELS[entry.role]}</Badge> : <NotAvailable />}
                </TableCell>
                <TableCell className="py-3 text-right font-semibold">{entry.reportCount}</TableCell>
                <TableCell className="py-3 text-right font-medium text-muted-foreground">
                  {entry.labOnlyCount}
                </TableCell>
                <TableCell className="py-3 text-right font-medium text-success">{entry.publishedCount}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
