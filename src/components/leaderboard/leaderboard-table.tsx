import { NotAvailable } from "@/components/shared/not-available"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LAB_ROLE_LABELS } from "@/lib/constants"
import { getInitials } from "@/lib/format"
import { profileHref } from "@/lib/routes"
import { cn } from "@/lib/utils"
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

type ExtraColumn<T> = {
  header: string
  numeric?: boolean
  cellClassName: string
  cell: (entry: T) => React.ReactNode
}

function RankedTable<T extends LeaderboardEntry>({
  entries,
  memberHeader,
  columns,
}: {
  entries: T[]
  memberHeader: string
  columns: ExtraColumn<T>[]
}) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-9 w-12 py-2 text-xs">Rank</TableHead>
            <TableHead className="h-9 py-2 text-xs">{memberHeader}</TableHead>
            {columns.map((column) => (
              <TableHead key={column.header} className={cn("h-9 py-2 text-xs", column.numeric && "text-right")}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry, index) => {
            const rank = index + 1
            const scoring = entry.reportCount > 0
            return (
              <TableRow key={entry.userId} className={scoring && rank <= 3 ? "bg-muted/40" : ""}>
                <RankCell rank={rank} scoring={scoring} />
                <ContributorCell entry={entry} />
                {columns.map((column) => (
                  <TableCell key={column.header} className={cn("py-3", column.cellClassName)}>
                    {column.cell(entry)}
                  </TableCell>
                ))}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

const reportsColumn: ExtraColumn<LeaderboardEntry> = {
  header: "Reports",
  numeric: true,
  cellClassName: "text-right font-semibold",
  cell: (entry) => entry.reportCount,
}

const publishedColumn: ExtraColumn<LeaderboardEntry> = {
  header: "Published",
  numeric: true,
  cellClassName: "text-right font-medium text-success",
  cell: (entry) => entry.publishedCount,
}

export function LeaderboardTable({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <RankedTable
      entries={entries}
      memberHeader="Contributor"
      columns={[
        {
          header: "Institution",
          cellClassName: "text-sm text-muted-foreground",
          cell: (entry) => entry.institution ?? <NotAvailable />,
        },
        reportsColumn,
        publishedColumn,
      ]}
    />
  )
}

// The lab board trades the institution column (the same for nearly every member) for the member's lab
// role and for how much of their work is lab-visible rather than public.
export function LabLeaderboardTable({ entries }: { entries: LabLeaderboardEntry[] }) {
  return (
    <RankedTable<LabLeaderboardEntry>
      entries={entries}
      memberHeader="Member"
      columns={[
        {
          header: "Role",
          cellClassName: "text-sm",
          cell: (entry) =>
            entry.role ? <Badge variant="outline">{LAB_ROLE_LABELS[entry.role]}</Badge> : <NotAvailable />,
        },
        reportsColumn,
        {
          header: "Lab only",
          numeric: true,
          cellClassName: "text-right font-medium text-muted-foreground",
          cell: (entry) => entry.labOnlyCount,
        },
        publishedColumn,
      ]}
    />
  )
}
