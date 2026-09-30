"use client"

import { cn } from "@/lib/utils"
import { Children, useLayoutEffect, useRef, useState, type ReactNode } from "react"

type BalancedGridProps = {
  children: ReactNode
  minItemWidth?: number
  gap?: number
  className?: string
}

export function BalancedGrid({ children, minItemWidth = 150, gap = 8, className }: BalancedGridProps) {
  const ref = useRef<HTMLDivElement>(null)
  const count = Children.toArray(children).length
  const [columns, setColumns] = useState(count)

  useLayoutEffect(() => {
    const element = ref.current
    if (!element || count === 0) return
    const update = () => {
      const capacity = Math.max(1, Math.floor((element.clientWidth + gap) / (minItemWidth + gap)))
      const rows = Math.ceil(count / capacity)
      setColumns(Math.ceil(count / rows))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [count, gap, minItemWidth])

  return (
    <div
      ref={ref}
      className={cn("grid", className)}
      style={{ gap, gridTemplateColumns: `repeat(${Math.max(1, columns)}, minmax(0, 1fr))` }}
    >
      {children}
    </div>
  )
}
