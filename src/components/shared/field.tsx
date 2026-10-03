"use client"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react"

interface FieldProps {
  label: string
  hint?: string
  required?: boolean
  className?: string
  labelClassName?: string
  children: ReactNode | ((id: string) => ReactNode)
}

// The generated id is handed to the control so the label points at it: either through the render-prop
// form, or by cloning a single child element that accepts an id (Input, Textarea, the comboboxes).
export function Field({ label, hint, required, className, labelClassName, children }: FieldProps) {
  const id = useId()

  let control: ReactNode
  if (typeof children === "function") {
    control = children(id)
  } else if (isValidElement(children) && (children.props as { id?: string }).id === undefined) {
    control = cloneElement(children as ReactElement<{ id?: string }>, { id })
  } else {
    control = children
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id} className={labelClassName ?? "text-xs font-medium text-muted-foreground"}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {control}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
