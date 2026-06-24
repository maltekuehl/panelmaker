import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { prisma } from "@/lib/prisma"
import { ArrowRight, BadgeCheck, BookOpen, Dna, FlaskConical, Layers, Plus, Search } from "lucide-react"
import type { Metadata } from "next"
import { cacheLife } from "next/cache"
import Link from "next/link"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "PanelMaker - Validated Spatial Proteomics Marker Database",
  description:
    "A community-driven database of validated cell type markers for spatial proteomics, including PathoPlex, CODEX, MIBI-ToF, IMC, and CyCIF. Bridge the gap between single-cell transcriptomics and spatial biology.",
  keywords: [
    "PanelMaker",
    "Spatial Proteomics",
    "Immunofluorescence",
    "PathoPlex",
    "MIBI-Tof",
    "CODEX",
    "IMC",
    "Multiplex Imaging",
    "Antibody Validation",
    "Spatial Biology",
    "Panel Design",
    "Cell Markers",
  ],
}

function formatCount(count: number): string {
  if (count === 0) return "Growing"
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k+`
  return `${count}+`
}

async function HomeStats() {
  "use cache"
  cacheLife("days")

  const [proteinCount, antibodyCount, reportCount] = await Promise.all([
    prisma.protein.count(),
    prisma.antibody.count(),
    prisma.experimentalReport.count({ where: { isPublic: true } }),
  ])

  const stats = [
    { label: "Proteins", value: formatCount(proteinCount), icon: Dna },
    { label: "Antibodies", value: formatCount(antibodyCount), icon: FlaskConical },
    { label: "Validated Reports", value: formatCount(reportCount), icon: BadgeCheck },
  ]

  return (
    <dl className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-xl border bg-muted/30">
      {stats.map((s) => (
        <div key={s.label} className="flex flex-col gap-1.5 px-4 py-4 sm:px-6">
          <s.icon className="size-4 text-primary" />
          <dd className="text-2xl font-bold tabular-nums leading-none sm:text-3xl">{s.value}</dd>
          <dt className="text-xs text-muted-foreground sm:text-sm">{s.label}</dt>
        </div>
      ))}
    </dl>
  )
}

function HomeStatsSkeleton() {
  return (
    <div className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-xl border bg-muted/30">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-2 px-4 py-4 sm:px-6">
          <Skeleton className="size-4" />
          <Skeleton className="h-7 w-14" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  )
}

const destinations = [
  {
    href: "/browse",
    icon: Search,
    title: "Browse Markers",
    description: "Search experimentally validated antibodies and cell type markers across the database.",
  },
  {
    href: "/panel",
    icon: Layers,
    title: "Design a Panel",
    description: "Build multiplex panels with compatibility checks and AI-assisted marker suggestions.",
  },
  {
    href: "/submit",
    icon: Plus,
    title: "Submit a Marker",
    description: "Contribute your validated markers and staining protocols to the community atlas.",
  },
  {
    href: "/docs",
    icon: BookOpen,
    title: "Documentation",
    description: "Learn how PanelMaker works and how to get the most out of the database and tools.",
  },
]

export default function HomePage() {
  return (
    <div className="container mx-auto flex flex-col gap-10 px-4 py-10 md:py-16">
      <section className="flex flex-col items-start gap-5">
        <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-medium">
          Community-Driven Spatial Biology
        </Badge>
        <h1 className="max-w-3xl text-3xl font-bold tracking-tight md:text-5xl">
          The database for <span className="text-primary">spatial proteomics</span> antibody validation
        </h1>
        <p className="max-w-3xl text-lg text-muted-foreground">
          Discover experimentally validated antibodies for PathoPlex, CODEX, and tCyCIF.
          <br />
          Then design and share your panels.
        </p>
        <Suspense fallback={<HomeStatsSkeleton />}>
          <div className="w-full max-w-xl pt-2">
            <HomeStats />
          </div>
        </Suspense>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {destinations.map((d) => (
          <Link key={d.href} href={d.href} className="group">
            <Card className="h-full transition-colors hover:border-primary/40 hover:bg-accent/40">
              <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <d.icon className="size-5" />
                </div>
                <CardTitle className="flex flex-1 items-center justify-between text-lg">
                  {d.title}
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">{d.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  )
}
