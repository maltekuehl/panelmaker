import createMDX from "@next/mdx"
import { NextConfig } from "next"

const isProd = process.env.NODE_ENV === "production"

const self = ["'self'"]
const site = ["'self'", "panelmaker.ai", "*.panelmaker.ai", ...(isProd ? [] : ["localhost:*"])]

const directives: Record<string, string[]> = {
  "default-src": ["'none'"],
  "base-uri": site,
  "script-src": [...site, "'unsafe-inline'", ...(isProd ? [] : ["'unsafe-eval'"]), "*.cloudflareinsights.com"],
  "style-src": [...site, "'unsafe-inline'"],
  "img-src": [
    ...site,
    "data:",
    "blob:",
    "https://avatars.githubusercontent.com",
    "https://raw.githubusercontent.com",
    "https://media.licdn.com",
  ],
  "media-src": site,
  "font-src": site,
  "form-action": site,
  "frame-ancestors": self,
  "frame-src": site,
  "connect-src": site,
  "manifest-src": site,
  "worker-src": [...site, "blob:"],
  "object-src": ["'none'"],
}

const contentSecurityPolicy = [
  ...Object.entries(directives).map(([name, values]) => `${name} ${values.join(" ")}`),
  ...(isProd ? ["upgrade-insecure-requests"] : []),
].join("; ")

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-Accel-Buffering", value: "no" },
]

const nextConfig: NextConfig = {
  cacheComponents: true,
  output: "standalone",
  serverExternalPackages: ["pg", "@prisma/adapter-pg", "sharp"],
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  trailingSlash: false,
  reactCompiler: true,
  outputFileTracingRoot: __dirname,
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  compress: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/assets/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
    ]
  },
}

const withMDX = createMDX({
  extension: /\.(md|mdx)$/,
  options: {
    remarkPlugins: ["remark-breaks", "remark-supersub", ["remark-gfm", { singleTilde: false }]],
    rehypePlugins: [
      [
        "rehype-external-links",
        {
          target: "_blank",
          rel: ["noopener", "noreferrer"],
        },
      ],
    ],
  },
})

export default withMDX(nextConfig)
