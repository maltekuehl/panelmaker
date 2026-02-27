"use client"

import { defineStepper } from "@/components/stepper"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { zodResolver } from "@hookform/resolvers/zod"
import { CloudUpload, Loader2, Save } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import * as z from "zod"

const submissionSchema = z.object({
  // Target Info
  markerName: z.string().min(1, "Marker name is required"),
  species: z.string().min(1, "Species is required"),
  tissue: z.string().min(1, "Tissue is required"),
  cellType: z.string().min(1, "Cell type is required"),

  // Antibody Info
  antibodyVendor: z.string().min(1, "Vendor is required"),
  catalogNumber: z.string().min(1, "Catalog number is required"),
  cloneId: z.string().optional(),
  rrid: z.string().optional(),
  hostSpecies: z.string().min(1, "Host species is required"),

  // Protocol
  method: z.string().min(1, "Method is required"),
  dilution: z.string().min(1, "Dilution is required"),
  antigenRetrieval: z.string().min(1, "Antigen retrieval is required"),
  incubation: z.string().optional(),
  detectionSystem: z.string().optional(),

  // Results
  subcellularLocation: z.string().min(1, "Location is required"),
  condition: z.string().optional(),
  notes: z.string().optional(),
})

type SubmissionValues = z.infer<typeof submissionSchema>

const { Stepper } = defineStepper(
  { id: "target", title: "Target Info", description: "Biological target details" },
  { id: "antibody", title: "Antibody Info", description: "Vendor and catalog info" },
  { id: "protocol", title: "Protocol", description: "Experimental conditions" },
  { id: "results", title: "Results", description: "Validation and images" },
)

export function SubmissionForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<SubmissionValues>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      species: "Homo sapiens",
      method: "IF",
      hostSpecies: "Rabbit",
      antigenRetrieval: "Citrate pH 6.0",
    },
  })

  async function onSubmit(data: SubmissionValues) {
    setIsSubmitting(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000))
    console.log(data)
    toast.success("Submission received! Your protocol is pending review.")
    setIsSubmitting(false)
    form.reset()
  }

  return (
    <Stepper.Provider className="space-y-6">
      {({ methods }) => (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Stepper.Navigation>
              {methods.all.map((step, index) => {
                const currentIndex = methods.all.findIndex((s) => s.id === methods.current.id)
                return (
                  <Stepper.Step
                    key={step.id}
                    of={step.id}
                    onClick={() => {
                      // Allow clicking back to previous steps, but validate before going forward
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
              target: () => (
                <Card>
                  <CardHeader>
                    <CardTitle>Target Information</CardTitle>
                    <CardDescription>Details about the biological target and sample context.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="markerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Marker Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. CD3e, Ki-67, PanCK" {...field} />
                          </FormControl>
                          <FormDescription>Official gene symbol or common protein name.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="species"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target Species</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select species" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Homo sapiens">Homo sapiens</SelectItem>
                                <SelectItem value="Mus musculus">Mus musculus</SelectItem>
                                <SelectItem value="Rattus norvegicus">Rattus norvegicus</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="tissue"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tissue Type</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Tonsil, Liver, Kidney" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="cellType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Cell Type</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. T cells, Podocytes" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              ),
              antibody: () => (
                <Card>
                  <CardHeader>
                    <CardTitle>Antibody Details</CardTitle>
                    <CardDescription>Specifics of the primary antibody used.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
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
                        name="hostSpecies"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Host Species</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select host" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Rabbit">Rabbit</SelectItem>
                                <SelectItem value="Mouse">Mouse</SelectItem>
                                <SelectItem value="Rat">Rat</SelectItem>
                                <SelectItem value="Goat">Goat</SelectItem>
                                <SelectItem value="Sheep">Sheep</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="rrid"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>RRID (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. AB_302411" {...field} />
                          </FormControl>
                          <FormDescription>Research Resource Identifier from Antibody Registry.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              ),
              protocol: () => (
                <Card>
                  <CardHeader>
                    <CardTitle>Protocol Parameters</CardTitle>
                    <CardDescription>Key experimental conditions for reproducibility.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="method"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Method</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="IF">Standard IF</SelectItem>
                              <SelectItem value="CODEX">CODEX / PhenoCycler</SelectItem>
                              <SelectItem value="MIBI-Tof">MIBI-Tof</SelectItem>
                              <SelectItem value="IMC">Imaging Mass Cytometry (IMC)</SelectItem>
                              <SelectItem value="PathoPlex">PathoPlex</SelectItem>
                              <SelectItem value="IHC">IHC (Chromogenic)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="dilution"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dilution</FormLabel>
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
                            <FormLabel>Antigen Retrieval</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
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

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Notes</FormLabel>
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
                  </CardContent>
                </Card>
              ),
              results: () => (
                <Card>
                  <CardHeader>
                    <CardTitle>Validation & Images</CardTitle>
                    <CardDescription>Evidence of specificity and successful staining.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="subcellularLocation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observed Subcellular Location</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select location" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Membrane">Membrane</SelectItem>
                              <SelectItem value="Cytoplasm">Cytoplasm</SelectItem>
                              <SelectItem value="Nucleus">Nucleus</SelectItem>
                              <SelectItem value="Extracellular">Extracellular</SelectItem>
                              <SelectItem value="Mitochondria">Mitochondria</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="condition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Condition (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Normal, HCC, Diabetic Nephropathy" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <FormLabel>Upload Images</FormLabel>
                      <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className="flex flex-col items-center gap-2">
                          <CloudUpload className="h-8 w-8 text-muted-foreground" />
                          <div className="text-sm font-medium">Drag & drop images here, or click to select</div>
                          <div className="text-xs text-muted-foreground">Supports JPG, PNG, TIFF (max 10MB)</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ),
            })}

            <Stepper.Controls>
              <Button type="button" variant="outline" onClick={methods.prev} disabled={methods.isFirst}>
                Previous
              </Button>

              {methods.isLast ? (
                <Button type="submit" disabled={isSubmitting} className="min-w-[150px]">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
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
                    // Validate current step fields before moving next
                    const currentStepId = methods.current.id
                    let fieldsToValidate: (keyof SubmissionValues)[] = []

                    if (currentStepId === "target") {
                      fieldsToValidate = ["markerName", "species", "tissue", "cellType"]
                    } else if (currentStepId === "antibody") {
                      fieldsToValidate = ["antibodyVendor", "catalogNumber", "hostSpecies"]
                    } else if (currentStepId === "protocol") {
                      fieldsToValidate = ["method", "dilution", "antigenRetrieval"]
                    }

                    const isValid = await form.trigger(fieldsToValidate)
                    if (isValid) {
                      methods.next()
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
