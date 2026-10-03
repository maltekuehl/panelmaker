import { getInstanceConfig } from "@/lib/instance"
import { MetadataRoute } from "next"
import { connection } from "next/server"

export default async function robots(): Promise<MetadataRoute.Robots> {
  await connection()
  const { baseUrl, allowIndexing } = getInstanceConfig()

  if (!allowIndexing) {
    return { rules: [{ userAgent: "*", disallow: "/" }] }
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/auth/", "/_next/", "/settings", "/labs", "/lab/", "/chat"],
      },
      {
        userAgent: [
          "Amazonbot",
          "Applebot-Extended",
          "Bytespider",
          "CCBot",
          "ClaudeBot",
          "Google-Extended",
          "GPTBot",
          "meta-externalagent",
        ],
        disallow: "/",
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
