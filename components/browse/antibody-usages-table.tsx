"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { MarkerUsage } from "@/lib/mock-data"
import { CheckCircle2, HelpCircle } from "lucide-react"
import Link from "next/link"

interface AntibodyUsagesTableProps {
  data: (MarkerUsage & { markerName?: string })[]
}

export function AntibodyUsagesTable({ data }: AntibodyUsagesTableProps) {
  if (data.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        No experimental usage reports available for this antibody.
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-8 py-1 text-xs">Marker</TableHead>
            <TableHead className="h-8 py-1 text-xs">Method</TableHead>
            <TableHead className="h-8 py-1 text-xs">Sample</TableHead>
            <TableHead className="h-8 py-1 text-xs">Dilution</TableHead>
            <TableHead className="h-8 py-1 text-xs">Antigen Retrieval</TableHead>
            <TableHead className="h-8 py-1 text-xs">Validation</TableHead>
            <TableHead className="h-8 py-1 text-xs">Submitter</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((usage) => (
            <TableRow key={usage.id} className="text-xs hover:bg-muted/50">
              <TableCell className="py-2 font-medium">
                {usage.markerName ? (
                  <Link href={`/marker/${usage.markerName}`} className="hover:underline text-primary">
                    {usage.markerName}
                  </Link>
                ) : (
                  "Unknown"
                )}
              </TableCell>
              <TableCell className="py-2 font-medium">{usage.method}</TableCell>
              <TableCell className="py-2">
                <div className="flex flex-col">
                  <span className="font-medium">{usage.species}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {usage.tissue} - {usage.condition}
                  </span>
                </div>
              </TableCell>
              <TableCell className="py-2">{usage.dilution}</TableCell>
              <TableCell className="py-2">{usage.antigenRetrieval}</TableCell>
              <TableCell className="py-2">
                <div className="flex items-center gap-1.5">
                  {usage.validationCategory >= 3 ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <HelpCircle className="h-3.5 w-3.5 text-amber-500" />
                  )}
                  <span>Lvl {usage.validationCategory}</span>
                </div>
              </TableCell>
              <TableCell className="py-2">{usage.submitter}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
