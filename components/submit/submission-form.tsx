"use client"

import { AntibodyRegistryCombobox, type AntibodyRegistryValue } from "@/components/antibody-registry-combobox"
import { OntologyCombobox } from "@/components/ontology-combobox"
import { OntologyMultiCombobox } from "@/components/ontology-multi-combobox"
import { defineStepper } from "@/components/stepper"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { zodResolver } from "@hookform/resolvers/zod"
import { MultiplexMethod } from "@prisma/client"
import { Check, ChevronsUpDown, CloudUpload, Loader2, Save } from "lucide-react"
import { useSession } from "next-auth/react"
import { useEffect, useRef, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import * as z from "zod"

const ontologyValueSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
})

const proteinValueSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  geneSymbol: z.string().nullable().optional(),
})

const submissionSchema = z.object({
  // Step 1: Experiment Context
  species: ontologyValueSchema.refine((v) => !!v?.id, { message: "Species is required" }),
  tissue: ontologyValueSchema.refine((v) => !!v?.id, { message: "Tissue is required" }),
  fixation: z.string().min(1, "Fixation is required"),
  method: z.nativeEnum(MultiplexMethod, { message: "Method is required" }),
  condition: ontologyValueSchema.nullable().optional(),

  // Step 2: Target Selection
  markerProtein: proteinValueSchema.nullable().optional(),
  markerName: z.string().min(1, "Marker name is required"),
  cellTypes: z.array(ontologyValueSchema).min(1, "At least one cell type is required"),

  // Step 3: Antibody
  antibodyRegistry: z
    .object({
      name: z.string(),
      citation: z.string(),
      vendor: z.string(),
      catalogNumber: z.string(),
      clonality: z.string(),
      cloneId: z.string(),
      target: z.string(),
      sourceOrganism: z.string(),
      conjugate: z.string(),
      isotype: z.string(),
      uniprotId: z.string(),
      targetSpecies: z.array(z.string()),
      applications: z.array(z.string()),
      url: z.string(),
    })
    .nullable()
    .optional(),
  antibodyVendor: z.string().optional(),
  catalogNumber: z.string().optional(),
  cloneId: z.string().optional(),
  rrid: z.string().optional(),
  hostSpecies: ontologyValueSchema.nullable().optional(),

  // Step 4: Protocol Details
  dilution: z.string().min(1, "Dilution is required"),
  antigenRetrieval: z.string().min(1, "Antigen retrieval is required"),
  fluorophore: z.string().optional(),
  metalTag: z.string().optional(),
  cycleNumber: z.string().optional(),
  incubation: z.string().optional(),

  // Step 5: Results
  works: z.string().optional(),
  signalQuality: z.string().optional(),
  specificity: z.string().optional(),
  subcellularLocation: ontologyValueSchema.nullable().optional(),
  locationNotDiscernible: z.boolean().optional(),
  notes: z.string().optional(),
})

type SubmissionValues = z.infer<typeof submissionSchema>

const FLUOROPHORE_METHODS = new Set<MultiplexMethod>([
  MultiplexMethod.PATHOPLEX,
  MultiplexMethod.CODEX,
  MultiplexMethod.CYCIF,
  MultiplexMethod.IBEX,
])
const METAL_TAG_METHODS = new Set<MultiplexMethod>([MultiplexMethod.IMC, MultiplexMethod.MIBI])
const CYCLE_NUMBER_METHODS = new Set<MultiplexMethod>([
  MultiplexMethod.PATHOPLEX,
  MultiplexMethod.CODEX,
  MultiplexMethod.CYCIF,
  MultiplexMethod.IBEX,
])

const { Stepper } = defineStepper(
  { id: "context", title: "Experiment Context", description: "Species, tissue, disease condition, fixation, method" },
  { id: "antibody", title: "Antibody & Target", description: "Antibody, protein target, cell types" },
  { id: "protocol", title: "Protocol Details", description: "Dilution, AR, detection" },
  { id: "results", title: "Results & Evidence", description: "Signal, specificity, images" },
)

