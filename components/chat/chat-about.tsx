"use client"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Info } from "lucide-react"
import Link from "next/link"

export default function ChatAbout() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>PanelMaker AI</CardTitle>
        <CardDescription>Spatial proteomics panel design assistant</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertTitle className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            What it can do
          </AlertTitle>
          <AlertDescription className="lg:text-justify">
            Ask about markers, antibodies, and validated reports, or get help building and reviewing multiplex panels.
            The assistant searches the PanelMaker catalog directly, so answers are grounded in records you can open and
            verify. Use the built-in model for free, or add your own provider API key in{" "}
            <Link href="/settings" className="text-primary hover:underline">
              settings
            </Link>
            . You are responsible for the cost and usage of your own keys.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
            <li>
              Try things like searching for a marker (e.g. CD8, FOXP3, Ki-67), pulling antibody or validation report
              details, suggesting markers for a panel, or checking fluorophore and host-species compatibility.
            </li>
            <li>For research purposes only, not medical advice. It can make mistakes, so always verify suggestions.</li>
            <li>Do not submit any personal or patient data.</li>
            <li>
              Conversations are saved to your private PanelMaker account so you can return to them later. They are
              visible only to you. Provider API requests are also subject to the LLM provider&apos;s own policies.
            </li>
            <li>
              PanelMaker, including PanelMaker AI, is provided &quot;as is&quot; without warranties, express or implied
              (see{" "}
              <Link href="/legal/terms" className="text-primary hover:underline">
                Terms of Service
              </Link>
              ).
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
