import { auth } from "@/auth"
import { PanelExportMenu } from "@/components/panel/panel-export-menu"
import { FIXATION_LABELS, SPECIES_LABELS } from "@/components/panel/types"
import { CustomBreadcrumbs } from "@/components/shared/custom-breadcrumbs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { getPanelById } from "@/models/panel"
import { Edit, Layers } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

interface PanelDetailPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PanelDetailPageProps): Promise<Metadata> {
  const { id } = await params
  const numericId = parseInt(id, 10)
  if (isNaN(numericId)) return { title: "Panel Not Found | PanelMaker" }
  const panel = await getPanelById(numericId)
  if (!panel) return { title: "Panel Not Found | PanelMaker" }
  return {
    title: `${panel.name} | PanelMaker`,
    description: panel.description ?? `A spatial proteomics antibody panel with ${panel.cycles.length} cycle(s).`,
  }
}

export default async function PanelDetailPage({ params }: PanelDetailPageProps) {
  const { id } = await params
  const numericId = parseInt(id, 10)

  if (isNaN(numericId)) {
    notFound()
  }

  const [panel, session] = await Promise.all([getPanelById(numericId), auth()])

  if (!panel) {
    notFound()
  }

  if (!panel.isPublic && panel.ownerId !== session?.user?.id) {
    notFound()
  }

  const isOwner = session?.user?.id === panel.ownerId
  const speciesLabel = panel.species ? (SPECIES_LABELS[panel.species] ?? panel.species) : null
  const fixationLabel = panel.fixation ? (FIXATION_LABELS[panel.fixation] ?? panel.fixation) : null
  const totalMarkers = panel.cycles.reduce((sum, cycle) => sum + cycle.markers.length, 0)

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <CustomBreadcrumbs items={[{ label: "Panels", href: "/panel" }, { label: panel.name }]} />

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{panel.name}</h1>
          {panel.description && <p className="text-muted-foreground max-w-2xl">{panel.description}</p>}
          {panel.owner?.name && <p className="text-sm text-muted-foreground">By {panel.owner.name}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <PanelExportMenu panelId={panel.id} />
          {isOwner && (
            <Button asChild variant="outline" size="sm">
              <Link href="/panel">
                <Edit className="h-4 w-4 mr-2" />
                Edit in Designer
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {speciesLabel && <Badge variant="outline">{speciesLabel}</Badge>}
        {fixationLabel && <Badge variant="secondary">{fixationLabel}</Badge>}
        {panel.condition && <Badge variant="outline">Condition: {panel.condition}</Badge>}
        <Badge variant="outline">
          <Layers className="h-3.5 w-3.5 mr-1" />
          {panel.cycles.length} {panel.cycles.length === 1 ? "cycle" : "cycles"}
        </Badge>
        <Badge variant="outline">
          {totalMarkers} {totalMarkers === 1 ? "marker" : "markers"}
        </Badge>
      </div>

      <div className="space-y-4">
        {panel.cycles.map((cycle) => (
          <Card key={cycle.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                {cycle.name}
              </CardTitle>
              {cycle.notes && <p className="text-sm text-muted-foreground">{cycle.notes}</p>}
            </CardHeader>
            {cycle.markers.length > 0 && (
              <CardContent>
                <Separator className="mb-4" />
                <div className="space-y-3">
                  {cycle.markers.map((marker) => (
                    <div key={marker.id} className="flex items-start justify-between gap-4 p-3 bg-muted/30 rounded-lg">
                      <div className="space-y-0.5 min-w-0">
                        <p className="font-medium text-sm">
                          {marker.protein?.label ?? marker.antibody?.name ?? "Unknown marker"}
                        </p>
                        {marker.protein?.geneSymbol && (
                          <p className="text-xs text-muted-foreground font-mono">{marker.protein.geneSymbol}</p>
                        )}
                        {marker.antibody && (
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            {marker.antibody.cloneId && <span className="block">Clone: {marker.antibody.cloneId}</span>}
                            {marker.antibody.vendorName && (
                              <span className="block">
                                {marker.antibody.vendorName}
                                {marker.antibody.catalogNumber && ` — ${marker.antibody.catalogNumber}`}
                              </span>
                            )}
                            {marker.antibody.rrid && (
                              <span className="block font-mono">RRID: {marker.antibody.rrid}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5 shrink-0">
                        {marker.fluorophore && (
                          <Badge variant="outline" className="text-xs">
                            {marker.fluorophore}
                          </Badge>
                        )}
                        {marker.metalTag && (
                          <Badge variant="secondary" className="text-xs">
                            {marker.metalTag}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
            {cycle.markers.length === 0 && (
              <CardContent>
                <p className="text-sm text-muted-foreground italic">No markers in this cycle.</p>
              </CardContent>
            )}
          </Card>
        ))}

        {panel.cycles.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">This panel has no cycles yet.</CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