const SPECIES_LABEL_TO_ENUM: Record<string, string> = {
  "Homo sapiens": "HUMAN",
  "Mus musculus": "MOUSE",
  "Rattus norvegicus": "RAT",
  "Sus scrofa": "PIG",
  "Oryctolagus cuniculus": "RABBIT",
  "Danio rerio": "ZEBRAFISH",
}

function mapSpeciesToEnum(label: string): string {
  return SPECIES_LABEL_TO_ENUM[label] ?? (label.toLowerCase().includes("primate") ? "NON_HUMAN_PRIMATE" : "OTHER")
}

function extractOrganismId(speciesId: string): number | undefined {
  const match = speciesId.match(/txid(\d+)/)
  if (match?.[1]) return parseInt(match[1], 10)
  const numericMatch = speciesId.match(/(\d+)$/)
  if (numericMatch?.[1]) return parseInt(numericMatch[1], 10)
  return undefined
}

function buildNotes(data: SubmissionValues): string {
  const parts: string[] = []
  const ab = data.antibodyRegistry

  parts.push(`Marker: ${data.markerName}`)
  if (data.markerProtein) parts.push(`Protein: ${data.markerProtein.label} [${data.markerProtein.id}]`)
  parts.push(`Cell types: ${data.cellTypes.map((ct) => `${ct.label} [${ct.id}]`).join(", ")}`)
  parts.push(`Species: ${data.species.label} [${data.species.id}]`)
  parts.push(`Tissue: ${data.tissue.label} [${data.tissue.id}]`)

  const vendor = ab?.vendor || data.antibodyVendor
  const catalog = ab?.catalogNumber || data.catalogNumber
  const cloneId = ab?.cloneId || data.cloneId
  const rrid = ab?.citation || data.rrid

  if (vendor) parts.push(`Vendor: ${vendor}`)
  if (catalog) parts.push(`Catalog #: ${catalog}`)
  if (cloneId) parts.push(`Clone ID: ${cloneId}`)
  if (rrid) parts.push(`RRID: ${rrid}`)
  if (ab?.clonality) parts.push(`Clonality: ${ab.clonality}`)
  if (ab?.target) parts.push(`Target: ${ab.target}`)
  if (data.hostSpecies) parts.push(`Host species: ${data.hostSpecies.label} [${data.hostSpecies.id}]`)
  if (data.incubation) parts.push(`Incubation: ${data.incubation}`)
  if (data.locationNotDiscernible) {
    parts.push("Subcellular location: Not discernible")
  } else if (data.subcellularLocation) {
    parts.push(`Subcellular location: ${data.subcellularLocation.label} (${data.subcellularLocation.id})`)
  }
  if (data.condition?.label) parts.push(`Condition: ${data.condition.label} (${data.condition.id})`)
  if (data.notes) parts.push(`Notes: ${data.notes}`)

  return parts.join("\n")
}

type ProteinValue = { id: string; label: string; geneSymbol?: string | null }

