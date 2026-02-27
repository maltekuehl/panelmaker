import { prisma } from "@/lib/prisma"
import { MetadataRoute } from "next"

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://panelmaker.ai"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/browse`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/panel`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/submit`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/chat`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/legal/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/legal/terms`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ]

  try {
    const [proteins, cellTypes] = await Promise.all([
      prisma.protein.findMany({ select: { id: true } }),
      prisma.cellType.findMany({ select: { id: true } }),
    ])

    const proteinRoutes: MetadataRoute.Sitemap = proteins.map((p) => ({
      url: `${baseUrl}/marker/${encodeURIComponent(p.id)}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }))

    const cellTypeRoutes: MetadataRoute.Sitemap = cellTypes.map((ct) => ({
      url: `${baseUrl}/celltype/${encodeURIComponent(ct.id)}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }))

    return [...staticRoutes, ...proteinRoutes, ...cellTypeRoutes]
  } catch (error) {
    console.error("Error generating sitemap:", error)
    return staticRoutes
  }
}
