"use client"

import { AntibodyDetails, getAntibodyDetails } from "@/app/actions/get-antibody-details"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { MarkerUsage } from "@/lib/mock-data"
import { CheckCircle2, ChevronDown, ChevronRight, HelpCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import { Fragment, useState } from "react"

interface MarkerUsagesTableProps {
  data: MarkerUsage[]
}

export function MarkerUsagesTable({ data }: MarkerUsagesTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [detailsCache, setDetailsCache] = useState<Record<string, AntibodyDetails | null>>({})
  const [loadingRows, setLoadingRows] = useState<Set<string>>(new Set())

  const toggleRow = async (id: string, antibodyId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
      if (!detailsCache[antibodyId] && !loadingRows.has(id)) {
        setLoadingRows((prev) => new Set(prev).add(id))
        try {
          const details = await getAntibodyDetails(antibodyId)
          setDetailsCache((prev) => ({ ...prev, [antibodyId]: details }))
        } catch (error) {
          console.error("Failed to fetch details", error)
        } finally {
          setLoadingRows((prev) => {
            const next = new Set(prev)
            next.delete(id)
            return next
          })
        }
      }
    }
    setExpandedRows(newExpanded)
  }

  if (data.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        No experimental usage reports available for this marker.
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[30px] h-8 py-1"></TableHead>
            <TableHead className="h-8 py-1 text-xs">Method</TableHead>
            <TableHead className="h-8 py-1 text-xs">Host</TableHead>
            <TableHead className="h-8 py-1 text-xs">Antibody</TableHead>
            <TableHead className="h-8 py-1 text-xs">Sample</TableHead>
            <TableHead className="h-8 py-1 text-xs">Dilution</TableHead>
            <TableHead className="h-8 py-1 text-xs">Antigen Retrieval</TableHead>
            <TableHead className="h-8 py-1 text-xs">Validation</TableHead>
            <TableHead className="h-8 py-1 text-xs">Submitter</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((usage) => (
            <Fragment key={usage.id}>
              <TableRow
                className="text-xs cursor-pointer hover:bg-muted/50"
                onClick={() => toggleRow(usage.id, usage.antibodyId)}
              >
                <TableCell className="py-2 pl-2 pr-0">
                  {loadingRows.has(usage.id) ? (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  ) : expandedRows.has(usage.id) ? (
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  )}
                </TableCell>
                <TableCell className="py-2 font-medium">{usage.method}</TableCell>
                <TableCell className="py-2">{usage.hostSpecies}</TableCell>
                <TableCell className="py-2">
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {usage.antibodyVendor} <span className="text-muted-foreground font-normal">({usage.clone})</span>
                    </span>
                    <Link
                      href={`/antibody/${usage.antibodyId.replace(/^RRID:/, "")}`}
                      className="text-[10px] text-muted-foreground hover:underline hover:text-primary w-fit"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {usage.antibodyId}
                    </Link>
                  </div>
                </TableCell>
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
              {expandedRows.has(usage.id) && (
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableCell colSpan={9} className="p-0">
                    <div className="p-4 grid grid-cols-2 gap-4 text-xs">
                      {detailsCache[usage.antibodyId] ? (
                        <>
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm">Antibody Details</h4>
                            <div className="grid grid-cols-[100px_1fr] gap-1">
                              <span className="text-muted-foreground">Name:</span>
                              <span>{detailsCache[usage.antibodyId]?.name}</span>
                              <span className="text-muted-foreground">Target:</span>
                              <span>{detailsCache[usage.antibodyId]?.target}</span>
                              <span className="text-muted-foreground">Clonality:</span>
                              <span>{detailsCache[usage.antibodyId]?.clonality}</span>
                              <span className="text-muted-foreground">Clone ID:</span>
                              <span>{detailsCache[usage.antibodyId]?.cloneId || "N/A"}</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm">Registry Information</h4>
                            <div className="grid grid-cols-[100px_1fr] gap-1">
                              <span className="text-muted-foreground">Vendor:</span>
                              <span>{detailsCache[usage.antibodyId]?.vendor}</span>
                              <span className="text-muted-foreground">Catalog #:</span>
                              <span>{detailsCache[usage.antibodyId]?.catalogNumber}</span>
                              <span className="text-muted-foreground">Citation:</span>
                              <span className="font-mono text-[10px]">{detailsCache[usage.antibodyId]?.citation}</span>
                            </div>
                            <div className="mt-2 pt-2 border-t">
                              <p className="text-muted-foreground italic">
                                {detailsCache[usage.antibodyId]?.description}
                              </p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="col-span-2 text-center py-2 text-muted-foreground">
                          {loadingRows.has(usage.id)
                            ? "Loading registry data..."
                            : "No details found in Antibody Registry."}
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
