"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { ModelUsageStats, PeriodStats, StatsResponse } from "@/types/api"
import { Brain, MessageSquare, Users } from "lucide-react"
import { useEffect, useState } from "react"

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string
  value: number
  description: string
  icon: any
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function ModelUsageCard({ models }: { models: ModelUsageStats[] }) {
  if (models.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">No model usage recorded in this period</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Model Usage</CardTitle>
        <CardDescription>AI model usage by calls and tokens</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {models.map((model, index) => (
            <div key={index} className="flex items-center justify-between px-4 py-3 rounded-md bg-muted/30">
              <div className="flex items-center space-x-2">
                <Brain className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{model.modelName}</span>
              </div>
              <div className="flex items-center space-x-6">
                <div className="text-right">
                  <div className="text-sm font-semibold">{model.totalCalls.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">calls</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{model.totalTokens.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">tokens</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function PeriodStatsView({ stats }: { stats: PeriodStats }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          title="Total Messages"
          value={stats.totalMessages}
          description="Chat messages sent"
          icon={MessageSquare}
        />
        <StatCard title="Unique Users" value={stats.totalUsers} description="Users who sent messages" icon={Users} />
      </div>

      <ModelUsageCard models={stats.modelUsage} />
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader className="space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

export default function AdminStats() {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

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
        toast({
          title: "Error",
          description: "Failed to load statistics. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [toast])

  if (loading) {
    return <LoadingSkeleton />
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Failed to load statistics</p>
        </CardContent>
      </Card>
    )
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
