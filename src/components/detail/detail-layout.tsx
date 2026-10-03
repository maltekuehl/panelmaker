import { ImageCarouselDialog } from "@/components/browse/image-carousel-dialog"
import { cn } from "@/lib/utils"
import type { ComponentProps, ReactNode } from "react"

export function DetailLayout({ aside, children }: { aside: ReactNode; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <div className="space-y-6 md:col-span-2">{children}</div>
      <div className="space-y-6">{aside}</div>
    </div>
  )
}

interface SectionProps {
  title: ReactNode
  description?: ReactNode
  className?: string
  children: ReactNode
}

export function DetailSection({ title, description, className, children }: SectionProps) {
  return (
    <div className={cn("border-t pt-6", description ? "space-y-4" : "space-y-3", className)}>
      {description ? (
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      ) : (
        <h2 className="text-lg font-semibold">{title}</h2>
      )}
      {children}
    </div>
  )
}

export function AsideSection({ title, description, className, children }: SectionProps) {
  return (
    <div className={cn("space-y-3 border-t pt-6", className)}>
      {description ? (
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      ) : (
        <h3 className="font-semibold">{title}</h3>
      )}
      {children}
    </div>
  )
}

type ImagesSectionProps = ComponentProps<typeof ImageCarouselDialog> & { children?: ReactNode }

export function ImagesSection({ children, ...carousel }: ImagesSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Images</h3>
      <ImageCarouselDialog {...carousel} />
      {children}
    </div>
  )
}
