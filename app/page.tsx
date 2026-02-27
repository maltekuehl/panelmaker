import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { prisma } from "@/lib/prisma"
import { Bot, Database, Layers, Microscope, Search, ShieldCheck, Users } from "lucide-react"
import type { Metadata } from "next"
import { cacheLife } from "next/cache"
import Link from "next/link"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "PanelMaker - Validated Spatial Proteomics Marker Database",
  description:
    "A community-driven database of validated cell type markers for spatial proteomics, including IF, MIBI-Tof, CODEX, PathoPlex, and IMC. Bridge the gap between single-cell transcriptomics and spatial biology.",
  keywords: [
    "PanelMaker",
    "Spatial Proteomics",
    "Immunofluorescence",
    "MIBI-Tof",
    "CODEX",
    "PathoPlex",
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

  return (
    <div className="grid grid-cols-3 gap-8 md:gap-16 pt-12">
      <div className="text-center">
        <div className="text-3xl font-bold text-primary">{formatCount(proteinCount)}</div>
        <div className="text-sm text-muted-foreground">Proteins</div>
      </div>
      <div className="text-center">
        <div className="text-3xl font-bold text-primary">{formatCount(antibodyCount)}</div>
        <div className="text-sm text-muted-foreground">Antibodies</div>
      </div>
      <div className="text-center">
        <div className="text-3xl font-bold text-primary">{formatCount(reportCount)}</div>
        <div className="text-sm text-muted-foreground">Validated Reports</div>
      </div>
    </div>
  )
}

function HomeStatsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-8 md:gap-16 pt-12">
      {[0, 1, 2].map((i) => (
        <div key={i} className="text-center flex flex-col items-center gap-2">
          <Skeleton className="h-9 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  )
}

export default async function HomePage() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center py-20 md:py-32 text-center space-y-8 container mx-auto px-4">
        <div>
          <Badge
            variant="secondary"
            className="rounded-full px-4 py-1.5 text-sm mb-6 font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
          >
            Community-Driven Spatial Biology
          </Badge>
        </div>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter max-w-5xl">
          The Database for <span className="text-primary whitespace-nowrap">Spatial Proteomics</span> Markers
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed text-balance">
          Discover experimentally validated antibodies for standard IF, MIBI-Tof, CODEX, PathoPlex, and IMC.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center pt-4">
          <Button asChild size="lg" className="h-12 px-8 text-base rounded-full">
            <Link href="/browse">
              <Search className="mr-2 h-4 w-4" /> Search Markers
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base rounded-full">
            <Link href="/panel">
              <Layers className="mr-2 h-4 w-4" /> Design Panel
            </Link>
          </Button>
        </div>

        {/* Quick Stats */}
        <Suspense fallback={<HomeStatsSkeleton />}>
          <HomeStats />
        </Suspense>
      </section>

      {/* Features Grid */}
      <section className="bg-muted/30 py-24 border-y">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl font-bold tracking-tight">From Transcriptomics to Proteomics</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              PanelMaker provides the tools and data needed to translate gene expression signatures into validated
              staining protocols.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<ShieldCheck className="h-8 w-8 text-primary" />}
              title="Validated Antibodies"
              description="Access a curated database of antibodies with experimental evidence, validation scores (0-3), and detailed protocols."
            />
            <FeatureCard
              icon={<Layers className="h-8 w-8 text-primary" />}
              title="Panel Designer"
              description="Interactive tool to build multiplex panels. Select targets and get AI suggestions for compatible marker combinations."
            />
            <FeatureCard
              icon={<Database className="h-8 w-8 text-primary" />}
              title="Rich Metadata"
              description="Complete info on species, tissue specificity, antigen retrieval, and cross-reactivity for every marker."
            />
            <FeatureCard
              icon={<Users className="h-8 w-8 text-primary" />}
              title="Community Driven"
              description="Submit your own validated markers and protocols. Peer review system ensures high-quality data standards."
            />
            <FeatureCard
              icon={<Microscope className="h-8 w-8 text-primary" />}
              title="Imaging Focused"
              description="Visual database with high-quality examples from IF, MIBI, CODEX, and IMC to verify subcellular localization."
            />
            <FeatureCard
              icon={<Bot className="h-8 w-8 text-primary" />}
              title="AI Assistant"
              description="Integrated chatbot to help find markers for specific cell types or troubleshoot staining protocols."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 container mx-auto px-4 text-center">
        <div className="bg-primary/5 rounded-3xl p-12 md:p-24 border border-primary/10">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 tracking-tight">Contribute to the Atlas</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Join the consortium of immunologists and spatial biologists building the definitive resource for spatial
            proteomics markers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="rounded-full px-8">
              <Link href="/submit">Submit a Marker</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full px-8">
              <Link href="/browse">Browse Database</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="bg-background border-muted/60 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
      <CardHeader>
        <div className="mb-4 p-3 bg-primary/10 w-fit rounded-xl">{icon}</div>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  )
}
