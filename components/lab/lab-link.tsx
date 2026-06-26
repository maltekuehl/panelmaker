import { cn } from "@/lib/utils"
import Link from "next/link"

interface LabLinkProps {
  slug: string
  name: string
  className?: string
}

export function LabLink({ slug, name, className }: LabLinkProps) {
  return (
    <Link href={`/labs/${slug}`} className={cn("text-primary hover:underline", className)}>
      {name}
    </Link>
  )
}
