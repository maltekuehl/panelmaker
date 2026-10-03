"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ModelUsageStats, PeriodStats, StatsResponse } from "@/types/api"
import { Brain, MessageSquare, Users, type LucideIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

function StatRow({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string
  value: number
  description: string
  icon: LucideIcon
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4" />
        <span>{title}</span>
        <span className="text-xs">({description})</span>
      </dt>
      <dd className="font-medium tabular-nums">{value.toLocaleString()}</dd>
    </div>
  )
}

function ModelUsageTable({ models }: { models: ModelUsageStats[] }) {
  if (models.length === 0) {
    return <p className="py-6 text-center text-muted-foreground">No model usage recorded in this period</p>
  }

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">Model usage</h3>
      <p className="text-sm text-muted-foreground">AI model usage by calls and tokens</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Model</TableHead>
            <TableHead className="text-right">Calls</TableHead>
            <TableHead className="text-right">Tokens</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {models.map((model) => (
            <TableRow key={model.modelName}>
              <TableCell className="flex items-center gap-2 font-medium">
                <Brain className="size-4 text-muted-foreground" />
                {model.modelName}
              </TableCell>
              <TableCell className="text-right tabular-nums">{model.totalCalls.toLocaleString()}</TableCell>
              <TableCell className="text-right tabular-nums">{model.totalTokens.toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function PeriodStatsView({ stats }: { stats: PeriodStats }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">At a glance</h3>
        <dl className="divide-y">
          <StatRow
            title="Total messages"
            value={stats.totalMessages}
            description="chat messages sent"
            icon={MessageSquare}
          />
          <StatRow title="Unique users" value={stats.totalUsers} description="users who sent messages" icon={Users} />
        </dl>
      </div>

      <div className="border-t pt-6">
        <ModelUsageTable models={stats.modelUsage} />
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="divide-y">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center justify-between py-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
      <div className="space-y-2 border-t pt-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  )
}

export default function AdminStats() {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/admin/stats")
        if (!response.ok) {
          throw new Error("Failed to fetch statistics")
        }
        const data = await response.json()
        setStats(data)
      } catch (error) {
        console.error("Error fetching stats:", error)
        toast.error("Failed to load statistics. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return <LoadingSkeleton />
  }

  if (!stats) {
    return <p className="py-6 text-center text-muted-foreground">Failed to load statistics</p>
  }

  return (
    <Tabs defaultValue="7days" className="space-y-6">
      <TabsList className="grid w-full max-w-md grid-cols-3">
        <TabsTrigger value="7days">Last 7 Days</TabsTrigger>
        <TabsTrigger value="30days">Last 30 Days</TabsTrigger>
        <TabsTrigger value="365days">Last 365 Days</TabsTrigger>
      </TabsList>

      <TabsContent value="7days">
        <PeriodStatsView stats={stats.last7Days} />
      </TabsContent>

      <TabsContent value="30days">
        <PeriodStatsView stats={stats.last30Days} />
      </TabsContent>

      <TabsContent value="365days">
        <PeriodStatsView stats={stats.last365Days} />
      </TabsContent>
    </Tabs>
  )
}
