import createMDX from "@next/mdx"
import { NextConfig } from "next"

const isProd = process.env.NODE_ENV === "production"

const self = ["'self'"]
const site = ["'self'", ...(isProd ? [] : ["localhost:*"])]

const directives: Record<string, string[]> = {
  "default-src": ["'none'"],
  "base-uri": site,
  "script-src": [...site, "'unsafe-inline'", ...(isProd ? [] : ["'unsafe-eval'"])],
  "style-src": [...site, "'unsafe-inline'"],
  "img-src": [...site, "data:", "blob:", "https://avatars.githubusercontent.com", "https://raw.githubusercontent.com"],
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

// A production build served on a local host (`npm run build && npm start`) runs over plain http, so it
// must not force https: upgrade-insecure-requests would rewrite every asset to https and fail on TLS.
// Next matches this against the request's Host header without the port, anchored as ^...$.
const LOCAL_HOST_PATTERN = "(?:localhost|127\\.0\\.0\\.1|[a-z0-9-]+\\.localhost)"

function buildSecurityHeaders(requireHttps: boolean): { key: string; value: string }[] {
  const contentSecurityPolicy = [
    ...Object.entries(directives).map(([name, values]) => `${name} ${values.join(" ")}`),
    ...(requireHttps ? ["upgrade-insecure-requests"] : []),
  ].join("; ")

  return [
    { key: "X-DNS-Prefetch-Control", value: "on" },
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "same-origin" },
    ...(requireHttps ? [{ key: "Strict-Transport-Security", value: "max-age=63072000" }] : []),
    { key: "Content-Security-Policy", value: contentSecurityPolicy },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    { key: "X-Accel-Buffering", value: "no" },
  ]
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  output: process.env.NEXT_OUTPUT_STANDALONE === "1" ? "standalone" : undefined,
  typescript: { ignoreBuildErrors: process.env.NEXT_SKIP_TYPECHECK === "1" },
  serverExternalPackages: ["pg", "@prisma/adapter-pg", "sharp"],
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  trailingSlash: false,
  reactCompiler: true,
  outputFileTracingRoot: __dirname,
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  compress: true,
  async redirects() {
    return [{ source: "/legal/:document", destination: "/docs/legal/:document", permanent: true }]
  },
  async headers() {
    return [
      {
        source: "/:path*",
        missing: [{ type: "host", value: LOCAL_HOST_PATTERN }],
        headers: buildSecurityHeaders(isProd),
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: LOCAL_HOST_PATTERN }],
        headers: buildSecurityHeaders(false),
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
