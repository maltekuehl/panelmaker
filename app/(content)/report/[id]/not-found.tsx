import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileX } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Report Not Found | PanelMaker",
  description: "The requested experimental report could not be found.",
}

export default function ReportNotFound() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
              <FileX className="w-6 h-6 text-muted-foreground" />
            </div>
            <CardTitle>Report Not Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              The experimental report you&apos;re looking for doesn&apos;t exist or may have been removed.
            </p>
            <Button asChild>
              <Link href="/browse">Browse All Markers</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
