import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Documentation | PanelMaker",
  description:
    "Learn how to use PanelMaker, contribute MCP servers, integrate biomedical tools, and build agentic AI systems for research and healthcare.",
  keywords: [
    "PanelMaker documentation",
    "MCP tutorial",
    "biomedical MCP",
    "AI research tools",
    "MCP server development",
    "registry guide",
    "knowledgebase MCP",
  ],
  openGraph: {
    title: "Documentation | PanelMaker",
    description: "Complete guide to PanelMaker and biomedical MCP servers",
    type: "website",
  },
}

export default function DocsMarkdownLayout({ children }: { children: React.ReactNode }) {
  return <div className="docs max-w-full min-w-0 prose prose-zinc p-6 dark:prose-invert">{children}</div>
}
