import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Documentation | PanelMaker",
  description:
    "Learn how to use PanelMaker: browse validated markers, design antibody panels for spatial proteomics, submit experimental validation reports, and use the public API.",
  keywords: [
    "PanelMaker documentation",
    "antibody panel design",
    "spatial proteomics",
    "multiplexed imaging",
    "CODEX",
    "IBEX",
    "CyCIF",
    "marker database",
  ],
  openGraph: {
    title: "Documentation | PanelMaker",
    description: "Complete guide to PanelMaker for antibody panel design in spatial proteomics",
    type: "website",
  },
}

export default function DocsMarkdownLayout({ children }: { children: React.ReactNode }) {
  return <div className="docs max-w-full min-w-0 prose prose-zinc p-6 dark:prose-invert">{children}</div>
}
