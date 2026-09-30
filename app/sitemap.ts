import { getInstanceConfig } from "@/lib/instance"
import { prisma } from "@/lib/prisma"
import { MetadataRoute } from "next"
import { connection } from "next/server"

const STATIC_PATHS: {
  path: string
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]
  priority: number
}[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/browse", changeFrequency: "daily", priority: 0.9 },
  { path: "/panel", changeFrequency: "weekly", priority: 0.8 },
  { path: "/leaderboard", changeFrequency: "weekly", priority: 0.5 },
  { path: "/docs", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/getting-started/browse", changeFrequency: "monthly", priority: 0.5 },
  { path: "/docs/getting-started/submit", changeFrequency: "monthly", priority: 0.5 },
  { path: "/docs/getting-started/panels", changeFrequency: "monthly", priority: 0.5 },
  { path: "/docs/getting-started/ai", changeFrequency: "monthly", priority: 0.5 },
  { path: "/docs/api", changeFrequency: "monthly", priority: 0.5 },
  { path: "/docs/api/auth", changeFrequency: "monthly", priority: 0.4 },
  { path: "/docs/community/conduct", changeFrequency: "monthly", priority: 0.3 },
  { path: "/docs/about", changeFrequency: "monthly", priority: 0.3 },
  { path: "/docs/getting-started/self-hosting", changeFrequency: "monthly", priority: 0.3 },
  { path: "/docs/legal/privacy", changeFrequency: "monthly", priority: 0.3 },
  { path: "/docs/legal/terms", changeFrequency: "monthly", priority: 0.3 },
  { path: "/docs/legal/notice", changeFrequency: "monthly", priority: 0.3 },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection()
  const { baseUrl, allowIndexing } = getInstanceConfig()
  if (!allowIndexing) return []

  const staticRoutes: MetadataRoute.Sitemap = STATIC_PATHS.map(({ path, changeFrequency, priority }) => ({
    url: `${baseUrl}${path}`,
    changeFrequency,
    priority,
  }))

  try {
    const [proteins, cellTypes] = await Promise.all([
      prisma.protein.findMany({ select: { id: true } }),
      prisma.cellType.findMany({ select: { id: true } }),
    ])

    const proteinRoutes: MetadataRoute.Sitemap = proteins.map((p) => ({
      url: `${baseUrl}/marker/${encodeURIComponent(p.id)}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }))

    const cellTypeRoutes: MetadataRoute.Sitemap = cellTypes.map((ct) => ({
      url: `${baseUrl}/celltype/${encodeURIComponent(ct.id)}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }))

    return [...staticRoutes, ...proteinRoutes, ...cellTypeRoutes]
  } catch (error) {
    console.error("Error generating sitemap:", error)
    return staticRoutes
  }
}
