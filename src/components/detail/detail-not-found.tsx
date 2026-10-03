import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"
import Link from "next/link"

interface DetailNotFoundProps {
  icon: LucideIcon
  title: string
  description: string
  href: string
  linkLabel: string
}

export function DetailNotFound({ icon: Icon, title, description, href, linkLabel }: DetailNotFoundProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
              <Icon className="w-6 h-6 text-muted-foreground" />
            </div>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">{description}</p>
            <Button asChild>
              <Link href={href}>{linkLabel}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
