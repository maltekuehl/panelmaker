import { LegalPageSkeleton } from "@/components/legal/legal-page-skeleton"
import Markdown from "@/components/markdown"
import { buildTermsMarkdown, getInstanceConfig, loadLegalOverride } from "@/lib/instance"
import { cacheLife, cacheTag } from "next/cache"
import { Suspense } from "react"

async function TermsContent() {
  "use cache"
  cacheLife("hours")
  cacheTag("legal-terms")

  const override = await loadLegalOverride("terms")
  const content = override ?? buildTermsMarkdown(getInstanceConfig())

  return <Markdown>{content}</Markdown>
}

export default function LegalTermsPage() {
  return (
    <Suspense fallback={<LegalPageSkeleton />}>
      <TermsContent />
    </Suspense>
  )
}
