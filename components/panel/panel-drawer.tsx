"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Palette } from "lucide-react"
import { useSession } from "next-auth/react"
import { useCallback, useEffect, useState } from "react"
import { PanelWorkspace } from "./panel-workspace"

export function PanelDrawer() {
  const [open, setOpen] = useState(false)
  const [markerCount, setMarkerCount] = useState(0)
  const { data: session } = useSession()

  const fetchPanelCount = useCallback(async () => {
    try {
      const res = await fetch("/api/panels")
      if (!res.ok) return
      const json = await res.json()
      const panels = json.data?.panels ?? json.panels ?? []
      const total = panels.reduce(
        (sum: number, p: { cycles: { markers: unknown[] }[] }) =>
          sum + p.cycles.reduce((cs: number, c: { markers: unknown[] }) => cs + c.markers.length, 0),
        0,
      )
      setMarkerCount(total)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (session?.user) fetchPanelCount()
  }, [session, fetchPanelCount])

  useEffect(() => {
    if (!open && session?.user) fetchPanelCount()
  }, [open, session, fetchPanelCount])

  if (!session?.user) return null

  return (
    <>
      <Button
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 h-auto rounded-l-2xl rounded-r-none shadow-xl px-3 py-5 flex-col gap-2 bg-primary hover:bg-primary/90 border-l border-t border-b border-primary-foreground/10"
        onClick={() => setOpen(true)}
      >
        <Palette className="h-6 w-6" />
        <span className="text-xs font-semibold leading-tight [writing-mode:vertical-lr] tracking-wide">Panel</span>
        {markerCount > 0 && (
          <Badge variant="secondary" className="h-5 w-5 p-0 justify-center text-[10px] font-bold rounded-full">
            {markerCount}
          </Badge>
        )}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[420px] sm:max-w-[420px] p-0 flex flex-col">
          <SheetHeader className="p-4 pb-0">
            <SheetTitle>Panel Designer</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden">
            <PanelWorkspace />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
