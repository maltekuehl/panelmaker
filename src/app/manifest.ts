import { getInstanceConfig } from "@/lib/instance"
import type { MetadataRoute } from "next"
import { connection } from "next/server"

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  await connection()
  const { name } = getInstanceConfig()
  return {
    name,
    short_name: name,
    description: "Antibody panel design and validation data for multiplexed tissue imaging.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#622f82",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
