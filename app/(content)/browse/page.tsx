import { AIAssistantFloating } from "@/components/ai-assistant-floating"
import { columns } from "@/components/browse/columns"
import { DataTable } from "@/components/browse/data-table"
import { PanelWorkspace } from "@/components/panel/panel-workspace"
import { Card, CardDescription, CardTitle } from "@/components/ui/card"
import { mockMarkers } from "@/lib/mock-data"
import type { Metadata } from "next"
import { cacheLife, cacheTag } from "next/cache"

export const metadata: Metadata = {
  title: "PanelMaker - Biomedical Model Context Protocol for Agentic AI",
  description:
    "Connect agentic AI with biomedical resources using the Model Context Protocol. Discover, contribute, and use FAIR biomedical MCP servers for research and healthcare applications.",
  keywords: [
    "PanelMaker",
    "MCP",
    "Model Context Protocol",
    "biomedical AI",
    "agentic systems",
    "healthcare AI",
    "biomedical research",
    "FAIR principles",
    "bioinformatics",
    "computational biology",
    "research software",
    "AI tools",
    "MCP servers",
    "biomedical data integration",
  ],
  openGraph: {
    title: "PanelMaker - Biomedical Model Context Protocol for Agentic AI",
    description:
      "Connect agentic AI with biomedical resources using the Model Context Protocol. Discover and contribute FAIR biomedical MCP servers.",
    type: "website",
    url: "https://panelmaker.ai",
    siteName: "PanelMaker",
  },
  twitter: {
    card: "summary_large_image",
    title: "PanelMaker - Biomedical Model Context Protocol for Agentic AI",
    description: "Connect agentic AI with biomedical resources using the Model Context Protocol",
  },
}

export default async function HomePage() {
  "use cache"
  cacheLife("hours")
  cacheTag("registry:metrics")

  return (
    <div className="mx-auto container px-4 py-4 sm:px-6 md:py-6 grid grid-cols-7 gap-6">
      <div className="col-span-5 md:col-span-2 lg:col-span-5 gap-4">
        <Card className="p-4 pb-1">
          <div className="mb-4">
            <CardTitle>Marker Database</CardTitle>
            <CardDescription>Browse validated cell type markers to inform your panel design.</CardDescription>
          </div>
          <DataTable columns={columns} data={mockMarkers} />
        </Card>
      </div>
      <div className="col-span-5 md:col-span-3 lg:col-span-2 flex flex-col gap-4">
        <PanelWorkspace />
        <AIAssistantFloating />
      </div>
    </div>
  )
}