function ProteinCombobox({
  value,
  onChange,
  organismId,
  disabled,
}: {
  value?: ProteinValue | null
  onChange: (value: ProteinValue | null) => void
  organismId?: number
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ProteinValue[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 2) {
      setResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const params = new URLSearchParams({ q: query.trim(), limit: "10" })
        if (organismId) params.set("organismId", String(organismId))
        const res = await fetch(`/api/proteins?${params}`)
        if (res.ok) {
          const data = await res.json()
          setResults(
            (data.proteins ?? []).map((p: { id: string; label: string; geneSymbol: string | null }) => ({
              id: p.id,
              label: p.label,
              geneSymbol: p.geneSymbol,
            })),
          )
        } else {
          setResults([])
        }
      } catch {
        setResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, open, organismId])

  return (
    <Popover open={disabled ? false : open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value ? `${value.label}${value.geneSymbol ? ` (${value.geneSymbol})` : ""}` : "Search UniProt proteins..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Type to search (e.g. CD3, Ki67)..." value={query} onValueChange={setQuery} />
          <CommandList>
            {isSearching && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {!isSearching && query.trim().length >= 2 && results.length === 0 && (
              <CommandEmpty>No proteins found.</CommandEmpty>
            )}
            {!isSearching && query.trim().length < 2 && <CommandEmpty>Type at least 2 characters.</CommandEmpty>}
            {results.length > 0 && (
              <CommandGroup heading="Proteins">
                {results.map((protein) => (
                  <CommandItem
                    key={protein.id}
                    value={protein.id}
                    onSelect={() => {
                      onChange(protein)
                      setOpen(false)
                      setQuery("")
                    }}
                  >
                    <Check
                      className={cn("mr-2 h-4 w-4 shrink-0", value?.id === protein.id ? "opacity-100" : "opacity-0")}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{protein.label}</span>
                      {protein.geneSymbol && (
                        <span className="text-xs text-muted-foreground">
                          {protein.geneSymbol} · {protein.id}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function SubmissionForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { data: session } = useSession()

  const form = useForm<SubmissionValues>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      species: undefined,
      tissue: undefined,
      fixation: "FFPE",
      method: undefined as unknown as MultiplexMethod,
      markerName: "",
      cellTypes: [],
      antibodyVendor: "",
      catalogNumber: "",
      cloneId: "",
      rrid: "",
      hostSpecies: null,
      dilution: "",
      antigenRetrieval: "Citrate pH 6.0",
      fluorophore: "",
      metalTag: "",
      cycleNumber: "",
      incubation: "",
      notes: "",
      locationNotDiscernible: false,
    },
  })

  async function onSubmit(data: SubmissionValues) {
    if (!session?.user) {
      toast.error("You must be signed in to submit a report.")
      return
    }

    setIsSubmitting(true)

    try {
      const payload: Record<string, unknown> = {
        species: mapSpeciesToEnum(data.species.label),
        tissueType: data.tissue.label,
        fixation: data.fixation,
        method: data.method,
        dilution: data.dilution,
        antigenRetrieval: data.antigenRetrieval,
        works: data.works === "Yes" ? true : data.works === "No" ? false : undefined,
        signalQuality: data.signalQuality || undefined,
        specificity: data.specificity || undefined,
        fluorophore: data.fluorophore || undefined,
        metalTag: data.metalTag || undefined,
        cycleNumber: data.cycleNumber ? Number(data.cycleNumber) : undefined,
        notes: buildNotes(data),
        isPublic: true,
        antibodyData: data.antibodyRegistry || undefined,
        proteinData: data.markerProtein || undefined,
        cellTypes: data.cellTypes,
        subcellularLocation: data.subcellularLocation || undefined,
        condition: data.condition || undefined,
        markerName: data.markerName,
        rrid: data.rrid || data.antibodyRegistry?.citation || undefined,
        hostSpecies: data.hostSpecies?.label || undefined,
        antibodyVendor: data.antibodyVendor || undefined,
        catalogNumber: data.catalogNumber || undefined,
        cloneId: data.cloneId || undefined,
      }

      Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k])

      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.status === 401) {
        toast.error("You must be signed in to submit a report.")
        return
      }

      if (res.status === 429) {
        toast.error("You have reached the submission limit. Please try again later.")
        return
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const details = body?.details ? `: ${JSON.stringify(body.details)}` : ""
        const message = (body?.error ?? "Failed to submit report. Please try again.") + details
        toast.error(message)
        return
      }

      toast.success("Submission received! Your protocol is pending review.")
      form.reset()
    } catch {
      toast.error("An unexpected error occurred. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Stepper.Provider className="space-y-6">
      {({ methods }) => (
        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
            <Stepper.Navigation>
              {methods.all.map((step, index) => {
                const currentIndex = methods.all.findIndex((s) => s.id === methods.current.id)
                return (
                  <Stepper.Step
                    key={step.id}
                    of={step.id}
                    onClick={() => {
                      if (currentIndex > index) {
                        methods.goTo(step.id)
                      }
                    }}
                  >
                    <Stepper.Title>{step.title}</Stepper.Title>
                    <Stepper.Description>{step.description}</Stepper.Description>
                  </Stepper.Step>
                )
              })}
            </Stepper.Navigation>

            {methods.switch({
              context: () => <ContextStep form={form} />,
              antibody: () => <AntibodyTargetStep form={form} />,
              protocol: () => <ProtocolStep form={form} />,
              results: () => <ResultsStep form={form} />,
            })}

            <Stepper.Controls>
              <Button type="button" variant="outline" onClick={methods.prev} disabled={methods.isFirst}>
                Previous
              </Button>

              {methods.isLast ? (
                <Button
                  type="button"
                  disabled={isSubmitting || !session?.user}
                  className="min-w-[150px]"
                  onClick={() => {
                    form.handleSubmit(onSubmit, (errors) => {
                      const firstError = Object.values(errors)[0]
                      const message =
                        firstError?.message ?? (firstError as { root?: { message?: string } })?.root?.message
                      toast.error(
                        typeof message === "string" ? message : "Please fix the highlighted fields before submitting.",
                      )
                    })()
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : !session?.user ? (
                    "Sign in to submit"
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Submit Report
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={async () => {
                    const currentStepId = methods.current.id
                    let fieldsToValidate: (keyof SubmissionValues)[] = []

                    if (currentStepId === "context") {
                      fieldsToValidate = ["species", "tissue", "fixation", "method"]
                    } else if (currentStepId === "antibody") {
                      fieldsToValidate = ["markerName", "cellTypes"]
                    } else if (currentStepId === "protocol") {
                      fieldsToValidate = ["dilution", "antigenRetrieval"]
                    }

                    const isValid = await form.trigger(fieldsToValidate)
                    if (isValid) {
                      methods.next()
                    } else {
                      const errors = fieldsToValidate.map((f) => form.formState.errors[f]?.message).filter(Boolean)
                      if (errors.length > 0) {
                        toast.error(errors.join(". "))
                      }
                    }
                  }}
                >
                  Next
                </Button>
              )}
            </Stepper.Controls>
          </form>
        </Form>
      )}
    </Stepper.Provider>
  )
}

function ContextStep({ form }: { form: ReturnType<typeof useForm<SubmissionValues>> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Experiment Context</CardTitle>
        <CardDescription>
          Define the biological and experimental context, including species, tissue, disease condition, fixation, and
          imaging method.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormItem>
            <FormLabel>
              Target Species <span className="text-destructive">*</span>
            </FormLabel>
            <Controller
              control={form.control}
              name="species"
              render={({ field, fieldState }) => (
                <>
                  <OntologyCombobox
                    ontologyType="ncbi_taxonomy"
                    value={field.value}
                    onChange={(val) => {
                      const prevSpecies = form.getValues("species")
                      if (prevSpecies?.id && val?.id !== prevSpecies.id) {
                        const protein = form.getValues("markerProtein")
                        if (protein) {
                          form.setValue("markerProtein", null)
                          form.setValue("markerName", "")
                          toast.info("Species changed — protein selection cleared.")
                        }
                      }
                      field.onChange(val)
                    }}
                    placeholder="Search species..."
                  />
                  {fieldState.error && (
                    <p className="text-sm font-medium text-destructive">{fieldState.error.message}</p>
                  )}
                </>
              )}
            />
          </FormItem>

          <FormItem>
            <FormLabel>
              Tissue Type <span className="text-destructive">*</span>
            </FormLabel>
            <Controller
              control={form.control}
              name="tissue"
              render={({ field, fieldState }) => (
                <>
                  <OntologyCombobox
                    ontologyType="uberon"
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Search tissue..."
                  />
                  {fieldState.error && (
                    <p className="text-sm font-medium text-destructive">{fieldState.error.message}</p>
                  )}
                </>
              )}
            />
          </FormItem>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="fixation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Fixation <span className="text-destructive">*</span>
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select fixation" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="FFPE">FFPE</SelectItem>
                    <SelectItem value="FRESH_FROZEN">Fresh Frozen</SelectItem>
                    <SelectItem value="PFA">PFA</SelectItem>
                    <SelectItem value="METHANOL">Methanol</SelectItem>
                    <SelectItem value="ACETONE">Acetone</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="method"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Method <span className="text-destructive">*</span>
                </FormLabel>
                <Select
                  onValueChange={(val) => {
                    const prev = field.value
                    field.onChange(val)
                    const next = val as MultiplexMethod
                    const prevNeedsFluorophore = FLUOROPHORE_METHODS.has(prev)
                    const prevNeedsMetal = METAL_TAG_METHODS.has(prev)
                    const prevNeedsCycle = CYCLE_NUMBER_METHODS.has(prev)
                    const nextNeedsFluorophore = FLUOROPHORE_METHODS.has(next)
                    const nextNeedsMetal = METAL_TAG_METHODS.has(next)
                    const nextNeedsCycle = CYCLE_NUMBER_METHODS.has(next)

                    if (prevNeedsFluorophore && !nextNeedsFluorophore) form.setValue("fluorophore", "")
                    if (prevNeedsMetal && !nextNeedsMetal) form.setValue("metalTag", "")
                    if (prevNeedsCycle && !nextNeedsCycle) form.setValue("cycleNumber", "")
                  }}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={MultiplexMethod.PATHOPLEX}>PathoPlex</SelectItem>
                    <SelectItem value={MultiplexMethod.CODEX}>CODEX / PhenoCycler</SelectItem>
                    <SelectItem value={MultiplexMethod.CYCIF}>CyCIF</SelectItem>
                    <SelectItem value={MultiplexMethod.IMC}>Imaging Mass Cytometry (IMC)</SelectItem>
                    <SelectItem value={MultiplexMethod.MIBI}>MIBI-ToF</SelectItem>
                    <SelectItem value={MultiplexMethod.IBEX}>IBEX</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormItem>
          <FormLabel>Condition (Optional)</FormLabel>
          <Controller
            control={form.control}
            name="condition"
            render={({ field }) => (
              <OntologyCombobox
                ontologyType="doid"
                value={field.value ?? null}
                onChange={field.onChange}
                placeholder="Search disease ontology (e.g. carcinoma, nephropathy)..."
              />
            )}
          />
          <FormDescription>Search the Disease Ontology for the condition being studied.</FormDescription>
        </FormItem>
      </CardContent>
    </Card>
  )
}

function AntibodyTargetStep({ form }: { form: ReturnType<typeof useForm<SubmissionValues>> }) {
  const registryValue = form.watch("antibodyRegistry")
  const species = form.watch("species")
  const organismId = species?.id ? extractOrganismId(species.id) : undefined

  async function handleRegistryChange(value: AntibodyRegistryValue | null) {
    form.setValue("antibodyRegistry", value)
    if (value) {
      if (value.vendor) form.setValue("antibodyVendor", value.vendor)
      if (value.catalogNumber) form.setValue("catalogNumber", value.catalogNumber)
      if (value.cloneId) form.setValue("cloneId", value.cloneId)
      if (value.citation) form.setValue("rrid", value.citation)
      if (value.target) {
        form.setValue("markerName", value.target)
      }
      if (value.uniprotId) {
        form.setValue("markerProtein", {
          id: value.uniprotId,
          label: value.target || value.name,
          geneSymbol: value.target || null,
        })
      }
      if (value.sourceOrganism) {
        try {
          const res = await fetch(
            `/api/ontology?type=ncbi_taxonomy&q=${encodeURIComponent(value.sourceOrganism)}&limit=1`,
          )
          if (res.ok) {
            const data = await res.json()
            const match = data.results?.[0]
            if (match) {
              form.setValue("hostSpecies", { id: match.id, label: match.label })
            }
          }
        } catch {
          // Silently fail — user can still select manually
        }
      }
    } else {
      form.setValue("antibodyVendor", "")
      form.setValue("catalogNumber", "")
      form.setValue("cloneId", "")
      form.setValue("rrid", "")
      form.setValue("hostSpecies", null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Antibody &amp; Target</CardTitle>
        <CardDescription>
          Search the Antibody Registry to auto-fill antibody details and protein target, then select cell types.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormItem>
          <FormLabel>Search Antibody Registry</FormLabel>
          <AntibodyRegistryCombobox value={registryValue} onChange={handleRegistryChange} />
          <FormDescription>
            Search by antibody name, RRID, clone ID, or target protein. Auto-fills target and antibody details.
          </FormDescription>
        </FormItem>

        <div className="space-y-4 pt-2 border-t">
          <FormItem>
            <FormLabel>Target Protein</FormLabel>
            <Controller
              control={form.control}
              name="markerProtein"
              render={({ field }) => (
                <ProteinCombobox
                  value={field.value}
                  onChange={(protein) => {
                    field.onChange(protein)
                    if (protein) {
                      form.setValue("markerName", protein.geneSymbol ?? protein.label)
                    }
                  }}
                  organismId={organismId}
                />
              )}
            />
            <FormDescription>
              {registryValue?.uniprotId
                ? "Auto-filled from antibody. Override if needed."
                : `Search by gene symbol, protein name, or UniProt ID.${species?.label ? ` Filtered to ${species.label}.` : ""}`}
            </FormDescription>
          </FormItem>

          <FormField
            control={form.control}
            name="markerName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Marker Name <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="e.g. CD3e, Ki-67, PanCK" {...field} />
                </FormControl>
                <FormDescription>
                  {registryValue?.target
                    ? "Auto-filled from antibody target. Override if needed."
                    : "Enter the marker/protein name for this report."}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4 pt-2 border-t">
          <FormItem>
            <FormLabel>
              Target Cell Type(s) <span className="text-destructive">*</span>
            </FormLabel>
            <Controller
              control={form.control}
              name="cellTypes"
              render={({ field, fieldState }) => (
                <>
                  <OntologyMultiCombobox
                    ontologyType="cl"
                    values={field.value ?? []}
                    onChange={field.onChange}
                    placeholder="Search cell types..."
                  />
                  <FormDescription>Select all cell types where staining is observed in this tissue.</FormDescription>
                  {fieldState.error && (
                    <p className="text-sm font-medium text-destructive">
                      {fieldState.error.message ?? "At least one cell type is required"}
                    </p>
                  )}
                </>
              )}
            />
          </FormItem>
        </div>

        <div className="space-y-4 pt-2 border-t">
          <FormItem>
            <FormLabel>Host Species</FormLabel>
            <Controller
              control={form.control}
              name="hostSpecies"
              render={({ field }) => (
                <OntologyCombobox
                  ontologyType="ncbi_taxonomy"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Search host species..."
                />
              )}
            />
            <FormDescription>
              {registryValue?.sourceOrganism
                ? "Auto-filled from antibody. Override if needed."
                : "Species in which the antibody was raised."}
            </FormDescription>
          </FormItem>
        </div>

        {!registryValue && (
          <div className="space-y-4 pt-2 border-t">
            <p className="text-sm text-muted-foreground">Can&apos;t find your antibody? Enter details manually:</p>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="antibodyVendor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Abcam, CST" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="catalogNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catalog #</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. ab16667" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cloneId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Clone ID</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. SP7" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rrid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RRID</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. AB_302411" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ProtocolStep({ form }: { form: ReturnType<typeof useForm<SubmissionValues>> }) {
  const method = form.watch("method")
  const showFluorophore = FLUOROPHORE_METHODS.has(method)
  const showMetalTag = METAL_TAG_METHODS.has(method)
  const showCycleNumber = CYCLE_NUMBER_METHODS.has(method)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Protocol Details</CardTitle>
        <CardDescription>Key experimental conditions for reproducibility.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="dilution"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Dilution <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="e.g. 1:100, 5 µg/mL" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="antigenRetrieval"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Antigen Retrieval <span className="text-destructive">*</span>
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select AR" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Citrate pH 6.0">Citrate pH 6.0</SelectItem>
                    <SelectItem value="Tris-EDTA pH 9.0">Tris-EDTA pH 9.0</SelectItem>
                    <SelectItem value="Enzymatic">Enzymatic (Pepsin/Trypsin)</SelectItem>
                    <SelectItem value="None">None</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {showFluorophore && (
          <FormField
            control={form.control}
            name="fluorophore"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fluorophore / Detection Label</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. AF647, FITC, Opal 570" {...field} />
                </FormControl>
                <FormDescription>Fluorescent dye or detection label used for this channel.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {showMetalTag && (
          <FormField
            control={form.control}
            name="metalTag"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Metal Tag</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. 141Pr, 176Yb" {...field} />
                </FormControl>
                <FormDescription>Metal isotope tag used for mass cytometry detection.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {showCycleNumber && (
          <FormField
            control={form.control}
            name="cycleNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cycle Number</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. 3" type="number" min={1} {...field} />
                </FormControl>
                <FormDescription>Imaging cycle in which this marker was acquired.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="incubation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Incubation Conditions</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Overnight at 4°C" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
}

function ResultsStep({ form }: { form: ReturnType<typeof useForm<SubmissionValues>> }) {
  const notDiscernible = form.watch("locationNotDiscernible")
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Results &amp; Evidence</CardTitle>
        <CardDescription>Staining outcome, signal quality, specificity, and supporting images.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="works"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Antibody Works</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select result" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="signalQuality"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Signal Quality</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select quality" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="EXCELLENT">Excellent</SelectItem>
                    <SelectItem value="GOOD">Good</SelectItem>
                    <SelectItem value="MODERATE">Moderate</SelectItem>
                    <SelectItem value="POOR">Poor</SelectItem>
                    <SelectItem value="NONE">None</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="specificity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Specificity</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select specificity" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="MODERATE">Moderate</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="NON_SPECIFIC">Non-specific</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-3">
          <FormLabel>Observed Subcellular Location (Optional)</FormLabel>
          <Controller
            control={form.control}
            name="locationNotDiscernible"
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="location-not-discernible"
                  checked={field.value ?? false}
                  onCheckedChange={(checked) => {
                    field.onChange(checked)
                    if (checked) {
                      form.setValue("subcellularLocation", null)
                    }
                  }}
                />
                <label htmlFor="location-not-discernible" className="text-sm text-muted-foreground cursor-pointer">
                  Not discernible (insufficient resolution)
                </label>
              </div>
            )}
          />
          {!notDiscernible && (
            <Controller
              control={form.control}
              name="subcellularLocation"
              render={({ field }) => (
                <OntologyCombobox
                  ontologyType="go_cc"
                  value={field.value ?? undefined}
                  onChange={field.onChange}
                  placeholder="Search GO cellular component..."
                />
              )}
            />
          )}
          <FormDescription>
            Search Gene Ontology cellular components (e.g. plasma membrane, nucleus, cytoplasm).
          </FormDescription>
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Fixation details, blocking buffer, troubleshooting tips..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <FormLabel>Upload Images</FormLabel>
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              if (e.dataTransfer.files.length > 0) {
                const dt = new DataTransfer()
                const existing = fileInputRef.current?.files
                if (existing) {
                  for (const f of existing) dt.items.add(f)
                }
                for (const f of e.dataTransfer.files) dt.items.add(f)
                if (fileInputRef.current) fileInputRef.current.files = dt.files
              }
            }}
          >
            <div className="flex flex-col items-center gap-2">
              <CloudUpload className="h-8 w-8 text-muted-foreground" />
              <div className="text-sm font-medium">Drag &amp; drop images here, or click to select</div>
              <div className="text-xs text-muted-foreground">Supports JPG, PNG, TIFF (max 10MB)</div>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/tiff"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                toast.success(`${e.target.files.length} image(s) selected`)
              }
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}
