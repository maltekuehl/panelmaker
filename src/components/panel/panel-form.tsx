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
import { PRESERVATION_LABELS } from "./types"

const ontologyValueSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
})

const panelFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  species: ontologyValueSchema.nullable().optional(),
  preservation: z.string().optional(),
  fixative: ontologyValueSchema.nullable().optional(),
  imagingMethod: ontologyValueSchema.nullable().optional(),
  condition: ontologyValueSchema.nullable().optional(),
})

type PanelFormValues = z.infer<typeof panelFormSchema>

export interface CreatePanelFormData {
  name: string
  description?: string
  speciesId?: string
  speciesLabel?: string
  preservation?: string
  fixativeId?: string
  fixativeLabel?: string
  imagingMethodId?: string
  imagingMethodLabel?: string
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
      preservation: undefined,
      fixative: null,
      imagingMethod: null,
      condition: null,
    },
  })

  const handleSubmit = (data: PanelFormValues) => {
    onSubmit({
      name: data.name,
      description: data.description,
      speciesId: data.species?.id,
      speciesLabel: data.species?.label,
      preservation: data.preservation,
      fixativeId: data.fixative?.id,
      fixativeLabel: data.fixative?.label,
      imagingMethodId: data.imagingMethod?.id,
      imagingMethodLabel: data.imagingMethod?.label,
      conditionId: data.condition?.id,
      conditionLabel: data.condition?.label,
    })
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
                <Textarea placeholder="Describe the panel…" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormItem>
          <FormLabel>Species</FormLabel>
          <Controller
            control={form.control}
            name="species"
            render={({ field }) => (
              <FormControl>
                <OntologyCombobox
                  ontologyType="ncbi_taxonomy"
                  value={field.value ?? null}
                  onChange={field.onChange}
                  placeholder="Search species…"
                />
              </FormControl>
            )}
          />
        </FormItem>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="preservation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preservation</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select preservation" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(Object.keys(PRESERVATION_LABELS) as Array<keyof typeof PRESERVATION_LABELS>).map((key) => (
                      <SelectItem key={key} value={key}>
                        {PRESERVATION_LABELS[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormItem>
            <FormLabel>Fixative</FormLabel>
            <Controller
              control={form.control}
              name="fixative"
              render={({ field }) => (
                <FormControl>
                  <OntologyCombobox
                    ontologyType="chebi"
                    value={field.value ?? null}
                    onChange={field.onChange}
                    placeholder="Search ChEBI…"
                  />
                </FormControl>
              )}
            />
          </FormItem>
        </div>
        <FormItem>
          <FormLabel>Imaging method</FormLabel>
          <Controller
            control={form.control}
            name="imagingMethod"
            render={({ field }) => (
              <FormControl>
                <OntologyCombobox
                  ontologyType="imaging_method"
                  value={field.value ?? null}
                  onChange={field.onChange}
                  placeholder="Search EFO imaging methods…"
                />
              </FormControl>
            )}
          />
        </FormItem>
        <FormItem>
          <FormLabel>Condition</FormLabel>
          <Controller
            control={form.control}
            name="condition"
            render={({ field }) => (
              <FormControl>
                <OntologyCombobox
                  ontologyType="doid"
                  value={field.value ?? null}
                  onChange={field.onChange}
                  placeholder="Search disease conditions…"
                />
              </FormControl>
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
            {isSubmitting ? "Creating…" : "Create Panel"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
