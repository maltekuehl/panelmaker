"use client"

import { OntologyCombobox } from "@/components/ontology-combobox"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"
import { FIXATION_LABELS } from "./types"

const ontologyValueSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
})

const panelFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  species: ontologyValueSchema.nullable().optional(),
  fixation: z.string().optional(),
  condition: ontologyValueSchema.nullable().optional(),
})

type PanelFormValues = z.infer<typeof panelFormSchema>

export interface CreatePanelFormData {
  name: string
  description?: string
  speciesId?: string
  speciesLabel?: string
  fixation?: string
  conditionId?: string
  conditionLabel?: string
}

interface PanelFormProps {
  onSubmit: (data: CreatePanelFormData) => void
  onCancel?: () => void
  isSubmitting?: boolean
}

export function PanelForm({ onSubmit, onCancel, isSubmitting }: PanelFormProps) {
  const form = useForm<PanelFormValues>({
    resolver: zodResolver(panelFormSchema),
    defaultValues: {
      name: "",
      description: "",
      species: null,
      fixation: undefined,
      condition: null,
    },
  })

  const handleSubmit = (data: PanelFormValues) => {
    onSubmit({
      name: data.name,
      description: data.description,
      speciesId: data.species?.id,
      speciesLabel: data.species?.label,
      fixation: data.fixation,
      conditionId: data.condition?.id,
      conditionLabel: data.condition?.label,
    })
    form.reset()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Kidney Panel" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe the panel..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormItem>
            <FormLabel>Species</FormLabel>
            <Controller
              control={form.control}
              name="species"
              render={({ field }) => (
                <OntologyCombobox
                  ontologyType="ncbi_taxonomy"
                  value={field.value ?? null}
                  onChange={field.onChange}
                  placeholder="Search species..."
                />
              )}
            />
          </FormItem>
          <FormField
            control={form.control}
            name="fixation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fixation</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select fixation" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(Object.keys(FIXATION_LABELS) as Array<keyof typeof FIXATION_LABELS>).map((key) => (
                      <SelectItem key={key} value={key}>
                        {FIXATION_LABELS[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormItem>
          <FormLabel>Condition</FormLabel>
          <Controller
            control={form.control}
            name="condition"
            render={({ field }) => (
              <OntologyCombobox
                ontologyType="doid"
                value={field.value ?? null}
                onChange={field.onChange}
                placeholder="Search disease conditions..."
              />
            )}
          />
        </FormItem>
        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Panel"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
