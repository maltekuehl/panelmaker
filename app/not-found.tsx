import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Home, Search } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Page Not Found | PanelMaker",
  description: "The page you're looking for could not be found.",
}

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
              <Search className="w-6 h-6 text-muted-foreground" />
            </div>
            <CardTitle>Page Not Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              The page you&apos;re looking for doesn&apos;t exist or may have been moved.
            </p>
            <div className="flex flex-col gap-2">
              <Button asChild variant="outline">
                <Link href="/">
                  <Home className="size-4" />
                  Go to Homepage
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/browse">
                  <Search className="size-4" />
                  Browse Antibodies
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
