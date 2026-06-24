import { auth } from "@/auth"
import { PanelExportMenu } from "@/components/panel/panel-export-menu"
import { FIXATION_LABELS } from "@/components/panel/types"
import { CustomBreadcrumbs } from "@/components/shared/custom-breadcrumbs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
  if (!id) return { title: "Panel Not Found | PanelMaker" }
  const panel = await getPanelById(id)
  if (!panel) return { title: "Panel Not Found | PanelMaker" }
  return {
    title: `${panel.name} | PanelMaker`,
    description: panel.description ?? `A spatial proteomics antibody panel with ${panel.cycles.length} cycle(s).`,
  }
}

export default async function PanelDetailPage({ params }: PanelDetailPageProps) {
  const { id } = await params

  if (!id) {
    notFound()
  }

  const [panel, session] = await Promise.all([getPanelById(id), auth()])

  if (!panel) {
    notFound()
  }

  if (!panel.isPublic && panel.ownerId !== session?.user?.id) {
    notFound()
  }

  const isOwner = session?.user?.id === panel.ownerId
  const speciesLabel = panel.species?.label ?? null
  const fixationLabel = panel.fixation
    ? (FIXATION_LABELS[panel.fixation as keyof typeof FIXATION_LABELS] ?? panel.fixation)
    : null
  const totalMarkers = panel.cycles.reduce((sum, cycle) => sum + cycle.markers.length, 0)

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <CustomBreadcrumbs items={[{ label: "Panels", href: "/panel" }, { label: panel.name }]} />

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{panel.name}</h1>
          {panel.description && <p className="text-muted-foreground max-w-2xl">{panel.description}</p>}
          {panel.owner?.name && (
            <p className="text-sm text-muted-foreground">
              By{" "}
              <Link
                href={`/profile/${panel.ownerId}`}
                className="font-medium text-foreground transition-colors hover:text-primary hover:underline"
              >
                {panel.owner.name}
              </Link>
            </p>
          )}
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
        {panel.condition && <Badge variant="outline">Condition: {panel.condition.label}</Badge>}
        <Badge variant="outline">
          <Layers className="h-3.5 w-3.5 mr-1" />
          {panel.cycles.length} {panel.cycles.length === 1 ? "cycle" : "cycles"}
        </Badge>
        <Badge variant="outline">
          {totalMarkers} {totalMarkers === 1 ? "marker" : "markers"}
        </Badge>
      </div>

      {panel.cycles.length === 0 ? (
        <p className="rounded-md border py-8 text-center text-muted-foreground">This panel has no cycles yet.</p>
      ) : (
        <Accordion type="multiple" className="rounded-md border">
          {panel.cycles.map((cycle) => {
            const markerNames = cycle.markers.map(
              (m) => m.protein?.geneSymbol ?? m.protein?.label ?? m.antibody?.name ?? "Unknown",
            )
            return (
              <AccordionItem key={cycle.id} value={String(cycle.id)} className="px-4 last:border-b-0">
                <AccordionTrigger className="gap-3 hover:no-underline">
                  <div className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <Layers className="size-4 shrink-0 text-muted-foreground" />
                    <span className="shrink-0 font-medium">{cycle.name}</span>
                    <Badge variant="secondary" className="shrink-0 tabular-nums">
                      {cycle.markers.length}
                    </Badge>
                    <span className="min-w-0 flex-1 truncate text-sm font-normal text-muted-foreground">
                      {markerNames.length > 0 ? markerNames.join(", ") : "No markers"}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {cycle.notes && <p className="mb-3 text-sm text-muted-foreground">{cycle.notes}</p>}
                  {cycle.markers.length > 0 ? (
                    <div className="overflow-x-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="h-8 py-1 text-xs">Marker</TableHead>
                            <TableHead className="h-8 py-1 text-xs">Clone</TableHead>
                            <TableHead className="h-8 py-1 text-xs">Vendor</TableHead>
                            <TableHead className="h-8 py-1 text-xs">RRID</TableHead>
                            <TableHead className="h-8 py-1 text-xs">Label / Tag</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cycle.markers.map((marker) => (
                            <TableRow key={marker.id}>
                              <TableCell className="py-2">
                                <div className="font-medium">
                                  {marker.protein ? (
                                    <Link
                                      href={`/marker/${marker.protein.id}`}
                                      className="text-primary hover:underline"
                                    >
                                      {marker.protein.label}
                                    </Link>
                                  ) : (
                                    (marker.antibody?.name ?? "Unknown marker")
                                  )}
                                </div>
                                {marker.protein?.geneSymbol && (
                                  <div className="font-mono text-xs text-muted-foreground">
                                    {marker.protein.geneSymbol}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="py-2 text-muted-foreground">
                                {marker.antibody?.cloneId ?? "—"}
                              </TableCell>
                              <TableCell className="py-2 text-muted-foreground">
                                {marker.antibody?.vendorName ? (
                                  <>
                                    <span className="text-foreground">{marker.antibody.vendorName}</span>
                                    {marker.antibody.catalogNumber && (
                                      <span className="block text-xs">{marker.antibody.catalogNumber}</span>
                                    )}
                                  </>
                                ) : (
                                  "—"
                                )}
                              </TableCell>
                              <TableCell className="py-2 font-mono text-xs">
                                {marker.antibody?.rrid ? (
                                  <Link
                                    href={`/antibody/${marker.antibody.rrid.replace(/^RRID:/, "")}`}
                                    className="text-primary hover:underline"
                                  >
                                    {marker.antibody.rrid}
                                  </Link>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="py-2">
                                {marker.fluorophore || marker.metalTag ? (
                                  <div className="flex flex-wrap gap-1.5">
                                    {marker.fluorophore && (
                                      <Badge variant="outline" className="text-xs">
                                        {marker.fluorophore.name}
                                      </Badge>
                                    )}
                                    {marker.metalTag && (
                                      <Badge variant="secondary" className="text-xs">
                                        {marker.metalTag}
                                      </Badge>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-sm italic text-muted-foreground">No markers in this cycle.</p>
                  )}
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      )}
    </div>
  )
}
