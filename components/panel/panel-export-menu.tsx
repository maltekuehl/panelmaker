"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Download } from "lucide-react"
import { toast } from "sonner"

interface PanelExportMenuProps {
  panelId: string
}

export function PanelExportMenu({ panelId }: PanelExportMenuProps) {
  const handleExport = async (format: "csv" | "order" | "json") => {
    try {
      const res = await fetch(`/api/panels/${panelId}/export?format=${format}`)
      if (!res.ok) {
        toast.error("Failed to export panel")
        return
      }
      const blob = await res.blob()
      const contentDisposition = res.headers.get("Content-Disposition")
      const filename = contentDisposition
        ? (contentDisposition.split("filename=")[1]?.replace(/"/g, "") ?? `panel.${format === "json" ? "json" : "csv"}`)
        : `panel.${format === "json" ? "json" : "csv"}`
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("Panel exported")
    } catch {
      toast.error("Failed to export panel")
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("csv")}>Export Panel (CSV)</DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("order")}>Export Order List (CSV)</DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("json")}>Export Panel (JSON)</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
