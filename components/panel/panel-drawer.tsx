"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { usePanelsSignal } from "@/stores/panels"
import { Palette, X } from "lucide-react"
import { useSession } from "next-auth/react"
import { useCallback, useEffect, useState } from "react"
import { PanelWorkspace } from "./panel-workspace"

export function PanelDrawer() {
  const [open, setOpen] = useState(false)
  const [hasOpened, setHasOpened] = useState(false)
  const [markerCount, setMarkerCount] = useState(0)
  const { data: session } = useSession()
  const panelsVersion = usePanelsSignal((s) => s.version)

  useEffect(() => {
    if (open) setHasOpened(true)
  }, [open])

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
  }, [session, fetchPanelCount, panelsVersion])

  useEffect(() => {
    if (!open && session?.user) fetchPanelCount()
  }, [open, session, fetchPanelCount])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  if (!session?.user) return null

  return (
    <>
      <div
        className={cn(
          "fixed right-0 top-1/2 z-40 -translate-y-1/2 transition-opacity",
          open && "pointer-events-none opacity-0",
        )}
      >
        <Button
          className="h-auto flex-col gap-2 rounded-l-2xl rounded-r-none border-b border-l border-t border-primary-foreground/10 bg-primary px-3 py-5 shadow-xl hover:bg-primary/90"
          onClick={() => setOpen(true)}
          aria-hidden={open}
          aria-label="Open panel designer"
        >
          <Palette className="h-6 w-6" />
          <span className="text-xs font-semibold leading-tight tracking-wide [writing-mode:vertical-lr]">Panel</span>
          {markerCount > 0 && (
            <Badge variant="secondary" className="h-5 w-5 justify-center rounded-full p-0 text-[10px] font-bold">
              {markerCount}
            </Badge>
          )}
        </Button>
      </div>

      <aside
        aria-hidden={!open}
        className={cn(
          "fixed bottom-0 right-0 top-16 z-40 flex w-[420px] max-w-[calc(100vw-1rem)] flex-col border-l bg-popover text-popover-foreground shadow-2xl transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "pointer-events-none translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-heading text-base font-medium">Panel Designer</h2>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close panel designer">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-hidden">{hasOpened && <PanelWorkspace flat />}</div>
      </aside>
    </>
  )
}
