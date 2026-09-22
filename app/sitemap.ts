import { env } from "@/lib/env"
import { prisma } from "@/lib/prisma"
import { MetadataRoute } from "next"

const baseUrl = env.NEXT_PUBLIC_BASE_URL || "https://panelmaker.ai"

const STATIC_PATHS: {
  path: string
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]
  priority: number
}[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/browse", changeFrequency: "daily", priority: 0.9 },
  { path: "/panel", changeFrequency: "weekly", priority: 0.8 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.7 },
  { path: "/leaderboard", changeFrequency: "weekly", priority: 0.5 },
  { path: "/docs", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/getting-started/browse", changeFrequency: "monthly", priority: 0.5 },
  { path: "/docs/getting-started/submit", changeFrequency: "monthly", priority: 0.5 },
  { path: "/docs/getting-started/panels", changeFrequency: "monthly", priority: 0.5 },
  { path: "/docs/getting-started/ai", changeFrequency: "monthly", priority: 0.5 },
  { path: "/docs/api", changeFrequency: "monthly", priority: 0.5 },
  { path: "/docs/api/auth", changeFrequency: "monthly", priority: 0.4 },
  { path: "/docs/community/conduct", changeFrequency: "monthly", priority: 0.3 },
  { path: "/docs/community/roadmap", changeFrequency: "monthly", priority: 0.3 },
  { path: "/docs/community/team", changeFrequency: "monthly", priority: 0.3 },
  { path: "/legal/privacy", changeFrequency: "monthly", priority: 0.3 },
  { path: "/legal/terms", changeFrequency: "monthly", priority: 0.3 },
  { path: "/legal/notice", changeFrequency: "monthly", priority: 0.3 },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = STATIC_PATHS.map(({ path, changeFrequency, priority }) => ({
    url: `${baseUrl}${path}`,
    changeFrequency,
    priority,
  }))

  try {
    const [proteins, cellTypes, posts] = await Promise.all([
      prisma.protein.findMany({ select: { id: true } }),
      prisma.cellType.findMany({ select: { id: true } }),
      prisma.blogPost.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
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

    const blogRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }))

    return [...staticRoutes, ...proteinRoutes, ...cellTypeRoutes, ...blogRoutes]
  } catch (error) {
    console.error("Error generating sitemap:", error)
    return staticRoutes
  }
}
